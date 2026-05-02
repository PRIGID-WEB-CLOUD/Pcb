import { Router } from "express";
import { db } from "@workspace/db";
import {
  facebookConnections, facebookCatalogSettings,
  facebookPixelEvents, facebookAudiences,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

const DEFAULT_CONNECTIONS = [
  { connectionKey: "facebook",  active: true  },
  { connectionKey: "instagram", active: true  },
  { connectionKey: "pixel",     active: true  },
  { connectionKey: "messenger", active: false },
];

const DEFAULT_PIXEL_EVENTS = [
  { storeEvent: "Product Viewed",   fbEvent: "ViewContent",           enabled: true  },
  { storeEvent: "Add to Cart",      fbEvent: "AddToCart",             enabled: true  },
  { storeEvent: "Checkout Started", fbEvent: "InitiateCheckout",      enabled: true  },
  { storeEvent: "Order Completed",  fbEvent: "Purchase",              enabled: true  },
  { storeEvent: "Wishlist Added",   fbEvent: "AddToWishlist",         enabled: false },
  { storeEvent: "Search Performed", fbEvent: "Search",                enabled: false },
  { storeEvent: "Account Created",  fbEvent: "CompleteRegistration",  enabled: true  },
];

const DEFAULT_AUDIENCES = [
  { name: "Past 30-Day Purchasers", size: "4,820", type: "Custom",     status: "Active"    },
  { name: "Lookalike — Top LTV",    size: "180K",  type: "Lookalike",  status: "Active"    },
  { name: "Cart Abandoners (7d)",   size: "1,240", type: "Retargeting",status: "Active"    },
  { name: "VIP Segment Lookalike",  size: "92K",   type: "Lookalike",  status: "Building"  },
];

async function seedIfEmpty() {
  const existing = await db.select().from(facebookConnections).limit(1);
  if (existing.length) return;
  await db.insert(facebookConnections).values(DEFAULT_CONNECTIONS);
  await db.insert(facebookCatalogSettings).values([{}]);
  await db.insert(facebookPixelEvents).values(DEFAULT_PIXEL_EVENTS);
  await db.insert(facebookAudiences).values(DEFAULT_AUDIENCES);
}

// GET /api/facebook/connections
router.get("/connections", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await seedIfEmpty();
    res.json(await db.select().from(facebookConnections));
  } catch { res.status(500).json({ error: "Failed" }); }
});

// PUT /api/facebook/connections/:key
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

// GET /api/facebook/catalog
router.get("/catalog", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await seedIfEmpty();
    const [settings] = await db.select().from(facebookCatalogSettings).limit(1);
    res.json({ ...settings, includedCategories: JSON.parse(settings.includedCategories) });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// PUT /api/facebook/catalog
router.put("/catalog", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { includedCategories, minPrice, maxPrice } = req.body;
    const [existing] = await db.select().from(facebookCatalogSettings).limit(1);
    const [updated] = await db.update(facebookCatalogSettings)
      .set({
        includedCategories: JSON.stringify(includedCategories),
        minPrice, maxPrice, updatedAt: new Date(),
      })
      .where(eq(facebookCatalogSettings.id, existing.id))
      .returning();
    res.json({ ...updated, includedCategories });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// GET /api/facebook/pixel-events
router.get("/pixel-events", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await seedIfEmpty();
    res.json(await db.select().from(facebookPixelEvents));
  } catch { res.status(500).json({ error: "Failed" }); }
});

// PUT /api/facebook/pixel-events/:id
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

// GET /api/facebook/audiences
router.get("/audiences", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await seedIfEmpty();
    res.json(await db.select().from(facebookAudiences));
  } catch { res.status(500).json({ error: "Failed" }); }
});

// POST /api/facebook/audiences
router.post("/audiences", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { name, type } = req.body;
    const [created] = await db.insert(facebookAudiences).values({ name, type, status: "Building", size: "Building…" }).returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// PUT /api/facebook/audiences/:id
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

// DELETE /api/facebook/audiences/:id
router.delete("/audiences/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(facebookAudiences).where(eq(facebookAudiences.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
