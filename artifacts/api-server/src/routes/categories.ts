import { Router } from "express";
import { db } from "@workspace/db";
import { categories } from "@workspace/db/schema";
import { asc, eq } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(categories).orderBy(asc(categories.name));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch categories" }); }
});

router.post("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { name, parentId, slug, description, sortOrder } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });

    if (parentId) {
      const [parent] = await db.select().from(categories).where(eq(categories.id, parentId)).limit(1);
      if (!parent) return res.status(400).json({ error: "Parent category not found" });
      if (parent.parentId) return res.status(400).json({ error: "Cannot nest more than 2 levels deep" });
    }

    const [cat] = await db.insert(categories).values({
      name: name.trim(),
      parentId: parentId || null,
      slug: slug?.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: description?.trim() || null,
      sortOrder: sortOrder ?? 0,
    }).returning();
    res.json(cat);
  } catch { res.status(500).json({ error: "Failed to create category" }); }
});

router.put("/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { name, parentId, slug, description, sortOrder } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });

    if (parentId) {
      if (parentId === id) return res.status(400).json({ error: "A category cannot be its own parent" });
      const [parent] = await db.select().from(categories).where(eq(categories.id, parentId)).limit(1);
      if (!parent) return res.status(400).json({ error: "Parent category not found" });
      if (parent.parentId) return res.status(400).json({ error: "Cannot nest more than 2 levels deep" });
    }

    const updates: Record<string, unknown> = { name: name.trim() };
    if (parentId !== undefined) updates.parentId = parentId || null;
    if (slug !== undefined)     updates.slug = slug?.trim() || null;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (sortOrder !== undefined)   updates.sortOrder = sortOrder;

    const [cat] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    if (!cat) return res.status(404).json({ error: "Category not found" });
    res.json(cat);
  } catch { res.status(500).json({ error: "Failed to update category" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const [deleted] = await db.delete(categories).where(eq(categories.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Category not found" });
    res.json({ success: true });
  } catch (err: any) {
    if (err?.code === "23503") {
      return res.status(409).json({ error: "Cannot delete category: it is still assigned to one or more products. Remove or reassign those products first." });
    }
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
