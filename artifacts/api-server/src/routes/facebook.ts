import { Router } from "express";
import { db } from "@workspace/db";
import {
  facebookConnections, facebookCatalogSettings,
  facebookPixelEvents, facebookAudiences,
  facebookPagePosts, facebookPostTemplates, products, categories,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../lib/auth";
import { getCredMap, missingCreds } from "../lib/social/credentials";
import * as Meta from "../lib/social/meta";

const router = Router();

const FACEBOOK_CREDS = ["page_id", "app_id", "app_secret", "page_access_token"];
const INSTAGRAM_CREDS = ["page_id", "page_access_token"];
const CATALOG_CREDS = ["catalog_id", "page_access_token"];
const ADS_CREDS = ["ad_account_id", "page_access_token"];

async function adminOnly(req: any, res: any): Promise<boolean> {
  const user = await getSession(req);
  if (!user || user.role !== "ADMIN") { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

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
    if (!await adminOnly(req, res)) return;
    let rows = await db.select().from(facebookConnections);
    if (!rows.length) {
      rows = await db.insert(facebookConnections).values(DEFAULT_CONNECTIONS).returning();
    }
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/connections/:key", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [updated] = await db.update(facebookConnections)
      .set({ active: req.body.active, updatedAt: new Date() })
      .where(eq(facebookConnections.connectionKey, req.params.key))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Page Info (real Graph API) ────────────────────────────────────────────────

router.get("/page-info", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("facebook", FACEBOOK_CREDS);
    const missing = missingCreds(creds, ["page_id", "page_access_token"]);
    if (missing.length) {
      res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing });
      return;
    }
    const info = await Meta.getPageInfo(creds.page_id, creds.page_access_token);
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch page info" });
  }
});

// ── Live Page Posts (real Graph API) ─────────────────────────────────────────

router.get("/page-posts/live", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("facebook", FACEBOOK_CREDS);
    const missing = missingCreds(creds, ["page_id", "page_access_token"]);
    if (missing.length) {
      res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing });
      return;
    }
    const data = await Meta.getPagePosts(creds.page_id, creds.page_access_token);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch live posts" });
  }
});

// ── Catalog ──────────────────────────────────────────────────────────────────

router.get("/catalog", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    let [settings] = await db.select().from(facebookCatalogSettings).limit(1);
    if (!settings) {
      [settings] = await db.insert(facebookCatalogSettings).values({}).returning();
    }
    res.json({ ...settings, includedCategories: JSON.parse(settings.includedCategories) });
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/catalog", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const { includedCategories, minPrice, maxPrice } = req.body;
    let [existing] = await db.select().from(facebookCatalogSettings).limit(1);
    if (!existing) {
      [existing] = await db.insert(facebookCatalogSettings).values({}).returning();
    }
    const [updated] = await db.update(facebookCatalogSettings)
      .set({ includedCategories: JSON.stringify(includedCategories), minPrice, maxPrice, updatedAt: new Date() })
      .where(eq(facebookCatalogSettings.id, existing.id))
      .returning();
    res.json({ ...updated, includedCategories });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Catalog: real Meta Commerce sync ─────────────────────────────────────────

router.get("/catalog/info", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("commerce", CATALOG_CREDS);
    const missing = missingCreds(creds, ["catalog_id", "page_access_token"]);
    if (missing.length) {
      res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing });
      return;
    }
    const info = await Meta.getCatalogInfo(creds.catalog_id, creds.page_access_token);
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch catalog info" });
  }
});

router.post("/catalog/sync", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("commerce", CATALOG_CREDS);
    const missing = missingCreds(creds, ["catalog_id", "page_access_token"]);
    if (missing.length) {
      res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing });
      return;
    }

    const [settings] = await db.select().from(facebookCatalogSettings).limit(1);
    const cats: string[] = settings ? JSON.parse(settings.includedCategories) : [];

    const allProducts = await db
      .select({ p: products, c: categories })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id));

    const filtered = allProducts.filter(({ p, c }) => {
      if (!cats.length) return true;
      return c && cats.includes(c.name);
    });

    const requests = filtered.map(({ p }) => ({
      method: "UPDATE",
      retailer_id: p.id,
      data: {
        name: p.name,
        description: p.description,
        price: `${Math.round(p.price * 100)} USD`,
        availability: "in stock",
        condition: "new",
        image_url: p.imageUrl ?? "",
        url: `${process.env.STORE_URL ?? "https://example.com"}/products/${p.id}`,
      },
    }));

    const result = await Meta.batchUpdateCatalog(creds.catalog_id, creds.page_access_token, requests);
    res.json({ synced: requests.length, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Catalog sync failed" });
  }
});

// ── Pixel Events ─────────────────────────────────────────────────────────────

