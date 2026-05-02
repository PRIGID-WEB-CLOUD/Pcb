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
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [cat] = await db.insert(categories).values({ name }).returning();
    res.json(cat);
  } catch { res.status(500).json({ error: "Failed to create category" }); }
});

router.put("/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [cat] = await db.update(categories).set({ name }).where(eq(categories.id, id)).returning();
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
