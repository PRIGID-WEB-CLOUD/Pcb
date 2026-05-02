import { Router } from "express";
import { db } from "@workspace/db";
import { products, categories, reviews, users } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { categoryId } = req.query;
    const rows = await db
      .select({ product: products, category: categories })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.createdAt));

    const filtered = categoryId
      ? rows.filter(r => r.product.categoryId === categoryId)
      : rows;

    const result = filtered.map(r => ({
      ...r.product,
      category: r.category,
    }));
    res.json(result);
  } catch { res.status(500).json({ error: "Failed to fetch products" }); }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [row] = await db
      .select({ product: products, category: categories })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Product not found" });

    const productReviews = await db
      .select({ review: reviews, user: { id: users.id, name: users.name } })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.productId, id))
      .orderBy(desc(reviews.createdAt));

    res.json({
      ...row.product,
      category: row.category,
      reviews: productReviews.map(r => ({ ...r.review, user: r.user })),
    });
  } catch { res.status(500).json({ error: "Failed to fetch product" }); }
});

router.post("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { name, description, price, imageUrl, categoryId } = req.body;
    if (!name || !description || !price || !categoryId) return res.status(400).json({ error: "Missing required fields" });

    const [product] = await db.insert(products).values({
      name, description, price: parseFloat(price), imageUrl, categoryId,
    }).returning();
    res.json(product);
  } catch { res.status(500).json({ error: "Failed to create product" }); }
});

router.put("/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const { name, description, price, imageUrl, categoryId } = req.body;
    if (!name || !description || !price || !categoryId) return res.status(400).json({ error: "Missing required fields" });

    const [product] = await db.update(products)
      .set({ name, description, price: parseFloat(price), imageUrl, categoryId, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch { res.status(500).json({ error: "Failed to update product" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const [deleted] = await db.delete(products).where(eq(products.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Product not found" });
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete product" }); }
});

export default router;
