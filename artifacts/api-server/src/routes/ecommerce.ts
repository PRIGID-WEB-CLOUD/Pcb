import { Router } from "express";
import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  productsTable,
  couponsTable,
  reviewsTable,
  storeCartItemsTable,
  storeWishlistItemsTable,
} from "@workspace/db";

const router = Router();

function sessionId(req: { cookies?: Record<string, string>; headers: Record<string, string | string[] | undefined> }): string {
  return (req.cookies?.["luxe_session"] ?? req.headers["x-session-id"] ?? "anon") as string;
}

async function productSnapshot(productId: string) {
  const [product] = await db.select({
    id: productsTable.id,
    name: productsTable.name,
    price: productsTable.price,
    imageUrl: productsTable.imageUrl,
  }).from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  return product ?? null;
}

async function cartItems(sid: string) {
  return db.select().from(storeCartItemsTable)
    .where(eq(storeCartItemsTable.sessionId, sid))
    .orderBy(desc(storeCartItemsTable.updatedAt));
}

router.get("/cart", async (req, res) => {
  return res.json({ items: await cartItems(sessionId(req)) });
});

router.post("/cart", async (req, res) => {
  const sid = sessionId(req);
  const { productId, quantity = 1 } = req.body as { productId?: string; quantity?: number };
  if (!productId) return res.status(400).json({ error: "productId is required" });
  const product = await productSnapshot(productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const [existing] = await db.select().from(storeCartItemsTable)
    .where(and(eq(storeCartItemsTable.sessionId, sid), eq(storeCartItemsTable.productId, productId))).limit(1);
  if (existing) {
    await db.update(storeCartItemsTable)
      .set({ quantity: existing.quantity + Number(quantity), product, updatedAt: new Date() })
      .where(eq(storeCartItemsTable.id, existing.id));
  } else {
    await db.insert(storeCartItemsTable).values({
      id: randomUUID(), sessionId: sid, productId, quantity: Number(quantity), product,
    });
  }
  return res.status(existing ? 200 : 201).json({ items: await cartItems(sid) });
});

async function updateCartItem(req: any, res: any) {
  const sid = sessionId(req);
  const productId = req.params.productId as string;
  const quantity = Number(req.body.quantity);
  const [item] = await db.select().from(storeCartItemsTable)
    .where(and(eq(storeCartItemsTable.sessionId, sid), eq(storeCartItemsTable.productId, productId))).limit(1);
  if (!item) return res.status(404).json({ error: "Item not in cart" });
  if (quantity <= 0) await db.delete(storeCartItemsTable).where(eq(storeCartItemsTable.id, item.id));
  else await db.update(storeCartItemsTable).set({ quantity, updatedAt: new Date() }).where(eq(storeCartItemsTable.id, item.id));
  return res.json({ items: await cartItems(sid) });
}

router.put("/cart/:productId", updateCartItem);
router.patch("/cart/:productId", updateCartItem);

router.delete("/cart/:productId", async (req, res) => {
  const sid = sessionId(req);
  await db.delete(storeCartItemsTable).where(and(
    eq(storeCartItemsTable.sessionId, sid),
    eq(storeCartItemsTable.productId, req.params.productId as string),
  ));
  return res.json({ items: await cartItems(sid) });
});

router.get("/wishlist", async (req, res) => {
  return res.json(await db.select().from(storeWishlistItemsTable)
    .where(eq(storeWishlistItemsTable.sessionId, sessionId(req)))
    .orderBy(desc(storeWishlistItemsTable.createdAt)));
});

router.post("/wishlist", async (req, res) => {
  const sid = sessionId(req);
  const { productId } = req.body as { productId?: string };
  if (!productId) return res.status(400).json({ error: "productId is required" });
  const product = await productSnapshot(productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const [existing] = await db.select().from(storeWishlistItemsTable)
    .where(and(eq(storeWishlistItemsTable.sessionId, sid), eq(storeWishlistItemsTable.productId, productId))).limit(1);
  if (existing) return res.json({ ok: true, alreadyWishlisted: true, item: existing });
  const [item] = await db.insert(storeWishlistItemsTable)
    .values({ id: randomUUID(), sessionId: sid, productId, product }).returning();
  return res.status(201).json(item);
});

router.delete("/wishlist/:productId", async (req, res) => {
  await db.delete(storeWishlistItemsTable).where(and(
    eq(storeWishlistItemsTable.sessionId, sessionId(req)),
    eq(storeWishlistItemsTable.productId, req.params.productId as string),
  ));
  return res.json({ ok: true });
});

router.post("/coupons/validate", async (req, res) => {
  const { code, orderAmount = 0 } = req.body as { code?: string; orderAmount?: number };
  if (!code) return res.status(400).json({ error: "code is required" });
  const [coupon] = await db.select().from(couponsTable)
    .where(eq(couponsTable.code, code.toUpperCase())).limit(1);
  if (!coupon || !coupon.active || (coupon.expiresAt && coupon.expiresAt < new Date())) {
    return res.status(404).json({ error: "Coupon code not found or expired." });
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return res.status(400).json({ error: "Coupon usage limit reached." });
  }
  if (Number(orderAmount) < Number(coupon.minOrderAmount)) {
    return res.status(400).json({ error: `Minimum order amount is ${coupon.minOrderAmount}.` });
  }
  const discount = coupon.discountType === "PERCENTAGE"
    ? Math.floor((Number(orderAmount) * Number(coupon.discountValue)) / 100)
    : Number(coupon.discountValue);
  return res.json({ code: coupon.code, type: coupon.discountType, value: coupon.discountValue, discount, description: coupon.description });
});

router.post("/coupons/redeem", async (req, res) => {
  const { code, orderAmount = 0 } = req.body as { code?: string; orderAmount?: number };
  if (!code) return res.status(400).json({ error: "code is required" });
  const [coupon] = await db.select().from(couponsTable)
    .where(eq(couponsTable.code, code.toUpperCase())).limit(1);
  if (!coupon || !coupon.active) return res.status(404).json({ error: "Coupon not found." });
  const discount = coupon.discountType === "PERCENTAGE"
    ? Math.floor((Number(orderAmount) * Number(coupon.discountValue)) / 100)
    : Number(coupon.discountValue);
  await db.update(couponsTable).set({ usedCount: coupon.usedCount + 1, updatedAt: new Date() })
    .where(eq(couponsTable.id, coupon.id));
  return res.json({ ok: true, code: coupon.code, discount });
});

router.post("/payments/initialize", (_req, res) => {
  return res.status(501).json({ error: "Payment provider is not configured. Connect Paystack, Flutterwave, or Stripe in admin settings." });
});

router.get("/payments/verify/:reference", (_req, res) => {
  return res.status(501).json({ error: "Payment provider is not configured." });
});

router.get("/reviews", async (req, res) => {
  const productId = req.query.productId as string | undefined;
  const rows = productId
    ? await db.select().from(reviewsTable).where(eq(reviewsTable.productId, productId)).orderBy(desc(reviewsTable.createdAt))
    : await db.select().from(reviewsTable).orderBy(desc(reviewsTable.createdAt));
  return res.json(rows);
});

router.post("/reviews", async (req, res) => {
  const { productId, rating, comment, authorName } = req.body as { productId?: string; rating?: number; comment?: string; authorName?: string };
  if (!productId || !rating) return res.status(400).json({ error: "productId and rating are required." });
  const product = await productSnapshot(productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const [review] = await db.insert(reviewsTable).values({
    id: randomUUID(), productId, rating: Number(rating), comment: comment ?? "", authorName: authorName ?? "Anonymous",
  }).returning();
  return res.status(201).json(review);
});

export default router;