router.get("/pixel-events", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    let rows = await db.select().from(facebookPixelEvents);
    if (!rows.length) {
      rows = await db.insert(facebookPixelEvents).values(DEFAULT_PIXEL_EVENTS).returning();
    }
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/pixel-events/:id", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
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
    if (!await adminOnly(req, res)) return;
    let rows = await db.select().from(facebookAudiences);
    if (!rows.length) {
      rows = await db.insert(facebookAudiences).values(DEFAULT_AUDIENCES).returning();
    }
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/audiences", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [created] = await db.insert(facebookAudiences)
      .values({ name: req.body.name, type: req.body.type, status: "Building", size: "Building…" })
      .returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/audiences/:id", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [updated] = await db.update(facebookAudiences)
      .set({ status: req.body.status })
      .where(eq(facebookAudiences.id, req.params.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/audiences/:id", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    await db.delete(facebookAudiences).where(eq(facebookAudiences.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Page Posts (local DB) ─────────────────────────────────────────────────────

router.get("/posts", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    res.json(await db.select().from(facebookPagePosts).orderBy(desc(facebookPagePosts.createdAt)));
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/posts", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const { caption, imageUrl, link, postType, scheduledFor, status } = req.body;
    const [created] = await db.insert(facebookPagePosts)
      .values({ caption, imageUrl: imageUrl || null, link: link || null, postType, scheduledFor: scheduledFor || null, status: status || "Draft" })
      .returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/posts/:id", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const { caption, imageUrl, link, postType, scheduledFor, status } = req.body;
    const [updated] = await db.update(facebookPagePosts)
      .set({ caption, imageUrl: imageUrl || null, link: link || null, postType, scheduledFor: scheduledFor || null, status })
      .where(eq(facebookPagePosts.id, req.params.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/posts/:id", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    await db.delete(facebookPagePosts).where(eq(facebookPagePosts.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// POST /api/facebook/posts/:id/publish — real Facebook Graph API
router.post("/posts/:id/publish", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("facebook", FACEBOOK_CREDS);
    const pageId = (req.body.pageId as string) || creds.page_id;
    const accessToken = (req.body.pageAccessToken as string) || creds.page_access_token;

    if (!pageId || !accessToken) {
      res.status(400).json({ error: "Missing Facebook Page ID or access token. Add them in Credentials." });
      return;
    }

    const [post] = await db.select().from(facebookPagePosts).where(eq(facebookPagePosts.id, req.params.id)).limit(1);
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }

    const result = await Meta.publishPagePost(pageId, accessToken, post.caption, post.link ?? undefined);
    const [updated] = await db.update(facebookPagePosts)
      .set({ status: "Published", scheduledFor: null })
      .where(eq(facebookPagePosts.id, req.params.id))
      .returning();
    res.json({ post: updated, fbResult: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Publish failed" });
  }
});

// ── Post Templates ────────────────────────────────────────────────────────────

router.get("/post-templates", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    res.json(await db.select().from(facebookPostTemplates).orderBy(desc(facebookPostTemplates.usageCount)));
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/post-templates", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [created] = await db.insert(facebookPostTemplates)
      .values({ name: req.body.name.toLowerCase().replace(/\s+/g, "_"), body: req.body.body, postType: req.body.postType || "Standard" })
      .returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/post-templates/:id/use", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [tpl] = await db.select().from(facebookPostTemplates).where(eq(facebookPostTemplates.id, req.params.id)).limit(1);
    const [updated] = await db.update(facebookPostTemplates)
      .set({ usageCount: (tpl?.usageCount ?? 0) + 1 })
      .where(eq(facebookPostTemplates.id, req.params.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Instagram (via Page Access Token) ────────────────────────────────────────

router.get("/instagram/account", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("facebook", INSTAGRAM_CREDS);
    const missing = missingCreds(creds, ["page_id", "page_access_token"]);
    if (missing.length) { res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing }); return; }
    const data = await Meta.getInstagramAccountFromPage(creds.page_id, creds.page_access_token);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch Instagram account" });
  }
});

router.get("/instagram/media", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("instagram", ["ig_user_id", "page_access_token"]);
    const missing = missingCreds(creds, ["ig_user_id", "page_access_token"]);
    if (missing.length) { res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing }); return; }
    const data = await Meta.getInstagramMedia(creds.ig_user_id, creds.page_access_token);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch Instagram media" });
  }
});

router.post("/instagram/publish", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("instagram", ["ig_user_id", "page_access_token"]);
    const missing = missingCreds(creds, ["ig_user_id", "page_access_token"]);
    if (missing.length) { res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing }); return; }

    const { imageUrl, caption, mediaType = "IMAGE" } = req.body;
    if (!imageUrl) { res.status(400).json({ error: "imageUrl is required" }); return; }

    const container = await Meta.createInstagramMediaContainer(creds.ig_user_id, creds.page_access_token, {
      image_url: imageUrl,
      caption,
      media_type: mediaType,
    });

    await new Promise((r) => setTimeout(r, 3000));

    const published = await Meta.publishInstagramMedia(creds.ig_user_id, creds.page_access_token, (container as any).id);
    res.json({ ok: true, mediaId: (published as any).id, containerId: (container as any).id });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Instagram publish failed" });
  }
});

// ── Meta Ads Insights (real Graph API) ───────────────────────────────────────

router.get("/ads/insights", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("ads", ADS_CREDS);
    const missing = missingCreds(creds, ["ad_account_id", "page_access_token"]);
    if (missing.length) { res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing }); return; }
    const datePreset = (req.query.date_preset as string) || "last_30d";
    const data = await Meta.getAdAccountInsights(creds.ad_account_id, creds.page_access_token, datePreset);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch ad insights" });
  }
});

router.get("/ads/campaigns", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("ads", ADS_CREDS);
    const missing = missingCreds(creds, ["ad_account_id", "page_access_token"]);
    if (missing.length) { res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing }); return; }
    const data = await Meta.getCampaigns(creds.ad_account_id, creds.page_access_token);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch campaigns" });
  }
});

router.get("/ads/account", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("ads", ADS_CREDS);
    const missing = missingCreds(creds, ["ad_account_id", "page_access_token"]);
    if (missing.length) { res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing }); return; }
    const data = await Meta.getAdAccountInfo(creds.ad_account_id, creds.page_access_token);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch ad account info" });
  }
});

export default router;
