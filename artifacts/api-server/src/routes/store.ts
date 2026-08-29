import { Router, type Request, type Response } from "express";
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import {
  db, productsTable, categoriesTable, ordersTable, productVariantsTable,
  mediaItemsTable, blogPostsTable, couponsTable, usersTable, teamMembersTable,
  paymentTransactionsTable, orderItemsTable, appSettingsTable, providerPluginsTable,
  type AddressSnapshot, type OrderItem,
} from "@workspace/db";
import { and, eq, desc, sql, like, gte, gt, isNull, lt, or } from "drizzle-orm";
import { eprolo } from "../services/eprolo";
import { getEproloConfig } from "./eprolo";
import { getSessionUser, requireAdmin } from "../middleware/requireAdmin";
import { validate } from "../middleware/validate";
import { z } from "zod";
import { eventBus } from "../lib/eventBus";
import { decryptCredential } from "../services/credentialVault";

const router = Router();
const CART_COOKIE = "luxe_cart";

async function checkoutSessionId(req: Request, res: Response) {
  const user = await getSessionUser(req);
  if (user) return `user:${user.id}`;
  const existing = req.cookies?.[CART_COOKIE] as string | undefined;
  if (existing && /^[A-Za-z0-9_-]{40,}$/.test(existing)) return `anon:${existing}`;
  const token = randomBytes(32).toString("base64url");
  res.cookie(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 180 * 24 * 60 * 60 * 1000,
  });
  return `anon:${token}`;
}

// ── Products ──────────────────────────────────────────────────────────────────

async function enrichProduct(p: typeof productsTable.$inferSelect) {
  const cat = p.categoryId
    ? (await db.select().from(categoriesTable).where(eq(categoriesTable.id, p.categoryId)).limit(1))[0]
    : null;
  const variants = await db.select().from(productVariantsTable)
    .where(eq(productVariantsTable.productId, p.id));
  return {
    ...p,
    category: cat ? { id: cat.id, name: cat.name } : null,
    variants,
  };
}

const productSchema = z.object({
  name:          z.string().min(1),
  price:         z.number().int().min(0).optional().default(0),
  categoryId:    z.string().optional().nullable(),
  stock:         z.number().int().min(0).optional().default(0),
  trackQuantity: z.boolean().optional().default(true),
  status:        z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional().default("ACTIVE"),
  imageUrl:      z.string().optional().nullable(),
  description:   z.string().optional().default(""),
  tags:          z.string().optional().nullable(),
  eproloProductId: z.string().trim().max(200).optional().nullable(),
});

const variantSchema = z.object({
  size: z.string().trim().max(100).optional(),
  color: z.string().trim().max(100).optional(),
  stock: z.number().int().min(0).optional(),
  price: z.number().int().min(0).nullable().optional(),
  sku: z.string().trim().max(100).optional(),
  eproloProductId: z.string().trim().max(200).nullable().optional(),
  eproloVariantId: z.string().trim().max(200).nullable().optional(),
});

router.get("/products", async (_req, res) => {
  const user = await getSessionUser(_req);
  const canManage = user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN");
  const prods = await db.select().from(productsTable)
    .where(canManage ? undefined : eq(productsTable.status, "ACTIVE"))
    .orderBy(desc(productsTable.createdAt));
  const enriched = await Promise.all(prods.map(enrichProduct));
  res.json(enriched);
});

router.post("/products", requireAdmin, validate(productSchema), async (req, res) => {
  const body = req.body as z.infer<typeof productSchema>;
  const [p] = await db.insert(productsTable).values({ id: randomUUID(), ...body }).returning();
  return res.status(201).json(await enrichProduct(p));
});

router.get("/products/:id", async (req, res) => {
  const productId = req.params.id as string;
  const user = await getSessionUser(req);
  const canManage = user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN");
  const rows = await db.select().from(productsTable).where(and(
    eq(productsTable.id, productId),
    ...(canManage ? [] : [eq(productsTable.status, "ACTIVE")]),
  )).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  return res.json(await enrichProduct(rows[0]));
});

router.put("/products/:id", requireAdmin, async (req, res) => {
  const productId = req.params.id as string;
  const allowed = ["name", "price", "categoryId", "stock", "trackQuantity", "status", "imageUrl", "description", "tags"];
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid product fields.", details: parsed.error.flatten() });
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  const rows = await db.update(productsTable).set(updates).where(eq(productsTable.id, productId)).returning();
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  return res.json(await enrichProduct(rows[0]));
});

