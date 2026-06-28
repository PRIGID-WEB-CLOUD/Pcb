import { Router } from "express";
import { db } from "@workspace/db";
import { orders, orderItems, products, coupons } from "@workspace/db/schema";
import { eq, desc, inArray, and } from "drizzle-orm";
import { getSession } from "../lib/auth";
import { sendOrderConfirmationEmail } from "../lib/email";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const userOrders = await db
      .select()
      .from(orders)
      .where(user.role === "ADMIN" ? undefined : eq(orders.userId, user.id))
      .orderBy(desc(orders.createdAt));

    const ordersWithItems = await Promise.all(
      userOrders.map(async (order) => {
        const items = await db
          .select({ item: orderItems, product: products })
          .from(orderItems)
          .leftJoin(products, eq(orderItems.productId, products.id))
          .where(eq(orderItems.orderId, order.id));
        return { ...order, items: items.map((r) => ({ ...r.item, product: r.product })) };
      }),
    );

    res.json(ordersWithItems);
  } catch {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.post("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { shippingAddress, items, paystackRef, couponCode } = req.body;
    if (!items?.length) return res.status(400).json({ error: "Missing required fields" });

    // ── Server-side price validation ──────────────────────────────────────────
    const productIds: string[] = items.map((i: any) => i.productId);
    const dbProducts = await db
      .select({ id: products.id, name: products.name, price: products.price, stock: products.stock, trackQuantity: products.trackQuantity })
      .from(products)
      .where(inArray(products.id, productIds));

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    const validatedItems: { productId: string; quantity: number; price: number }[] = [];
    for (const item of items) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) return res.status(400).json({ error: `Product not found: ${item.productId}` });
      if (dbProduct.trackQuantity && dbProduct.stock < item.quantity) {
        return res.status(400).json({ error: `"${dbProduct.name}" is out of stock` });
      }
      validatedItems.push({ productId: item.productId, quantity: item.quantity, price: dbProduct.price });
    }

    const subtotal = validatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // ── Server-side coupon validation ─────────────────────────────────────────
    let discount = 0;
    let validCouponCode: string | null = null;
    if (couponCode) {
      const [coupon] = await db
        .select()
        .from(coupons)
        .where(and(eq(coupons.code, couponCode.trim().toUpperCase()), eq(coupons.active, true)))
        .limit(1);

      if (coupon && subtotal >= coupon.minOrderAmount) {
        const notExpired = !coupon.expiresAt || coupon.expiresAt > new Date();
        const hasUses = !coupon.maxUses || coupon.usedCount < coupon.maxUses;
        if (notExpired && hasUses) {
          validCouponCode = coupon.code;
          discount =
            coupon.discountType === "PERCENTAGE"
              ? subtotal * (coupon.discountValue / 100)
              : Math.min(coupon.discountValue, subtotal);
        }
      }
    }

    const total = Math.max(0, subtotal - discount);

    // ── Create order ──────────────────────────────────────────────────────────
    const [order] = await db
      .insert(orders)
      .values({ userId: user.id, total, discountAmount: discount, couponCode: validCouponCode, shippingAddress, paystackRef })
      .returning();

    for (const item of validatedItems) {
      await db.insert(orderItems).values({ orderId: order.id, productId: item.productId, quantity: item.quantity, price: item.price });
    }

    // ── Decrement stock ───────────────────────────────────────────────────────
    for (const item of validatedItems) {
      const dbProduct = productMap.get(item.productId)!;
      if (dbProduct.trackQuantity) {
        await db
          .update(products)
          .set({ stock: Math.max(0, dbProduct.stock - item.quantity), updatedAt: new Date() })
          .where(eq(products.id, item.productId));
      }
    }

    // ── Order confirmation email (fire & forget) ──────────────────────────────
    sendOrderConfirmationEmail(user.email, {
      orderId: order.id.slice(0, 8).toUpperCase(),
      customerName: user.name,
      items: validatedItems.map((i) => ({
        name: productMap.get(i.productId)?.name ?? "Product",
        quantity: i.quantity,
        price: i.price,
      })),
      total,
      shippingAddress: shippingAddress ?? "",
    }).catch(() => {});

    res.json(order);
  } catch {
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.put("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { orderId, status } = req.body;
    if (!orderId || !status) return res.status(400).json({ error: "Missing orderId or status" });

    const ALLOWED_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!ALLOWED_STATUSES.includes(status))
      return res.status(400).json({ error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(", ")}` });

    const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, orderId)).returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update order" });
  }
});

export default router;
