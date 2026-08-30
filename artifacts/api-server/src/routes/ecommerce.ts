import { Router, type Request, type Response } from "express";
import { randomBytes, randomUUID } from "crypto";
import { and, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import {
  db,
  productsTable,
  couponsTable,
  reviewsTable,
  ordersTable,
  storeCartItemsTable,
  storeWishlistItemsTable,
} from "@workspace/db";
import { getSessionUser } from "../middleware/requireAdmin";
import { validate } from "../middleware/validate";
import { z } from "zod";

const router = Router();
const CART_COOKIE = "luxe_cart";
const MAX_CART_QUANTITY = 100;

const productIdSchema = z.string().trim().min(1).max(200);
const quantitySchema = z.number().int().min(1).max(MAX_CART_QUANTITY);
const cartSchema = z.object({ productId: productIdSchema, quantity: quantitySchema.default(1) });
const updateCartSchema = z.object({ quantity: z.number().int().min(0).max(MAX_CART_QUANTITY) });
const wishlistSchema = z.object({ productId: productIdSchema });
const couponSchema = z.object({ code: z.string().trim().min(1).max(64) });
const reviewSchema = z.object({
  productId: productIdSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(2000),
});

async function sessionId(req: Request, res: Response) {
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

async function productSnapshot(productId: string) {
  const [product] = await db.select({
    id: productsTable.id,
    name: productsTable.name,
    price: productsTable.price,
    imageUrl: productsTable.imageUrl,
    stock: productsTable.stock,
    trackQuantity: productsTable.trackQuantity,
    status: productsTable.status,
  }).from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  return product ?? null;
}

async function cartItems(sid: string) {
  return db.select().from(storeCartItemsTable)
    .where(eq(storeCartItemsTable.sessionId, sid))
    .orderBy(desc(storeCartItemsTable.updatedAt));
}

async function cartPricing(sid: string) {
  const items = await cartItems(sid);
  let subtotal = 0;
  const authoritativeItems: Array<{ productId: string; quantity: number; price: number; name: string }> = [];
  for (const item of items) {
    const product = await productSnapshot(item.productId);
    if (!product || product.status !== "ACTIVE") return { error: "A product in your cart is no longer available." } as const;
    if (product.trackQuantity && item.quantity > product.stock) {
      return { error: `${product.name} only has ${product.stock} left in stock.` } as const;
    }
    subtotal += product.price * item.quantity;
    authoritativeItems.push({ productId: product.id, quantity: item.quantity, price: product.price, name: product.name });
  }
  return { items: authoritativeItems, subtotal } as const;
}

function calculateDiscount(coupon: typeof couponsTable.$inferSelect, subtotal: number) {
  return coupon.discountType === "PERCENTAGE"
    ? Math.min(subtotal, Math.floor((subtotal * Number(coupon.discountValue)) / 100))
    : Math.min(subtotal, Number(coupon.discountValue));
}

async function findUsableCoupon(code: string, subtotal: number) {
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
  return { coupon, discount: calculateDiscount(coupon, subtotal) } as const;
}

router.get("/cart", async (req, res) => {
  return res.json({ items: await cartItems(await sessionId(req, res)) });
});

router.post("/cart", validate(cartSchema), async (req, res) => {
  const sid = await sessionId(req, res);
  const { productId, quantity } = req.body as z.infer<typeof cartSchema>;
  const product = await productSnapshot(productId);
  if (!product || product.status !== "ACTIVE") return res.status(404).json({ error: "Product not found" });
  if (product.trackQuantity && product.stock < quantity) return res.status(400).json({ error: `Only ${product.stock} item(s) available.` });
  const [existing] = await db.select().from(storeCartItemsTable)
    .where(and(eq(storeCartItemsTable.sessionId, sid), eq(storeCartItemsTable.productId, productId))).limit(1);
  const nextQuantity = (existing?.quantity ?? 0) + quantity;
  if (nextQuantity > MAX_CART_QUANTITY || (product.trackQuantity && nextQuantity > product.stock)) {
    return res.status(400).json({ error: `Cannot add more than ${product.trackQuantity ? product.stock : MAX_CART_QUANTITY} item(s).` });
  }
  if (existing) {
    await db.update(storeCartItemsTable).set({ quantity: nextQuantity, product, updatedAt: new Date() })
      .where(eq(storeCartItemsTable.id, existing.id));
  } else {
    await db.insert(storeCartItemsTable).values({ id: randomUUID(), sessionId: sid, productId, quantity, product });
  }
  return res.status(existing ? 200 : 201).json({ items: await cartItems(sid) });
});

async function updateCartItem(req: Request, res: Response) {
  const parsed = updateCartSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "quantity must be an integer from 0 to 100." });
  const sid = await sessionId(req, res);
  const productId = productIdSchema.parse(req.params.productId);
  const [item] = await db.select().from(storeCartItemsTable)
    .where(and(eq(storeCartItemsTable.sessionId, sid), eq(storeCartItemsTable.productId, productId))).limit(1);
  if (!item) return res.status(404).json({ error: "Item not in cart" });
  if (parsed.data.quantity === 0) {
    await db.delete(storeCartItemsTable).where(eq(storeCartItemsTable.id, item.id));
  } else {
    const product = await productSnapshot(productId);
    if (!product || product.status !== "ACTIVE") return res.status(400).json({ error: "Product is no longer available." });
    if (product.trackQuantity && parsed.data.quantity > product.stock) return res.status(400).json({ error: `Only ${product.stock} item(s) available.` });
    await db.update(storeCartItemsTable).set({ quantity: parsed.data.quantity, product, updatedAt: new Date() })
      .where(eq(storeCartItemsTable.id, item.id));
  }
  return res.json({ items: await cartItems(sid) });
}