router.delete("/products/:id", requireAdmin, async (req, res) => {
  const productId = req.params.id as string;
  await db.delete(productsTable).where(eq(productsTable.id, productId));
  return res.json({ ok: true });
});

// ── Manual sync (stamp updatedAt to mark as manually synced) ──────────────────
router.post("/products/:id/sync", requireAdmin, async (req, res) => {
  const productId = req.params.id as string;
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  const updates = req.body as Partial<typeof productsTable.$inferInsert>;
  const allowed = ["name", "price", "stock", "status", "imageUrl", "description", "tags"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in updates) patch[k] = (updates as Record<string, unknown>)[k];
  const [updated] = await db.update(productsTable).set(patch).where(eq(productsTable.id, productId)).returning();
  return res.json({ ok: true, product: updated, syncedAt: new Date().toISOString() });
});

// ── Product Variants ──────────────────────────────────────────────────────────

router.get("/products/:id/variants", async (req, res) => {
  const productId = req.params.id as string;
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  return res.json(await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, productId)));
});

router.post("/products/:id/variants", requireAdmin, async (req, res) => {
  const productId = req.params.id as string;
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  const parsed = variantSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid variant fields.", details: parsed.error.flatten() });
  const [variant] = await db.insert(productVariantsTable).values({
    id: randomUUID(),
    productId,
    size: parsed.data.size ?? "",
    color: parsed.data.color ?? "",
    stock: parsed.data.stock ?? 0,
    price: parsed.data.price ?? null,
    sku: parsed.data.sku ?? "",
    eproloProductId: parsed.data.eproloProductId ?? null,
    eproloVariantId: parsed.data.eproloVariantId ?? null,
  }).returning();
  return res.status(201).json(variant);
});

router.put("/products/:id/variants/:variantId", requireAdmin, async (req, res) => {
  const productId = req.params.id as string;
  const variantId = req.params.variantId as string;
  const parsed = variantSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid variant fields.", details: parsed.error.flatten() });
  const updates: Record<string, unknown> = parsed.data;
  const [updated] = await db.update(productVariantsTable)
    .set(updates)
    .where(and(eq(productVariantsTable.id, variantId), eq(productVariantsTable.productId, productId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Variant not found" });
  return res.json(updated);
});

router.delete("/products/:id/variants/:variantId", requireAdmin, async (req, res) => {
  await db.delete(productVariantsTable).where(and(
    eq(productVariantsTable.id, req.params.variantId as string),
    eq(productVariantsTable.productId, req.params.id as string),
  ));
  return res.json({ ok: true });
});

// ── Orders ────────────────────────────────────────────────────────────────────

type OrderItem = { name: string; qty: number; price: number };

router.get("/orders", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  return res.json(rows);
});

router.get("/orders/:id", requireAdmin, async (req, res) => {
  const orderId = req.params.id as string;
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Order not found" });
  return res.json(rows[0]);
});

// ── Payments and checkout lifecycle ──────────────────────────────────────────
type CheckoutAddress = AddressSnapshot;
type PendingCheckout = {
  customerName: string;
  customerEmail: string;
  items: Array<{ productId: string; quantity: number; price: number; name: string }>;
  couponCode?: string;
  shippingAddress: CheckoutAddress;
  billingAddress?: CheckoutAddress;
};

const checkoutAddressSchema = z.record(z.string().trim().min(1).max(200));
const checkoutItemSchema = z.object({
  productId: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(100),
});
const checkoutSchema = z.object({
  customerName: z.string().trim().min(1).max(120).default("Guest"),
  customerEmail: z.string().trim().toLowerCase().email(),
  items: z.array(checkoutItemSchema).min(1).max(100).optional(),
  couponCode: z.string().trim().max(64).optional(),
  shippingAddress: z.union([z.string().trim().min(10).max(1000), checkoutAddressSchema]),
  billingAddress: checkoutAddressSchema.optional(),
  paystackRef: z.string().trim().max(200).optional(),
});
const paymentInitializeSchema = z.object({
  customerName: z.string().trim().min(1).max(120).default("Guest"),
  customerEmail: z.string().trim().toLowerCase().email(),
  provider: z.literal("paystack").default("paystack"),
  couponCode: z.string().trim().max(64).optional(),
  shippingAddress: z.union([z.string().trim().min(10).max(1000), checkoutAddressSchema]),
  billingAddress: checkoutAddressSchema.optional(),
  callbackUrl: z.string().url().max(1000),
});

function addressSnapshot(value: string | Record<string, string>): CheckoutAddress {
  return typeof value === "string" ? { address: value.trim() } : Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, item.trim()]).filter(([, item]) => item),
  );
}

