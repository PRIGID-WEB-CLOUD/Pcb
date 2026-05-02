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

export default router;