router.put("/cart/:productId", updateCartItem);
router.patch("/cart/:productId", updateCartItem);

router.delete("/cart/:productId", async (req, res) => {
  const sid = await sessionId(req, res);
  await db.delete(storeCartItemsTable).where(and(eq(storeCartItemsTable.sessionId, sid), eq(storeCartItemsTable.productId, req.params.productId as string)));
  return res.json({ items: await cartItems(sid) });
});

router.get("/wishlist", async (req, res) => {
  const sid = await sessionId(req, res);
  return res.json(await db.select().from(storeWishlistItemsTable).where(eq(storeWishlistItemsTable.sessionId, sid)).orderBy(desc(storeWishlistItemsTable.createdAt)));
});

router.post("/wishlist", validate(wishlistSchema), async (req, res) => {
  const sid = await sessionId(req, res);
  const { productId } = req.body as z.infer<typeof wishlistSchema>;
  const product = await productSnapshot(productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const [existing] = await db.select().from(storeWishlistItemsTable).where(and(eq(storeWishlistItemsTable.sessionId, sid), eq(storeWishlistItemsTable.productId, productId))).limit(1);
  if (existing) return res.json({ ok: true, alreadyWishlisted: true, item: existing });
  const [item] = await db.insert(storeWishlistItemsTable).values({ id: randomUUID(), sessionId: sid, productId, product }).returning();
  return res.status(201).json(item);
});

router.delete("/wishlist/:productId", async (req, res) => {
  await db.delete(storeWishlistItemsTable).where(and(eq(storeWishlistItemsTable.sessionId, await sessionId(req, res)), eq(storeWishlistItemsTable.productId, req.params.productId as string)));
  return res.json({ ok: true });
});

async function validateCouponForCart(req: Request, res: Response) {
  const parsed = couponSchema.safeParse(req.body);
  if (!parsed.success) return { response: res.status(400).json({ error: "A valid coupon code is required." }) } as const;
  const pricing = await cartPricing(await sessionId(req, res));
  if ("error" in pricing) return { response: res.status(400).json({ error: pricing.error }) } as const;
  const result = await findUsableCoupon(parsed.data.code, pricing.subtotal);
  if ("error" in result) return { response: res.status(400).json({ error: result.error }) } as const;
  return { ...result, subtotal: pricing.subtotal } as const;
}

router.post("/coupons/validate", async (req, res) => {
  const result = await validateCouponForCart(req, res);
  if ("response" in result) return result.response;
  const { coupon, discount } = result;
  return res.json({ code: coupon.code, type: coupon.discountType, value: coupon.discountValue, discount, description: coupon.description });
});

router.post("/coupons/redeem", async (req, res) => {
  const result = await validateCouponForCart(req, res);
  if ("response" in result) return result.response;
  const { coupon, discount } = result;
  const [redeemed] = await db.update(couponsTable)
    .set({ usedCount: sql`${couponsTable.usedCount} + 1`, updatedAt: new Date() })
    .where(and(
      eq(couponsTable.id, coupon.id),
      eq(couponsTable.active, true),
      or(isNull(couponsTable.expiresAt), gt(couponsTable.expiresAt, new Date())),
      or(isNull(couponsTable.maxUses), lt(couponsTable.usedCount, couponsTable.maxUses)),
    )).returning();
  if (!redeemed) return res.status(409).json({ error: "Coupon is no longer available." });
  return res.json({ ok: true, code: redeemed.code, discount });
});

router.get("/reviews", async (req, res) => {
  const productId = req.query.productId as string | undefined;
  const rows = productId
    ? await db.select().from(reviewsTable).where(eq(reviewsTable.productId, productId)).orderBy(desc(reviewsTable.createdAt))
    : await db.select().from(reviewsTable).orderBy(desc(reviewsTable.createdAt));
  return res.json(rows);
});

router.post("/reviews", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Sign in to write a review." });
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Product, rating, and a review of 1–2000 characters are required." });
  const product = await productSnapshot(parsed.data.productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const [purchased] = await db.select({ id: ordersTable.id }).from(ordersTable)
    .where(and(
      eq(ordersTable.paymentStatus, "PAID"),
      or(eq(ordersTable.customerId, user.id), eq(ordersTable.customerEmail, user.email)),
      sql`${ordersTable.items} @> ${JSON.stringify([{ productId: parsed.data.productId }])}::jsonb`,
    )).limit(1);
  if (!purchased) return res.status(403).json({ error: "You can review products only after a verified purchase." });
  const [review] = await db.insert(reviewsTable).values({
    id: randomUUID(), productId: parsed.data.productId, userId: user.id, rating: parsed.data.rating,
    comment: parsed.data.comment, authorName: user.name,
  }).returning();
  return res.status(201).json(review);
});

export default router;