async function paymentSetting(key: string) {
  const [row] = await db.select({ value: appSettingsTable.value })
    .from(appSettingsTable).where(eq(appSettingsTable.key, key)).limit(1);
  return row?.value ? decryptCredential(row.value) : null;
}

async function findUsableCouponForCheckout(code: string, subtotal: number) {
  const [coupon] = await db.select().from(couponsTable)
    .where(eq(couponsTable.code, code.trim().toUpperCase())).limit(1);
  if (!coupon || !coupon.active || (coupon.expiresAt && coupon.expiresAt <= new Date())) {
    return { error: "Coupon code not found or expired." } as const;
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { error: "Coupon usage limit reached." } as const;
  }
  if (subtotal < Number(coupon.minOrderAmount)) {
    return { error: `Minimum order amount is ${coupon.minOrderAmount}.` } as const;
  }
  const discount = coupon.discountType === "PERCENTAGE"
    ? Math.min(subtotal, Math.floor((subtotal * Number(coupon.discountValue)) / 100))
    : Math.min(subtotal, Number(coupon.discountValue));
  return { coupon, discount } as const;
}

async function paystackSecret() {
  const configured = await paymentSetting("paystack_secret_key");
  if (configured) return configured;
  const [provider] = await db.select().from(providerPluginsTable)
    .where(eq(providerPluginsTable.name, "paystack")).limit(1);
  return provider?.apiKey ? decryptCredential(provider.apiKey) : null;
}

async function paystackCurrency() {
  const configured = await paymentSetting("store_currency");
  return configured && ["GHS", "NGN", "USD", "ZAR", "KES"].includes(configured.toUpperCase())
    ? configured.toUpperCase()
    : "USD";
}

async function paystackRequest(path: string, init: RequestInit = {}) {
  const secret = await paystackSecret();
  if (!secret) throw Object.assign(new Error("Paystack is not configured. Add a Paystack secret key in admin settings."), { statusCode: 503 });
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({})) as { status?: boolean; message?: string; data?: Record<string, unknown> };
  if (!response.ok || body.status !== true) {
    throw Object.assign(new Error(body.message || "Paystack request failed."), { statusCode: 502 });
  }
  return body.data ?? {};
}

