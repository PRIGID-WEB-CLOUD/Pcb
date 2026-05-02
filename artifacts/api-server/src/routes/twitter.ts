import { Router } from "express";
import { db } from "@workspace/db";
import {
  twitterHashtags, twitterAutoRules, twitterTweetQueue,
  twitterContentTemplates, twitterSchedulerSettings,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

const DEFAULT_HASHTAGS = ["#LuxeFashion", "#EditorialStyle", "#SlowFashion", "#LuxeAesthetic", "#FashionWeek", "#CoutureLuxe"];

const DEFAULT_RULES = [
  { trigger: "New Product Published",    action: "Post immediately",   template: "new_arrival",   active: true  },
  { trigger: "Price Drop > 20%",         action: "Post in 30 minutes", template: "price_drop",    active: true  },
  { trigger: "Back In Stock",            action: "Post immediately",   template: "restock_alert", active: false },
  { trigger: "Order Milestone (100/wk)", action: "Post weekly digest", template: "weekly_recap",  active: false },
];

const DEFAULT_QUEUE = [
  { text: "✨ NEW ARRIVAL — Introducing the Silk Evening Blazer. Crafted from premium mulberry silk, this piece redefines modern elegance. Available now. #LuxeFashion #EditorialStyle", scheduledFor: "Today 6:00 PM",      status: "Queued", imageStyle: "Single Product High-Res" },
  { text: "🖤 PRICE DROP — The Cashmere Overcoat is now 25% off. Timeless investment dressing at its finest. #SlowFashion #CoutureLuxe",                                               scheduledFor: "Tomorrow 9:00 AM",    status: "Queued", imageStyle: "Single Product High-Res" },
  { text: "SS25 COLLECTION — 12 new arrivals just dropped. Explore the full lookbook at luxeboutique.com/ss25 #FashionWeek #LuxeAesthetic",                                            scheduledFor: "Yesterday 7:00 PM",   status: "Sent",   imageStyle: "Grid (4-up)"             },
  { text: "🔁 RESTOCKED — The Milanese Reserve Tote is back. Limited inventory. #LuxeFashion",                                                                                         scheduledFor: "Yesterday 9:00 AM",   status: "Sent",   imageStyle: "Single Product High-Res" },
];

const DEFAULT_TEMPLATES = [
  { name: "new_arrival",   usageCount: 42, body: "✨ NEW ARRIVAL — Introducing the {{product_name}}. {{product_description}} Available now. {{hashtags}}" },
  { name: "price_drop",    usageCount: 18, body: "🖤 PRICE DROP — The {{product_name}} is now {{discount}}% off. {{product_description}} {{hashtags}}"   },
  { name: "restock_alert", usageCount: 7,  body: "🔁 RESTOCKED — The {{product_name}} is back. Limited inventory. {{hashtags}}"                           },
  { name: "weekly_recap",  usageCount: 12, body: "This week at Luxe Boutique: {{new_count}} new arrivals, {{orders}} orders fulfilled. {{hashtags}}"      },
];

async function seedIfEmpty() {
  const existing = await db.select().from(twitterHashtags).limit(1);
  if (existing.length) return;
  await db.insert(twitterHashtags).values(DEFAULT_HASHTAGS.map(tag => ({ tag })));
  await db.insert(twitterAutoRules).values(DEFAULT_RULES);
  await db.insert(twitterTweetQueue).values(DEFAULT_QUEUE);
  await db.insert(twitterContentTemplates).values(DEFAULT_TEMPLATES);
  await db.insert(twitterSchedulerSettings).values([{}]);
}

// GET /api/twitter/hashtags
router.get("/hashtags", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await seedIfEmpty();
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
    await seedIfEmpty();
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
    await seedIfEmpty();
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
    await seedIfEmpty();
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
    await seedIfEmpty();
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
