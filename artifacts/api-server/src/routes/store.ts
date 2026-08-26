import { Router } from "express";
import { randomUUID } from "crypto";
import {
  db, productsTable, categoriesTable, ordersTable, productVariantsTable,
  mediaItemsTable, blogPostsTable, couponsTable, usersTable, teamMembersTable,
} from "@workspace/db";
import { and, eq, desc, sql, like, gte, gt, isNull, lt, or } from "drizzle-orm";
import { eprolo } from "../services/eprolo";
import { getEproloConfig } from "./eprolo";
import { requireAdmin } from "../middleware/requireAdmin";
import { validate } from "../middleware/validate";
import { z } from "zod";
import { eventBus } from "../lib/eventBus";

const router = Router();

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
});

router.get("/products", async (_req, res) => {
  const prods = await db.select().from(productsTable).orderBy(desc(productsTable.createdAt));
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
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
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
  const [variant] = await db.insert(productVariantsTable).values({
    id: randomUUID(),
    productId,
    size: req.body.size ?? "",
    color: req.body.color ?? "",
    stock: Number(req.body.stock ?? 0),
    price: req.body.price == null ? null : Number(req.body.price),
    sku: req.body.sku ?? "",
  }).returning();
  return res.status(201).json(variant);
});

router.put("/products/:id/variants/:variantId", requireAdmin, async (req, res) => {
  const variantId = req.params.variantId as string;
  const updates: Record<string, unknown> = {};
  for (const key of ["size", "color", "stock", "price", "sku"]) {
    if (key in req.body) updates[key] = key === "stock" || key === "price"
      ? (req.body[key] == null ? null : Number(req.body[key]))
      : req.body[key];
  }
  const [updated] = await db.update(productVariantsTable)
    .set(updates)
    .where(eq(productVariantsTable.id, variantId))
    .returning();
  if (!updated) return res.status(404).json({ error: "Variant not found" });
  return res.json(updated);
});

router.delete("/products/:id/variants/:variantId", requireAdmin, async (req, res) => {
  await db.delete(productVariantsTable).where(eq(productVariantsTable.id, req.params.variantId as string));
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

// ── Eprolo auto-fulfillment helper ───────────────────────────────────────────
async function tryAutoForwardToEprolo(order: typeof ordersTable.$inferSelect, shippingAddress: Record<string, string>) {
  const cfg = await getEproloConfig();
  if (!cfg) return;

  const items = Array.isArray(order.items) ? order.items as Array<{ productId?: string; id?: string; quantity?: number }> : [];
  const productIds = items.map(i => i.productId ?? i.id).filter(Boolean) as string[];
  if (!productIds.length) return;

  const eproloProducts = await db.select()
    .from(productsTable)
    .where(like(productsTable.tags, "%eprolo%"));

  const eproloProductIds = new Set(eproloProducts.map(p => p.id));
  const eproloItems = items.filter(i => eproloProductIds.has(i.productId ?? i.id ?? ""));

  if (!eproloItems.length) return;

  try {
    const fulfillmentItems = eproloItems.map(i => ({
      variantId: i.productId ?? i.id ?? "",
      quantity: i.quantity ?? 1,
    }));

    const addr = shippingAddress;
    const eproloOrderId = await eprolo.createOrder(cfg, {
      orderId: order.id,
      customer: {
        name:         addr.name        || order.customerName || "Valued Customer",
        phone:        addr.phone       || "0000000000",
        address:      addr.address     || addr.line1 || "N/A",
        city:         addr.city        || "New York",
        province:     addr.state       || "New York",
        provinceCode: addr.stateCode   || addr.state || "NY",
        postCode:     addr.postalCode  || "10001",
        country:      addr.country     || "United States",
        countryCode:  addr.countryCode || "US",
      },
      items: fulfillmentItems,
    });

    console.log(`[Eprolo] Auto-forwarded order ${order.id} → Eprolo order ${eproloOrderId}`);
  } catch (err) {
    console.error(`[Eprolo] Auto-forward failed for order ${order.id}:`, err instanceof Error ? err.message : err);
  }
}

const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
});
const checkoutSchema = z.object({
  customerName: z.string().trim().min(1).max(120).default("Guest"),
  customerEmail: z.string().trim().toLowerCase().email(),
  items: z.array(checkoutItemSchema).min(1).max(100),
  couponCode: z.string().trim().max(64).optional(),
  shippingAddress: z.record(z.string()).optional(),
  paystackRef: z.string().max(200).optional(),
});

