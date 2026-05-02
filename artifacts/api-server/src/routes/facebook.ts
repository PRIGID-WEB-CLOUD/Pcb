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

const DEFAULT_POSTS = [
  {
    caption: "✨ Introducing the Silk Evening Blazer — crafted from pure mulberry silk and cut for the modern wardrobe. Available now in Ivory and Midnight Black. Shop the new arrival at the link in bio. #LuxeFashion #SS25",
    imageUrl: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80",
    link: "https://luxeboutique.com/products/silk-evening-blazer",
    postType: "Product Spotlight",
    scheduledFor: null,
    status: "Published",
    likes: 1842, comments: 214, shares: 88, reach: 42000,
  },
  {
    caption: "The SS25 Collection is here. Twelve new arrivals exploring the tension between restraint and expression — tailored pieces for those who dress with intention.\n\nExplore the full lookbook now. Link in bio.",
    imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80",
    link: "https://luxeboutique.com/ss25",
    postType: "Collection Launch",
    scheduledFor: null,
    status: "Published",
    likes: 3241, comments: 412, shares: 188, reach: 89000,
  },
  {
    caption: "🖤 EXCLUSIVE OFFER — VIP members receive 20% off the entire Spring Outerwear edit this weekend only. Log in to your account to access your exclusive code before Sunday midnight.",
    imageUrl: "https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800&q=80",
    link: "https://luxeboutique.com/vip",
    postType: "Promotion",
    scheduledFor: "Today 6:00 PM",
    status: "Scheduled",
    likes: 0, comments: 0, shares: 0, reach: 0,
  },
  {
    caption: "Behind the seams: our ateliers work with only the finest European mills. Every thread, every stitch, every detail — chosen with purpose.\n\n#CoutureLuxe #SlowFashion #LuxeAesthetic",
    imageUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80",
    link: null,
    postType: "Brand Story",
    scheduledFor: "Tomorrow 9:00 AM",
    status: "Scheduled",
    likes: 0, comments: 0, shares: 0, reach: 0,
  },
  {
    caption: "New season. New energy. The Cashmere Resort Edit — arriving this Thursday.",
    imageUrl: null,
    link: null,
    postType: "Teaser",
    scheduledFor: null,
    status: "Draft",
    likes: 0, comments: 0, shares: 0, reach: 0,
  },
];

const DEFAULT_TEMPLATES = [
  {
    name: "new_arrival",
    postType: "Product Spotlight",
    body: "✨ NEW ARRIVAL — Introducing the {{product_name}}.\n\n{{product_description}}\n\nAvailable now in {{colours}}. Shop at the link in bio.\n\n#LuxeFashion #NewIn",
  },
  {
    name: "collection_launch",
    postType: "Collection Launch",
    body: "The {{collection_name}} Collection is here.\n\n{{collection_description}}\n\nExplore the full lookbook at the link in bio. #LuxeFashion #{{season}}",
  },
  {
    name: "vip_promotion",
    postType: "Promotion",
    body: "🖤 EXCLUSIVE OFFER — {{offer_detail}}.\n\nLog in to your account to access your code before {{expiry}}.\n\n#LuxeVIP",
  },
  {
    name: "brand_story",
    postType: "Brand Story",
    body: "{{story_intro}}\n\nEvery detail — chosen with purpose.\n\n#CoutureLuxe #SlowFashion #LuxeAesthetic",
  },
  {
    name: "flash_sale",
    postType: "Promotion",
    body: "⚡ FLASH SALE — {{product_name}} is {{discount}}% off for the next {{hours}} hours only. Limited stock. Shop now at the link in bio.\n\n#LuxeSale",
  },
  {
    name: "event_announcement",
    postType: "Event",
    body: "📍 YOU'RE INVITED — Join us at our {{city}} pop-up on {{date}} from {{time}}.\n\n{{event_detail}}\n\nRSVP at the link in bio.",
  },
];

async function seedIfEmpty() {
  const existing = await db.select().from(facebookConnections).limit(1);
  if (existing.length) return;
  await db.insert(facebookConnections).values(DEFAULT_CONNECTIONS);
  await db.insert(facebookCatalogSettings).values([{}]);
  await db.insert(facebookPixelEvents).values(DEFAULT_PIXEL_EVENTS);
  await db.insert(facebookAudiences).values(DEFAULT_AUDIENCES);
}

async function seedPostsIfEmpty() {
  const existing = await db.select().from(facebookPagePosts).limit(1);
  if (existing.length) return;
  await db.insert(facebookPagePosts).values(DEFAULT_POSTS);
  await db.insert(facebookPostTemplates).values(DEFAULT_TEMPLATES);
}

// ── Connections ──────────────────────────────────────────────────────────────

router.get("/connections", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await seedIfEmpty();
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
    await seedIfEmpty();
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
    await seedIfEmpty();
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
    await seedIfEmpty();
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
    await seedPostsIfEmpty();
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
    await seedPostsIfEmpty();
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