function validPaystackSignature(rawBody: string, received: string, secret: string) {
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(received, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

function paymentReference(data: Record<string, unknown>) {
  return typeof data.reference === "string" ? data.reference : null;
}

async function tryAutoForwardToEprolo(order: typeof ordersTable.$inferSelect) {
  if (order.paymentStatus !== "PAID") return;
  const cfg = await getEproloConfig();
  if (!cfg) return;
  const address = order.shippingAddress;
  if (!address || !address.name || !address.phone || !(address.address || address.line1) || !address.city ||
      !(address.state || address.province) || !(address.postalCode || address.postCode) ||
      !address.country || !address.countryCode) {
    console.warn(`[Eprolo] Skipping order ${order.id}: complete shipping address is required.`);
    return;
  }
  const items = Array.isArray(order.items) ? order.items : [];
  const fulfillmentItems = items
    .filter((item) => item.eproloVariantId && item.qty > 0)
    .map((item) => ({ variantId: item.eproloVariantId!, quantity: item.qty }));
  if (!fulfillmentItems.length) return;

  try {
    const eproloOrderId = await eprolo.createOrder(cfg, {
      orderId: order.id,
      customer: {
        name: address.name,
        phone: address.phone,
        address: address.address || address.line1,
        city: address.city,
        province: address.state || address.province,
        provinceCode: address.stateCode || address.provinceCode || address.state || address.province,
        postCode: address.postalCode || address.postCode,
        country: address.country,
        countryCode: address.countryCode,
      },
      items: fulfillmentItems,
    });
    console.log(`[Eprolo] Auto-forwarded paid order ${order.id} → Eprolo order ${eproloOrderId}`);
  } catch (err) {
    console.error(`[Eprolo] Auto-forward failed for paid order ${order.id}:`, err instanceof Error ? err.message : err);
  }
}

async function finalizePaidTransaction(reference: string, gatewayData: Record<string, unknown>) {
  const order = await db.transaction(async (tx) => {
    const [transaction] = await tx.select().from(paymentTransactionsTable)
      .where(eq(paymentTransactionsTable.reference, reference)).limit(1);
    if (!transaction) throw Object.assign(new Error("Payment transaction not found."), { statusCode: 404 });
    if (transaction.status === "failed") throw Object.assign(new Error("This payment transaction has failed."), { statusCode: 409 });
    if (transaction.orderId) {
      const [existingOrder] = await tx.select().from(ordersTable).where(eq(ordersTable.id, transaction.orderId)).limit(1);
      if (existingOrder) return existingOrder;
    }
    if (gatewayData.status !== "success") {
      await tx.update(paymentTransactionsTable).set({ status: "failed", updatedAt: new Date() })
        .where(eq(paymentTransactionsTable.id, transaction.id));
      throw Object.assign(new Error("Payment was not successful."), { statusCode: 402 });
    }
    if (Number(gatewayData.amount) !== transaction.amount) {
      throw Object.assign(new Error("Payment amount does not match the checkout total."), { statusCode: 400 });
    }

    const metadata = transaction.metadata as PendingCheckout;
    const authoritativeItems: OrderItem[] = [];
    let subtotal = 0;
    for (const item of metadata.items) {
      const [product] = await tx.select().from(productsTable)
        .where(and(eq(productsTable.id, item.productId), eq(productsTable.status, "ACTIVE"))).limit(1);
      if (!product) throw Object.assign(new Error(`Product ${item.productId} is no longer available.`), { statusCode: 409 });
      const stockCondition = or(eq(productsTable.trackQuantity, false), gte(productsTable.stock, item.quantity));
      const [reserved] = await tx.update(productsTable)
        .set({ stock: product.trackQuantity ? sql`${productsTable.stock} - ${item.quantity}` : sql`${productsTable.stock}` })
        .where(and(eq(productsTable.id, product.id), stockCondition)).returning();
      if (!reserved) throw Object.assign(new Error(`${product.name} is out of stock or has insufficient stock.`), { statusCode: 409 });
      subtotal += item.price * item.quantity;
      authoritativeItems.push({ productId: product.id, name: product.name, qty: item.quantity, price: item.price });
    }

    let discount = 0;
    if (metadata.couponCode) {
      const [coupon] = await tx.select().from(couponsTable)
        .where(eq(couponsTable.code, metadata.couponCode.toUpperCase())).limit(1);
      if (!coupon || !coupon.active || (coupon.expiresAt && coupon.expiresAt <= new Date()) ||
          (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) ||
          subtotal < Number(coupon.minOrderAmount)) {
        throw Object.assign(new Error("The paid checkout coupon is no longer valid; payment requires manual review."), { statusCode: 409 });
      }
      discount = coupon.discountType === "PERCENTAGE"
        ? Math.min(subtotal, Math.floor((subtotal * Number(coupon.discountValue)) / 100))
        : Math.min(subtotal, Number(coupon.discountValue));
      const [redeemed] = await tx.update(couponsTable)
        .set({ usedCount: sql`${couponsTable.usedCount} + 1`, updatedAt: new Date() })
        .where(and(eq(couponsTable.id, coupon.id), eq(couponsTable.active, true),
          or(isNull(couponsTable.expiresAt), gt(couponsTable.expiresAt, new Date())),
          or(isNull(couponsTable.maxUses), lt(couponsTable.usedCount, coupon.maxUses)))).returning();
      if (!redeemed) throw Object.assign(new Error("The paid checkout coupon is no longer available; payment requires manual review."), { statusCode: 409 });
    }

    const expectedAmount = Math.max(0, subtotal - discount) * 100;
    if (expectedAmount !== transaction.amount) {
      throw Object.assign(new Error("The catalog total changed after payment; payment requires manual review."), { statusCode: 409 });
    }
    const [created] = await tx.insert(ordersTable).values({
      id: randomUUID(),
      customerName: metadata.customerName,
      customerEmail: metadata.customerEmail,
      total: Math.max(0, subtotal - discount),
      status: "PROCESSING",
      paymentStatus: "PAID",
      paymentProvider: transaction.provider,
      paymentReference: transaction.reference,
      paidAt: new Date(),
      items: authoritativeItems,
      shippingAddress: metadata.shippingAddress,
      billingAddress: metadata.billingAddress,
    }).returning();
    await tx.insert(orderItemsTable).values(authoritativeItems.map((item) => ({
      id: randomUUID(),
      orderId: created.id,
      productId: item.productId,
      variantId: item.variantId ?? null,
      sku: item.sku ?? "",
      productName: item.name,
      unitPrice: item.price,
      quantity: item.qty,
      total: item.price * item.qty,
      eproloVariantId: item.eproloVariantId ?? null,
    })));
    await tx.update(paymentTransactionsTable).set({
      status: "paid", orderId: created.id, verifiedAt: new Date(), updatedAt: new Date(),
    }).where(eq(paymentTransactionsTable.id, transaction.id));
    return created;
  });

  eventBus.publish({ type: "new_order", payload: {
    id: order.id, customerName: order.customerName, customerEmail: order.customerEmail,
    total: order.total, status: order.status, createdAt: order.createdAt.toISOString(),
  }});
  void tryAutoForwardToEprolo(order);
  return order;
}

async function verifyPaystackReference(reference: string) {
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
}

router.post("/payments/initialize", async (req, res) => {
  const parsed = paymentInitializeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A valid email, shipping address, and callback URL are required.", details: parsed.error.flatten() });
  const sid = await checkoutSessionId(req, res);
  const cart = await cartPricing(sid);
  if ("error" in cart || !cart.items.length) return res.status(400).json({ error: "Your cart is empty or contains unavailable products." });
  const coupon = parsed.data.couponCode ? await findUsableCouponForCheckout(parsed.data.couponCode, cart.subtotal) : null;
  if (coupon && "error" in coupon) return res.status(400).json({ error: coupon.error });
  const discount = coupon && !("error" in coupon) ? coupon.discount : 0;
  const metadata: PendingCheckout = {
    customerName: parsed.data.customerName,
    customerEmail: parsed.data.customerEmail,
    items: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity, price: item.price, name: item.name })),
    couponCode: coupon && !("error" in coupon) ? coupon.coupon.code : undefined,
    shippingAddress: addressSnapshot(parsed.data.shippingAddress),
    billingAddress: parsed.data.billingAddress,
  };
  const amount = Math.max(0, cart.subtotal - discount) * 100;
  const reference = `LUXE_${Date.now()}_${randomBytes(6).toString("hex")}`;
  await db.insert(paymentTransactionsTable).values({
    id: randomUUID(), sessionId: sid, reference, status: "pending", amount,
    provider: "paystack", email: parsed.data.customerEmail, callbackUrl: parsed.data.callbackUrl, metadata,
  });
  try {
    const data = await paystackRequest("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({ email: parsed.data.customerEmail, amount, currency: await paystackCurrency(), reference, callback_url: parsed.data.callbackUrl }),
    });
    return res.status(201).json({ status: true, data: { ...data, reference } });
  } catch (error) {
    await db.update(paymentTransactionsTable).set({ status: "failed", updatedAt: new Date() }).where(eq(paymentTransactionsTable.reference, reference));
    throw error;
  }
});

