import { Router } from "express";
import { db } from "@workspace/db";
import { products, productVariants, categories, reviews, users } from "@workspace/db/schema";
import { eq, desc, ilike, or, sql } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

// ── GET all products ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { categoryId, search, new: newOnly } = req.query;

    let query = db
      .select({ product: products, category: categories })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.createdAt))
      .$dynamic();

    if (search && typeof search === "string" && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.where(
        or(
          ilike(products.name, term),
          ilike(products.description, term)
        )
      );
    }

    const rows = await query;

    let result = rows.map(r => ({ ...r.product, category: r.category }));

    if (categoryId && typeof categoryId === "string") {
      result = result.filter(p => p.categoryId === categoryId);
    }

    if (newOnly === "true") {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const fresh = result.filter(p => new Date(p.createdAt) >= cutoff);
      result = fresh.length > 0 ? fresh : result.slice(0, 12);
    }

    res.json(result);
  } catch { res.status(500).json({ error: "Failed to fetch products" }); }
});

// ── GET single product ────────────────────────────────────────────────────────
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

    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(productVariants.createdAt);

    res.json({
      ...row.product,
      category: row.category,
      reviews: productReviews.map(r => ({ ...r.review, user: r.user })),
      variants,
    });
  } catch { res.status(500).json({ error: "Failed to fetch product" }); }
});

// ── POST create product ───────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const {
      name, description, price, compareAtPrice, imageUrl, images,
      categoryId, status, tags, seoTitle, seoDescription, trackQuantity,
    } = req.body;
    if (!name || !description || !price || !categoryId)
      return res.status(400).json({ error: "Missing required fields" });

    const [product] = await db.insert(products).values({
      name, description,
      price: parseFloat(price),
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
      imageUrl: imageUrl || null,
      images: images ? JSON.stringify(images) : null,
      categoryId,
      status: status || "ACTIVE",
      tags: tags ? JSON.stringify(tags) : null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      trackQuantity: trackQuantity !== false,
    }).returning();
    res.json(product);
  } catch { res.status(500).json({ error: "Failed to create product" }); }
});

// ── PUT update product ────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const {
      name, description, price, compareAtPrice, imageUrl, images,
      categoryId, status, tags, seoTitle, seoDescription, trackQuantity,
    } = req.body;
    if (!name || !description || !price || !categoryId)
      return res.status(400).json({ error: "Missing required fields" });

    const [product] = await db.update(products)
      .set({
        name, description,
        price: parseFloat(price),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
        imageUrl: imageUrl || null,
        images: images ? JSON.stringify(images) : null,
        categoryId,
        status: status || "ACTIVE",
        tags: tags ? JSON.stringify(tags) : null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        trackQuantity: trackQuantity !== false,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch { res.status(500).json({ error: "Failed to update product" }); }
});

// ── DELETE product ────────────────────────────────────────────────────────────
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

// ── GET variants ──────────────────────────────────────────────────────────────
router.get("/:id/variants", async (req, res) => {
  try {
    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, req.params.id))
      .orderBy(productVariants.createdAt);
    res.json(variants);
  } catch { res.status(500).json({ error: "Failed to fetch variants" }); }
});

// ── POST create variant ───────────────────────────────────────────────────────
router.post("/:id/variants", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { name, price, sku, stock, color } = req.body;
    if (!name || price === undefined) return res.status(400).json({ error: "Missing required fields" });

    const [variant] = await db.insert(productVariants).values({
      productId: req.params.id,
      name,
      price: parseFloat(price),
      sku: sku || null,
      stock: parseInt(stock ?? "0"),
      color: color || null,
    }).returning();
    res.json(variant);
  } catch { res.status(500).json({ error: "Failed to create variant" }); }
});

// ── PUT update variant ────────────────────────────────────────────────────────
router.put("/:id/variants/:variantId", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { name, price, sku, stock, color } = req.body;
    const [variant] = await db.update(productVariants)
      .set({ name, price: parseFloat(price), sku: sku || null, stock: parseInt(stock ?? "0"), color: color || null })
      .where(eq(productVariants.id, req.params.variantId))
      .returning();
    res.json(variant);
  } catch { res.status(500).json({ error: "Failed to update variant" }); }
});

// ── DELETE variant ────────────────────────────────────────────────────────────
router.delete("/:id/variants/:variantId", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    await db.delete(productVariants).where(eq(productVariants.id, req.params.variantId));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete variant" }); }
});

export default router;
