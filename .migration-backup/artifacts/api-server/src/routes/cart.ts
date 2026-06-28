import { Router } from "express";
import { db } from "@workspace/db";
import { carts, cartItems, products } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const [cart] = await db.select().from(carts).where(eq(carts.userId, user.id)).limit(1);
    if (!cart) return res.json({ items: [] });

    const items = await db
      .select({ cartItem: cartItems, product: products })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, cart.id));

    res.json({ ...cart, items: items.map(r => ({ ...r.cartItem, product: r.product })) });
  } catch { res.status(500).json({ error: "Failed to fetch cart" }); }
});

router.post("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { productId, quantity = 1 } = req.body;
    if (!productId) return res.status(400).json({ error: "Product ID required" });

    let [cart] = await db.select().from(carts).where(eq(carts.userId, user.id)).limit(1);
    if (!cart) {
      [cart] = await db.insert(carts).values({ userId: user.id }).returning();
    }

    const [existing] = await db.select().from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId))).limit(1);

    if (existing) {
      await db.update(cartItems).set({ quantity: existing.quantity + quantity })
        .where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({ cartId: cart.id, productId, quantity });
    }

    res.json({ message: "Item added to cart" });
  } catch { res.status(500).json({ error: "Failed to add to cart" }); }
});

router.patch("/:productId", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { productId } = req.params;
    const { quantity } = req.body;

    const [cart] = await db.select().from(carts).where(eq(carts.userId, user.id)).limit(1);
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    await db.update(cartItems).set({ quantity })
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)));

    res.json({ message: "Cart updated" });
  } catch { res.status(500).json({ error: "Failed to update cart" }); }
});

router.delete("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const [cart] = await db.select().from(carts).where(eq(carts.userId, user.id)).limit(1);
    if (!cart) return res.json({ message: "Cart already empty" });

    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    res.json({ message: "Cart cleared" });
  } catch { res.status(500).json({ error: "Failed to clear cart" }); }
});

router.delete("/:productId", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { productId } = req.params;
    const [cart] = await db.select().from(carts).where(eq(carts.userId, user.id)).limit(1);
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    await db.delete(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)));

    res.json({ message: "Item removed" });
  } catch { res.status(500).json({ error: "Failed to remove item" }); }
});

export default router;