router.get("/payments/verify/:reference", async (req, res) => {
  const reference = z.string().trim().min(1).max(200).safeParse(req.params.reference);
  if (!reference.success) return res.status(400).json({ error: "Invalid payment reference." });
  const data = await verifyPaystackReference(reference.data);
  const order = await finalizePaidTransaction(reference.data, data);
  return res.json({ status: true, data, order });
});

router.post("/payments/webhook/paystack", async (req, res) => {
  const secret = await paystackSecret();
  const signature = req.get("x-paystack-signature");
  const rawBody = (req as typeof req & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
  if (!secret || !signature || !validPaystackSignature(rawBody, signature, secret)) {
    return res.status(401).json({ error: "Invalid webhook signature." });
  }
  const event = req.body as { event?: string; data?: Record<string, unknown> };
  const reference = event.event === "charge.success" ? paymentReference(event.data ?? {}) : null;
  if (!reference) return res.json({ received: true });
  const order = await finalizePaidTransaction(reference, event.data ?? {});
  return res.json({ received: true, orderId: order.id });
});

// Order creation is payment-gated. Legacy clients may call this after redirect;
// the payment reference is verified again and the idempotent finalizer is used.
router.post("/orders", async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success || !parsed.data.paystackRef) {
    return res.status(402).json({ error: "Complete payment before creating an order." });
  }
  const data = await verifyPaystackReference(parsed.data.paystackRef);
  const order = await finalizePaidTransaction(parsed.data.paystackRef, data);
  return res.status(200).json(order);
});

