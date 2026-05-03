import { Router } from "express";
import { db } from "@workspace/db";
import {
  facebookConnections, facebookCatalogSettings,
  facebookPixelEvents, facebookAudiences,
  facebookPagePosts, facebookPostTemplates,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

const DEFAULT_CONNECTIONS = [
  { connectionKey: "facebook",  active: true  },
  { connectionKey: "instagram", active: true  },
  { connectionKey: "pixel",     active: true  },
  { connectionKey: "messenger", active: false },
];

const DEFAULT_PIXEL_EVENTS = [
  { storeEvent: "Product Viewed",   fbEvent: "ViewContent",          enabled: true  },
  { storeEvent: "Add to Cart",      fbEvent: "AddToCart",            enabled: true  },
  { storeEvent: "Checkout Started", fbEvent: "InitiateCheckout",     enabled: true  },
  { storeEvent: "Order Completed",  fbEvent: "Purchase",             enabled: true  },
  { storeEvent: "Wishlist Added",   fbEvent: "AddToWishlist",        enabled: false },
  { storeEvent: "Search Performed", fbEvent: "Search",               enabled: false },
  { storeEvent: "Account Created",  fbEvent: "CompleteRegistration", enabled: true  },
];

const DEFAULT_AUDIENCES = [
  { name: "Past 30-Day Purchasers", size: "4,820", type: "Custom",      status: "Active"   },
  { name: "Lookalike — Top LTV",    size: "180K",  type: "Lookalike",   status: "Active"   },
  { name: "Cart Abandoners (7d)",   size: "1,240", type: "Retargeting", status: "Active"   },
  { name: "VIP Segment Lookalike",  size: "92K",   type: "Lookalike",   status: "Building" },
];


// ── Connections ──────────────────────────────────────────────────────────────

router.get("/connections", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    res.json(await db.select().from(facebookConnections));
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/connections/:key", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [updated] = await db.update(facebookConnections)
      .set({ active: req.body.active, updatedAt: new Date() })
      .where(eq(facebookConnections.connectionKey, req.params.key))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Catalog ──────────────────────────────────────────────────────────────────

router.get("/catalog", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [settings] = await db.select().from(facebookCatalogSettings).limit(1);
    res.json({ ...settings, includedCategories: JSON.parse(settings.includedCategories) });
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/catalog", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { includedCategories, minPrice, maxPrice } = req.body;
    const [existing] = await db.select().from(facebookCatalogSettings).limit(1);
    const [updated] = await db.update(facebookCatalogSettings)
      .set({ includedCategories: JSON.stringify(includedCategories), minPrice, maxPrice, updatedAt: new Date() })
      .where(eq(facebookCatalogSettings.id, existing.id))
      .returning();
    res.json({ ...updated, includedCategories });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Pixel Events ─────────────────────────────────────────────────────────────

router.get("/pixel-events", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    res.json(await db.select().from(facebookPixelEvents));
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/pixel-events/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [updated] = await db.update(facebookPixelEvents)
      .set({ enabled: req.body.enabled, updatedAt: new Date() })
      .where(eq(facebookPixelEvents.id, req.params.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Audiences ────────────────────────────────────────────────────────────────

router.get("/audiences", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    res.json(await db.select().from(facebookAudiences));
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/audiences", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [created] = await db.insert(facebookAudiences)
      .values({ name: req.body.name, type: req.body.type, status: "Building", size: "Building…" })
      .returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/audiences/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [updated] = await db.update(facebookAudiences)
      .set({ status: req.body.status })
      .where(eq(facebookAudiences.id, req.params.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/audiences/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(facebookAudiences).where(eq(facebookAudiences.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Page Posts ───────────────────────────────────────────────────────────────

router.get("/posts", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const posts = await db.select().from(facebookPagePosts).orderBy(desc(facebookPagePosts.createdAt));
    res.json(posts);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/posts", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { caption, imageUrl, link, postType, scheduledFor, status } = req.body;
    const [created] = await db.insert(facebookPagePosts)
      .values({ caption, imageUrl: imageUrl || null, link: link || null, postType, scheduledFor: scheduledFor || null, status: status || "Draft" })
      .returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/posts/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { caption, imageUrl, link, postType, scheduledFor, status } = req.body;
    const [updated] = await db.update(facebookPagePosts)
      .set({ caption, imageUrl: imageUrl || null, link: link || null, postType, scheduledFor: scheduledFor || null, status })
      .where(eq(facebookPagePosts.id, req.params.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// POST /api/facebook/posts/:id/publish — simulates publishing (adds mock engagement)
router.post("/posts/:id/publish", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const likes    = Math.floor(Math.random() * 800) + 200;
    const comments = Math.floor(Math.random() * 120) + 20;
    const shares   = Math.floor(Math.random() * 60)  + 10;
    const reach    = (likes + comments + shares) * Math.floor(Math.random() * 8 + 6);
    const [updated] = await db.update(facebookPagePosts)
      .set({ status: "Published", scheduledFor: null, likes, comments, shares, reach })
      .where(eq(facebookPagePosts.id, req.params.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/posts/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(facebookPagePosts).where(eq(facebookPagePosts.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Post Templates ────────────────────────────────────────────────────────────

router.get("/post-templates", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    res.json(await db.select().from(facebookPostTemplates).orderBy(desc(facebookPostTemplates.usageCount)));
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/post-templates", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [created] = await db.insert(facebookPostTemplates)
      .values({ name: req.body.name.toLowerCase().replace(/\s+/g, "_"), body: req.body.body, postType: req.body.postType || "Standard" })
      .returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/post-templates/:id/use", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [tpl] = await db.select().from(facebookPostTemplates).where(eq(facebookPostTemplates.id, req.params.id)).limit(1);
    const [updated] = await db.update(facebookPostTemplates)
      .set({ usageCount: (tpl?.usageCount ?? 0) + 1 })
      .where(eq(facebookPostTemplates.id, req.params.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
