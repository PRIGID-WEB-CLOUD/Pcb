import { Router } from "express";
import { randomUUID } from "crypto";

const router = Router();

// ── In-memory store ──────────────────────────────────────────────────────────

interface CartItem    { id: string; sessionId: string; productId: string; quantity: number; product: { id: string; name: string; price: number; imageUrl: string | null }; }
interface WishlistItem{ id: string; sessionId: string; productId: string; product: { id: string; name: string; price: number; imageUrl: string | null }; }
interface Review      { id: string; productId: string; rating: number; comment: string; authorName: string; createdAt: string; }
interface Order       { id: string; sessionId: string; reference: string; status: string; amount: number; provider: string; email: string; createdAt: string; }

const carts     = new Map<string, CartItem[]>();
const wishlists = new Map<string, WishlistItem[]>();
let reviews: Review[] = [
  { id: randomUUID(), productId: "seed", rating: 5, comment: "Exceptional quality — the cashmere is incredibly soft.", authorName: "A. Chen",    createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: randomUUID(), productId: "seed", rating: 4, comment: "Beautiful piece. Delivery was very fast.",             authorName: "M. Webb",    createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
];
const paymentOrders = new Map<string, Order>();

function sessionId(req: { cookies?: Record<string, string>; headers: Record<string, string | string[] | undefined> }): string {
  return (req.cookies?.["luxe_session"] ?? req.headers["x-session-id"] ?? "anon") as string;
}

// ── Cart ──────────────────────────────────────────────────────────────────────

router.get("/cart", (req, res) => {
  const sid = sessionId(req);
  res.json(carts.get(sid) ?? []);
});

router.post("/cart", (req, res) => {
  const sid = sessionId(req);
  const { productId, quantity = 1, product } = req.body as { productId: string; quantity?: number; product?: CartItem["product"] };
  if (!productId) return res.status(400).json({ error: "productId is required" });
  const existing = carts.get(sid) ?? [];
  const idx = existing.findIndex((i) => i.productId === productId);
  if (idx >= 0) {
    existing[idx].quantity += quantity;
    carts.set(sid, existing);
    return res.json(existing[idx]);
  }
  const item: CartItem = { id: randomUUID(), sessionId: sid, productId, quantity, product: product ?? { id: productId, name: "Product", price: 0, imageUrl: null } };
  carts.set(sid, [...existing, item]);
  res.status(201).json(item);
});

router.put("/cart/:productId", (req, res) => {
  const sid = sessionId(req);
  const { productId } = req.params;
  const { quantity } = req.body as { quantity: number };
  const items = carts.get(sid) ?? [];
  const idx = items.findIndex((i) => i.productId === productId);
  if (idx === -1) return res.status(404).json({ error: "Item not in cart" });
  if (quantity <= 0) {
    carts.set(sid, items.filter((i) => i.productId !== productId));
    return res.json({ ok: true });
  }
  items[idx].quantity = quantity;
  carts.set(sid, items);
  res.json(items[idx]);
});

router.delete("/cart/:productId", (req, res) => {
  const sid = sessionId(req);
  const { productId } = req.params;
  carts.set(sid, (carts.get(sid) ?? []).filter((i) => i.productId !== productId));
  res.json({ ok: true });
});

// ── Wishlist ──────────────────────────────────────────────────────────────────

router.get("/wishlist", (req, res) => {
  const sid = sessionId(req);
  res.json(wishlists.get(sid) ?? []);
});

router.post("/wishlist", (req, res) => {
  const sid = sessionId(req);
  const { productId, product } = req.body as { productId: string; product?: WishlistItem["product"] };
  if (!productId) return res.status(400).json({ error: "productId is required" });
  const existing = wishlists.get(sid) ?? [];
  if (existing.find((i) => i.productId === productId)) return res.json({ ok: true, alreadyWishlisted: true });
  const item: WishlistItem = { id: randomUUID(), sessionId: sid, productId, product: product ?? { id: productId, name: "Product", price: 0, imageUrl: null } };
  wishlists.set(sid, [...existing, item]);
  res.status(201).json(item);
});

router.delete("/wishlist/:productId", (req, res) => {
  const sid = sessionId(req);
  const { productId } = req.params;
  wishlists.set(sid, (wishlists.get(sid) ?? []).filter((i) => i.productId !== productId));
  res.json({ ok: true });
});

// ── Coupons ───────────────────────────────────────────────────────────────────

const STORE_COUPONS: Record<string, { type: "PERCENTAGE" | "FIXED"; value: number }> = {
  LUXE20:    { type: "PERCENTAGE", value: 20 },
  WELCOME10: { type: "PERCENTAGE", value: 10 },
  FLAT50:    { type: "FIXED",      value: 50  },
};

router.post("/coupons/validate", (req, res) => {
  const { code, orderAmount } = req.body as { code?: string; orderAmount?: number };
  if (!code) return res.status(400).json({ error: "code is required" });
  const coupon = STORE_COUPONS[code.toUpperCase()];
  if (!coupon) return res.status(404).json({ error: "Coupon code not found or expired." });
  const discount = coupon.type === "PERCENTAGE"
    ? Math.floor(((orderAmount ?? 0) * coupon.value) / 100)
    : coupon.value;
  res.json({ code: code.toUpperCase(), type: coupon.type, value: coupon.value, discount, description: `${coupon.type === "PERCENTAGE" ? `${coupon.value}%` : `$${coupon.value}`} off your order` });
});

router.post("/coupons/redeem", (req, res) => {
  const { code, orderAmount } = req.body as { code?: string; orderAmount?: number };
  if (!code) return res.status(400).json({ error: "code is required" });
  const coupon = STORE_COUPONS[code.toUpperCase()];
  if (!coupon) return res.status(404).json({ error: "Coupon not found." });
  const discount = coupon.type === "PERCENTAGE"
    ? Math.floor(((orderAmount ?? 0) * coupon.value) / 100)
    : coupon.value;
  res.json({ ok: true, code: code.toUpperCase(), discount });
});

// ── Payments ──────────────────────────────────────────────────────────────────

router.post("/payments/initialize", (req, res) => {
  const { amount, email, provider, callbackUrl } = req.body as { amount?: number; email?: string; provider?: string; callbackUrl?: string };
  if (!amount || !email) return res.status(400).json({ error: "amount and email are required." });

  const reference = `LUX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const order: Order = { id: randomUUID(), sessionId: "anon", reference, status: "pending", amount: amount, provider: provider ?? "paystack", email, createdAt: new Date().toISOString() };
  paymentOrders.set(reference, order);

  if (provider === "flutterwave") {
    res.json({ status: "success", message: "Hosted Link", data: { link: callbackUrl ? `${callbackUrl}&reference=${reference}&status=successful` : `/?payment=success&reference=${reference}` } });
  } else {
    res.json({ status: "success", message: "Authorization URL created", data: { authorization_url: callbackUrl ? `${callbackUrl}&reference=${reference}` : `/?payment=success&reference=${reference}`, access_code: reference, reference } });
  }
});

router.get("/payments/verify/:reference", (req, res) => {
  const { reference } = req.params;
  const order = paymentOrders.get(reference);
  if (!order) return res.status(404).json({ error: "Payment reference not found." });
  order.status = "success";
  paymentOrders.set(reference, order);
  res.json({ status: "success", data: { reference, status: "success", amount: order.amount, paid_at: new Date().toISOString() } });
});

// ── Reviews ───────────────────────────────────────────────────────────────────

router.get("/reviews", (req, res) => {
  const { productId } = req.query as { productId?: string };
  if (productId) return res.json(reviews.filter((r) => r.productId === productId));
  res.json(reviews);
});

router.post("/reviews", (req, res) => {
  const { productId, rating, comment, authorName } = req.body as { productId?: string; rating?: number; comment?: string; authorName?: string };
  if (!productId || !rating) return res.status(400).json({ error: "productId and rating are required." });
  const review: Review = { id: randomUUID(), productId, rating, comment: comment ?? "", authorName: authorName ?? "Anonymous", createdAt: new Date().toISOString() };
  reviews = [review, ...reviews];
  res.status(201).json(review);
});

export default router;
