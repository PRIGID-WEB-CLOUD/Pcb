import { Router } from "express";
import { db } from "@workspace/db";
import { wishlists, wishlistItems, products, categories } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const [wishlist] = await db.select().from(wishlists).where(eq(wishlists.userId, user.id)).limit(1);
    if (!wishlist) return res.json([]);

    const items = await db
      .select({ item: wishlistItems, product: products, category: categories })
      .from(wishlistItems)
      .leftJoin(products, eq(wishlistItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(wishlistItems.wishlistId, wishlist.id));

    res.json(items.map(r => ({
      ...r.item,
      product: { ...r.product, category: r.category },
    })));
  } catch { res.status(500).json({ error: "Failed to fetch wishlist" }); }
});

router.post("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: "Product ID required" });

    let [wishlist] = await db.select().from(wishlists).where(eq(wishlists.userId, user.id)).limit(1);
    if (!wishlist) {
      [wishlist] = await db.insert(wishlists).values({ userId: user.id }).returning();
    }

    const [existing] = await db.select().from(wishlistItems)
      .where(and(eq(wishlistItems.wishlistId, wishlist.id), eq(wishlistItems.productId, productId))).limit(1);

    if (existing) return res.status(400).json({ message: "Item already in wishlist" });

    await db.insert(wishlistItems).values({ wishlistId: wishlist.id, productId });
    res.json({ message: "Added to wishlist" });
  } catch { res.status(500).json({ error: "Failed to add to wishlist" }); }
});

router.delete("/:productId", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { productId } = req.params;
    const [wishlist] = await db.select().from(wishlists).where(eq(wishlists.userId, user.id)).limit(1);
    if (!wishlist) return res.status(404).json({ error: "Wishlist not found" });

    await db.delete(wishlistItems)
      .where(and(eq(wishlistItems.wishlistId, wishlist.id), eq(wishlistItems.productId, productId)));

    res.json({ message: "Removed from wishlist" });
  } catch { res.status(500).json({ error: "Failed to remove from wishlist" }); }
});

export default router;