// Public checkout endpoint — no auth required (called by storefront).
// Prices, totals, coupon discounts, and stock are always calculated here.
router.post("/orders", async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid checkout details.", details: parsed.error.flatten() });
  const { customerName, customerEmail, items, couponCode } = parsed.data;

  const order = await db.transaction(async (tx) => {
    const authoritativeItems: Array<OrderItem & { productId: string }> = [];
    let subtotal = 0;
    for (const item of items) {
      const [product] = await tx.select().from(productsTable).where(eq(productsTable.id, item.productId)).limit(1);
      if (!product || product.status !== "ACTIVE") throw new Error(`Product ${item.productId} is unavailable.`);
      const stockCondition = or(eq(productsTable.trackQuantity, false), gte(productsTable.stock, item.quantity));
      const [reserved] = await tx.update(productsTable)
        .set({ stock: product.trackQuantity ? sql`${productsTable.stock} - ${item.quantity}` : product.stock })
        .where(and(eq(productsTable.id, product.id), stockCondition))
        .returning();
      if (!reserved) throw new Error(`${product.name} is out of stock or has insufficient stock.`);
      subtotal += product.price * item.quantity;
      authoritativeItems.push({ productId: product.id, name: product.name, qty: item.quantity, price: product.price });
    }

    let discount = 0;
    if (couponCode) {
      const [coupon] = await tx.select().from(couponsTable)
        .where(eq(couponsTable.code, couponCode.toUpperCase())).limit(1);
      if (!coupon || !coupon.active || (coupon.expiresAt && coupon.expiresAt <= new Date())) throw new Error("Coupon code not found or expired.");
      if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) throw new Error("Coupon usage limit reached.");
      if (subtotal < Number(coupon.minOrderAmount)) throw new Error(`Minimum order amount is ${coupon.minOrderAmount}.`);
      discount = coupon.discountType === "PERCENTAGE"
        ? Math.min(subtotal, Math.floor((subtotal * Number(coupon.discountValue)) / 100))
        : Math.min(subtotal, Number(coupon.discountValue));
      const [redeemed] = await tx.update(couponsTable)
        .set({ usedCount: sql`${couponsTable.usedCount} + 1`, updatedAt: new Date() })
        .where(and(
          eq(couponsTable.id, coupon.id),
          eq(couponsTable.active, true),
          or(isNull(couponsTable.expiresAt), gt(couponsTable.expiresAt, new Date())),
          or(isNull(couponsTable.maxUses), lt(couponsTable.usedCount, couponsTable.maxUses)),
        )).returning();
      if (!redeemed) throw new Error("Coupon is no longer available.");
    }

    const [created] = await tx.insert(ordersTable).values({
      id: randomUUID(),
      customerName,
      customerEmail,
      total: Math.max(0, subtotal - discount),
      status: "PENDING",
      items: authoritativeItems,
    }).returning();
    return created;
  }).catch((error) => {
    const message = error instanceof Error ? error.message : "Unable to create order.";
    throw Object.assign(new Error(message), { statusCode: 400 });
  });
  eventBus.publish({ type: "new_order", payload: {
    id: order.id,
    customerName: order.customerName ?? "Guest",
    customerEmail: order.customerEmail,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
  }});

  // Fire-and-forget Eprolo fulfillment for dropship items
  tryAutoForwardToEprolo(order, parsed.data.shippingAddress ?? {}).catch(() => {});

  return res.status(201).json(order);
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
