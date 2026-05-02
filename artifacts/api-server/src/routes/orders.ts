import { Router } from "express";
import { db } from "@workspace/db";
import { orders, orderItems, products } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const userOrders = await db.select().from(orders)
      .where(user.role === "ADMIN" ? undefined : eq(orders.userId, user.id))
      .orderBy(desc(orders.createdAt));

    const ordersWithItems = await Promise.all(userOrders.map(async (order) => {
      const items = await db
        .select({ item: orderItems, product: products })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.id));
      return { ...order, items: items.map(r => ({ ...r.item, product: r.product })) };
    }));

    res.json(ordersWithItems);
  } catch { res.status(500).json({ error: "Failed to fetch orders" }); }
});

router.post("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { total, shippingAddress, items, paystackRef } = req.body;
    if (!total || !items?.length) return res.status(400).json({ error: "Missing required fields" });

    const [order] = await db.insert(orders).values({
      userId: user.id, total, shippingAddress, paystackRef,
    }).returning();

    for (const item of items) {
      await db.insert(orderItems).values({
        orderId: order.id, productId: item.productId, quantity: item.quantity, price: item.price,
      });
    }

    res.json(order);
  } catch { res.status(500).json({ error: "Failed to create order" }); }
});

router.put("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { orderId, status } = req.body;
    if (!orderId || !status) return res.status(400).json({ error: "Missing orderId or status" });

    const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, orderId)).returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to update order" }); }
});

export default router;
