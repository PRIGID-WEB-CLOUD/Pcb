import { Router } from "express";
import { db } from "@workspace/db";
import { newsletter } from "@workspace/db/schema";
import { eq, desc, gte, sql } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/\S+@\S+\.\S+/.test(email))
      return res.status(400).json({ error: "Valid email required" });
    const [existing] = await db.select().from(newsletter).where(eq(newsletter.email, email)).limit(1);
    if (existing) return res.status(400).json({ error: "Email is already subscribed" });
    await db.insert(newsletter).values({ email });
    res.json({ message: "Successfully subscribed to the newsletter!" });
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.get("/", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const rows = await db.select().from(newsletter).orderBy(desc(newsletter.createdAt));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());

    const thisMonth = rows.filter(r => new Date(r.createdAt) >= startOfMonth).length;
    const thisWeek  = rows.filter(r => new Date(r.createdAt) >= startOfWeek).length;

    const byMonth: Record<string, number> = {};
    rows.forEach(r => {
      const key = new Date(r.createdAt).toISOString().slice(0, 7);
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    const growth = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, count]) => ({ month, count }));

    res.json({ subscribers: rows, total: rows.length, thisMonth, thisWeek, growth });
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.get("/export", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const rows = await db.select().from(newsletter).orderBy(desc(newsletter.createdAt));
    const csv = ["Email,Subscribed At", ...rows.map(r => `${r.email},${r.createdAt}`)].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="newsletter-subscribers-${Date.now()}.csv"`);
    res.send(csv);
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(newsletter).where(eq(newsletter.id, req.params.id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

export default router;
