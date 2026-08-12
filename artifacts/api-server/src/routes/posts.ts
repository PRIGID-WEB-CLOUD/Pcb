import { Router } from "express";
import { db } from "@workspace/db";
import { blogPosts } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

// ── GET all posts (public: PUBLISHED only; admin: all) ────────────────────────
router.get("/", async (req, res) => {
  try {
    const user = await getSession(req);
    const isAdmin = user?.role === "ADMIN";
    const rows = await db
      .select()
      .from(blogPosts)
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt));

    const result = isAdmin ? rows : rows.filter(p => p.status === "PUBLISHED");
    res.json(result);
  } catch { res.status(500).json({ error: "Failed to fetch posts" }); }
});

// ── GET single post by id or slug ─────────────────────────────────────────────
router.get("/:idOrSlug", async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let rows = await db.select().from(blogPosts).where(eq(blogPosts.id, idOrSlug)).limit(1);
    if (!rows.length) rows = await db.select().from(blogPosts).where(eq(blogPosts.slug, idOrSlug)).limit(1);
    if (!rows.length) return res.status(404).json({ error: "Post not found" });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: "Failed to fetch post" }); }
});

// ── POST create post ──────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { title, slug, excerpt, content, coverImage, category, author, status, tags, seoTitle, seoDescription, publishedAt } = req.body;
    if (!title || !slug) return res.status(400).json({ error: "Title and slug are required" });

    const [post] = await db.insert(blogPosts).values({
      title, slug,
      excerpt: excerpt || "",
      content: content || "",
      coverImage: coverImage || null,
      category: category || "Editorial",
      author: author || "Admin",
      status: status || "DRAFT",
      tags: tags ? JSON.stringify(tags) : null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      publishedAt: publishedAt ? new Date(publishedAt) : (status === "PUBLISHED" ? new Date() : null),
    }).returning();
    res.json(post);
  } catch (e: any) {
    if (e?.message?.includes("unique")) return res.status(400).json({ error: "A post with this slug already exists" });
    res.status(500).json({ error: "Failed to create post" });
  }
});

// ── PUT update post ───────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const { title, slug, excerpt, content, coverImage, category, author, status, tags, seoTitle, seoDescription, publishedAt } = req.body;
    if (!title || !slug) return res.status(400).json({ error: "Title and slug are required" });

    const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
    const wasPublished = existing[0]?.status === "PUBLISHED";

    const [post] = await db.update(blogPosts).set({
      title, slug,
      excerpt: excerpt || "",
      content: content || "",
      coverImage: coverImage || null,
      category: category || "Editorial",
      author: author || "Admin",
      status: status || "DRAFT",
      tags: tags ? JSON.stringify(tags) : null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      publishedAt: publishedAt
        ? new Date(publishedAt)
        : (status === "PUBLISHED" && !wasPublished ? new Date() : existing[0]?.publishedAt ?? null),
      updatedAt: new Date(),
    }).where(eq(blogPosts.id, id)).returning();

    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (e: any) {
    if (e?.message?.includes("unique")) return res.status(400).json({ error: "A post with this slug already exists" });
    res.status(500).json({ error: "Failed to update post" });
  }
});

// ── DELETE post ───────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const [deleted] = await db.delete(blogPosts).where(eq(blogPosts.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Post not found" });
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete post" }); }
});

export default router;
