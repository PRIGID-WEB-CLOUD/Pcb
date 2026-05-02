import { Router } from "express";
import { db } from "@workspace/db";
import { categories } from "@workspace/db/schema";
import { asc } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(categories).orderBy(asc(categories.name));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch categories" }); }
});

router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [cat] = await db.insert(categories).values({ name }).returning();
    res.json(cat);
  } catch { res.status(500).json({ error: "Failed to create category" }); }
});

export default router;