router.put("/orders/:id", requireAdmin, async (req, res) => {
  const orderId = req.params.id as string;
  const parsed = z.object({ status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]) }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid order status.", details: parsed.error.flatten() });
  const updates: Record<string, unknown> = parsed.data;
  const rows = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, orderId)).returning();
  if (!rows[0]) return res.status(404).json({ error: "Order not found" });
  eventBus.publish({ type: "order_updated", payload: { id: rows[0].id, status: rows[0].status } });
  return res.json(rows[0]);
});

// ── Categories ────────────────────────────────────────────────────────────────

router.get("/categories", async (_req, res) => {
  const rows = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  const withCount = await Promise.all(rows.map(async (c) => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.categoryId, c.id));
    return { ...c, productCount: count ?? 0 };
  }));
  return res.json(withCount);
});

router.post("/categories", requireAdmin, async (req, res) => {
  const { name, description } = req.body as { name: string; description: string };
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [cat] = await db.insert(categoriesTable).values({ id: randomUUID(), name, slug, description: description ?? "" }).returning();
  return res.status(201).json({ ...cat, productCount: 0 });
});

router.put("/categories/:id", requireAdmin, async (req, res) => {
  const categoryId = req.params.id as string;
  const allowed = ["name", "description"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  if (req.body.name) updates["slug"] = String(req.body.name).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const rows = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, categoryId)).returning();
  if (!rows[0]) return res.status(404).json({ error: "Category not found" });
  return res.json(rows[0]);
});

router.delete("/categories/:id", requireAdmin, async (req, res) => {
  const categoryId = req.params.id as string;
  await db.delete(categoriesTable).where(eq(categoriesTable.id, categoryId));
  return res.json({ ok: true });
});

// ── Blog Posts ────────────────────────────────────────────────────────────────

router.get("/posts", async (_req, res) => {
  return res.json(await db.select().from(blogPostsTable).orderBy(desc(blogPostsTable.createdAt)));
});

router.post("/posts", requireAdmin, async (req, res) => {
  const { title, content, status, authorName } = req.body as { title?: string; content?: string; status?: string; authorName?: string };
  const slug = (title ?? "post").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [post] = await db.insert(blogPostsTable).values({
    id: randomUUID(), title: title ?? "", slug, content: content ?? "",
    status: status ?? "DRAFT", authorName: authorName ?? "Admin",
    publishedAt: status === "PUBLISHED" ? new Date() : null,
  }).returning();
  return res.status(201).json(post);
});

router.get("/posts/:id", async (req, res) => {
  const [p] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, req.params.id as string)).limit(1);
  if (!p) return res.status(404).json({ error: "Post not found" });
  return res.json(p);
});

router.put("/posts/:id", requireAdmin, async (req, res) => {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ["title", "content", "status", "authorName"]) {
    if (key in req.body) updates[key] = req.body[key];
  }
  if (req.body.title) updates.slug = String(req.body.title).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (req.body.status === "PUBLISHED") updates.publishedAt = new Date();
  const [updated] = await db.update(blogPostsTable).set(updates).where(eq(blogPostsTable.id, req.params.id as string)).returning();
  if (!updated) return res.status(404).json({ error: "Post not found" });
  return res.json(updated);
});

router.delete("/posts/:id", requireAdmin, async (req, res) => {
  await db.delete(blogPostsTable).where(eq(blogPostsTable.id, req.params.id as string));
  return res.json({ ok: true });
});

// ── Media ─────────────────────────────────────────────────────────────────────

router.get("/media", requireAdmin, async (_req, res) => {
  return res.json(await db.select().from(mediaItemsTable).orderBy(desc(mediaItemsTable.createdAt)));
});

