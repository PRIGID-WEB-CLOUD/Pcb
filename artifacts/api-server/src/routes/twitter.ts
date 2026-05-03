import { Router } from "express";
import { db } from "@workspace/db";
import {
  twitterHashtags, twitterAutoRules, twitterTweetQueue,
  twitterContentTemplates, twitterSchedulerSettings,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

// GET /api/twitter/hashtags
router.get("/hashtags", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    res.json(await db.select().from(twitterHashtags));
  } catch { res.status(500).json({ error: "Failed" }); }
});

// POST /api/twitter/hashtags
router.post("/hashtags", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const tag = req.body.tag.startsWith("#") ? req.body.tag : `#${req.body.tag}`;
    const [created] = await db.insert(twitterHashtags).values({ tag }).returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// DELETE /api/twitter/hashtags/:id
router.delete("/hashtags/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(twitterHashtags).where(eq(twitterHashtags.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// GET /api/twitter/rules
router.get("/rules", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    res.json(await db.select().from(twitterAutoRules));
  } catch { res.status(500).json({ error: "Failed" }); }
});

// POST /api/twitter/rules
router.post("/rules", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [created] = await db.insert(twitterAutoRules).values(req.body).returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// PUT /api/twitter/rules/:id
router.put("/rules/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [updated] = await db.update(twitterAutoRules)
      .set({ active: req.body.active })
      .where(eq(twitterAutoRules.id, req.params.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// GET /api/twitter/queue
router.get("/queue", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    res.json(await db.select().from(twitterTweetQueue).orderBy(desc(twitterTweetQueue.createdAt)));
  } catch { res.status(500).json({ error: "Failed" }); }
});

// POST /api/twitter/queue
router.post("/queue", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [created] = await db.insert(twitterTweetQueue).values(req.body).returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// PUT /api/twitter/queue/:id
router.put("/queue/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [updated] = await db.update(twitterTweetQueue)
      .set({ status: req.body.status })
      .where(eq(twitterTweetQueue.id, req.params.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// DELETE /api/twitter/queue/:id
router.delete("/queue/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(twitterTweetQueue).where(eq(twitterTweetQueue.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// GET /api/twitter/templates
router.get("/templates", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    res.json(await db.select().from(twitterContentTemplates));
  } catch { res.status(500).json({ error: "Failed" }); }
});

// POST /api/twitter/templates
router.post("/templates", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [created] = await db.insert(twitterContentTemplates)
      .values({ name: req.body.name.toLowerCase().replace(/\s+/g, "_"), body: req.body.body })
      .returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// PUT /api/twitter/templates/:id/use
router.put("/templates/:id/use", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [tpl] = await db.select().from(twitterContentTemplates).where(eq(twitterContentTemplates.id, req.params.id)).limit(1);
    const [updated] = await db.update(twitterContentTemplates)
      .set({ usageCount: (tpl?.usageCount ?? 0) + 1 })
      .where(eq(twitterContentTemplates.id, req.params.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// GET /api/twitter/scheduler
router.get("/scheduler", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [settings] = await db.select().from(twitterSchedulerSettings).limit(1);
    res.json(settings);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// PUT /api/twitter/scheduler
router.put("/scheduler", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [existing] = await db.select().from(twitterSchedulerSettings).limit(1);
    const [updated] = await db.update(twitterSchedulerSettings)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(twitterSchedulerSettings.id, existing.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