router.delete("/media/:id", requireAdmin, async (req, res) => {
  await db.delete(mediaItemsTable).where(eq(mediaItemsTable.id, req.params.id as string));
  return res.json({ ok: true });
});

router.post("/media/upload", requireAdmin, (_req, res) => {
  return res.status(501).json({ error: "Media upload is not configured. Connect Cloudinary before uploading files." });
});

// ── Users / Customers ─────────────────────────────────────────────────────────

router.get("/users", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  const customers = new Map<string, { id: string; name: string; email: string; totalOrders: number; totalSpent: number; createdAt: Date }>();
  for (const order of rows) {
    const current = customers.get(order.customerEmail);
    if (current) {
      current.totalOrders += 1;
      current.totalSpent += Number(order.total);
      if (order.createdAt < current.createdAt) current.createdAt = order.createdAt;
    } else {
      customers.set(order.customerEmail, {
        id: order.customerId ?? order.customerEmail,
        name: order.customerName,
        email: order.customerEmail,
        totalOrders: 1,
        totalSpent: Number(order.total),
        createdAt: order.createdAt,
      });
    }
  }
  return res.json([...customers.values()]);
});

// ── Coupons ───────────────────────────────────────────────────────────────────

router.get("/coupons", requireAdmin, async (_req, res) => {
  return res.json(await db.select().from(couponsTable).orderBy(desc(couponsTable.createdAt)));
});

router.post("/coupons", requireAdmin, async (req, res) => {
  const [coupon] = await db.insert(couponsTable).values({
    id: randomUUID(),
    code: String(req.body.code ?? "").trim().toUpperCase(),
    description: String(req.body.description ?? ""),
    discountType: req.body.discountType ?? "PERCENTAGE",
    discountValue: Number(req.body.discountValue ?? 0),
    minOrderAmount: Number(req.body.minOrderAmount ?? 0),
    maxUses: req.body.maxUses == null ? null : Number(req.body.maxUses),
    usedCount: 0,
    active: req.body.active ?? true,
    expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
  }).returning();
  return res.status(201).json(coupon);
});

router.put("/coupons/:id", requireAdmin, async (req, res) => {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ["description", "discountType", "active"]) if (key in req.body) updates[key] = req.body[key];
  for (const key of ["discountValue", "minOrderAmount", "maxUses", "usedCount"]) {
    if (key in req.body) updates[key] = req.body[key] == null ? null : Number(req.body[key]);
  }
  if ("expiresAt" in req.body) updates.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
  const [updated] = await db.update(couponsTable).set(updates).where(eq(couponsTable.id, req.params.id as string)).returning();
  if (!updated) return res.status(404).json({ error: "Coupon not found" });
  return res.json(updated);
});

router.delete("/coupons/:id", requireAdmin, async (req, res) => {
  await db.delete(couponsTable).where(eq(couponsTable.id, req.params.id as string));
  return res.json({ ok: true });
});

// ── Team ──────────────────────────────────────────────────────────────────────

router.get("/team", requireAdmin, async (_req, res) => {
  return res.json(await db.select().from(teamMembersTable));
});

router.post("/team/invite", requireAdmin, async (req, res) => {
  const { email, role } = req.body as { email: string; role: string };
  const token = randomUUID();
  await db.insert(teamMembersTable).values({
    id: randomUUID(), name: "", email, role: role ?? "EDITOR", status: "Invited",
    inviteToken: token, inviteExpiresAt: new Date(Date.now() + 86400000 * 7),
  });
  return res.status(201).json({ ok: true, token });
});

router.get("/team/accept", async (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token) return res.status(400).json({ error: "token is required" });
  const [member] = await db.select({ email: teamMembersTable.email })
    .from(teamMembersTable).where(eq(teamMembersTable.inviteToken, token)).limit(1);
  if (!member) return res.status(404).json({ error: "Invite not found or expired" });
  return res.json({ ok: true, email: member.email });
});

router.post("/team/accept", async (req, res) => {
  const { token, name } = req.body as { token: string; name: string };
  if (!token) return res.status(400).json({ error: "token is required" });
  const [member] = await db.update(teamMembersTable)
    .set({ name, status: "Active", inviteToken: null, inviteExpiresAt: null })
    .where(eq(teamMembersTable.inviteToken, token)).returning();
  if (!member) return res.status(404).json({ error: "Invite not found or expired" });
  return res.json({ ok: true, name: member.name });
});

export default router;
