import { Router } from "express";
import { randomUUID } from "crypto";
import { addEvent, credentials } from "./channels";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  db, productsTable, categoriesTable,
  facebookConnectionsTable, facebookCatalogSettingsTable, facebookPixelEventsTable,
  facebookAudiencesTable, facebookPagePostsTable, facebookPostTemplatesTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();
router.use(requireAdmin);

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFbCreds() { return credentials["facebook"] ?? {}; }

async function fbGraphGet(path: string, params: Record<string, string> = {}): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const creds = getFbCreds();
  const token = creds["page_access_token"];
  if (!token) return { ok: false, error: "Missing Facebook credentials — add Page Access Token in channel settings." };
  const url = new URL(`https://graph.facebook.com/v21.0${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const r = await fetch(url.toString());
    const body = await r.json() as Record<string, unknown>;
    if (!r.ok || body["error"]) return { ok: false, error: (body["error"] as Record<string, string>)?.message ?? `HTTP ${r.status}` };
    return { ok: true, data: body };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── Connections ───────────────────────────────────────────────────────────────

router.get("/facebook/connections", async (_req, res) => {
  const keys = ["facebook", "instagram", "pixel", "messenger"];
  const rows = await Promise.all(keys.map(async (connectionKey) => {
    const [row] = await db.select().from(facebookConnectionsTable)
      .where(eq(facebookConnectionsTable.connectionKey, connectionKey)).limit(1);
    if (row) return row;
    const [created] = await db.insert(facebookConnectionsTable)
      .values({ id: randomUUID(), connectionKey, active: false }).returning();
    return created;
  }));
  return res.json(rows);
});

router.put("/facebook/connections/:connectionKey", async (req, res) => {
  const connectionKey = req.params.connectionKey as string;
  const { active } = req.body as { active: boolean };
  const [updated] = await db.insert(facebookConnectionsTable)
    .values({ id: randomUUID(), connectionKey, active: Boolean(active) })
    .onConflictDoUpdate({
      target: facebookConnectionsTable.connectionKey,
      set: { active: Boolean(active), updatedAt: new Date() },
    }).returning();
  return res.json(updated);
});

// ── Catalog ───────────────────────────────────────────────────────────────────

router.get("/facebook/catalog", async (_req, res) => {
  const [catalog] = await db.select().from(facebookCatalogSettingsTable)
    .where(eq(facebookCatalogSettingsTable.id, "default")).limit(1);
  return res.json(catalog ?? { id: "default", includedCategories: [], minPrice: 0, maxPrice: 10000 });
});

router.put("/facebook/catalog", async (req, res) => {
  const [catalog] = await db.insert(facebookCatalogSettingsTable).values({
    id: "default",
    includedCategories: Array.isArray(req.body.includedCategories) ? req.body.includedCategories : [],
    minPrice: Number(req.body.minPrice ?? 0),
    maxPrice: Number(req.body.maxPrice ?? 10000),
  }).onConflictDoUpdate({
    target: facebookCatalogSettingsTable.id,
    set: {
      includedCategories: Array.isArray(req.body.includedCategories) ? req.body.includedCategories : [],
      minPrice: Number(req.body.minPrice ?? 0),
      maxPrice: Number(req.body.maxPrice ?? 10000),
      updatedAt: new Date(),
    },
  }).returning();
  return res.json(catalog);
});

router.get("/facebook/catalog/info", async (_req, res) => {
  const creds = credentials["commerce"] ?? {};
  const fbCreds = getFbCreds();
  const catalogId = creds["catalog_id"] || fbCreds["catalog_id"];
  const token = creds["page_access_token"] || fbCreds["page_access_token"];
  if (!catalogId || !token) return res.status(400).json({ error: "Missing Commerce credentials — add Catalog ID and Page Access Token." });
  const url = new URL(`https://graph.facebook.com/v21.0/${catalogId}`);
  url.searchParams.set("fields", "id,name,product_count,vertical,description");
  url.searchParams.set("access_token", token);
  try {
    const r = await fetch(url.toString());
    const data = await r.json() as Record<string, unknown>;
    if (!r.ok || data["error"]) return res.status(400).json({ error: (data["error"] as Record<string, string>)?.message ?? `HTTP ${r.status}` });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get("/facebook/catalog/products", async (_req, res) => {
  const creds = credentials["commerce"] ?? {};
  const fbCreds = getFbCreds();
  const catalogId = creds["catalog_id"] || fbCreds["catalog_id"];
  const token = creds["page_access_token"] || fbCreds["page_access_token"];
  if (!catalogId || !token) return res.status(400).json({ error: "Missing Commerce credentials — add Catalog ID and Page Access Token." });
  const url = new URL(`https://graph.facebook.com/v21.0/${catalogId}/products`);
  url.searchParams.set("fields", "id,name,price,currency,availability,condition,retailer_id,image_url,product_type");
  url.searchParams.set("limit", "50");
  url.searchParams.set("access_token", token);
  try {
    const r = await fetch(url.toString());
    const data = await r.json() as Record<string, unknown>;
    if (!r.ok || data["error"]) return res.status(400).json({ error: (data["error"] as Record<string, string>)?.message ?? `HTTP ${r.status}` });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post("/facebook/catalog/sync", async (req, res) => {
  const commerceCreds = credentials["commerce"] ?? {};
  const fbCreds = getFbCreds();
  const catalogId = commerceCreds["catalog_id"] || fbCreds["catalog_id"];
  const token = commerceCreds["page_access_token"] || fbCreds["page_access_token"];
  const storeDomain = (req.body as { storeDomain?: string }).storeDomain ?? process.env["REPLIT_DEV_DOMAIN"] ?? "luxeboutique.com";

  if (!catalogId || !token) {
    return res.status(400).json({ error: "Missing Commerce credentials — add Catalog ID and Page Access Token in channel settings." });
  }

  // Fetch active products with their categories from the DB
  const rows = await db
    .select({
      id:          productsTable.id,
      name:        productsTable.name,
      description: productsTable.description,
      price:       productsTable.price,
      stock:       productsTable.stock,
      imageUrl:    productsTable.imageUrl,
      status:      productsTable.status,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.status, "ACTIVE"));

  if (rows.length === 0) {
    return res.status(400).json({ error: "No active products found to sync." });
  }

  // Build Facebook Catalog Batch API payload
  const requests = rows.map((p) => ({
    method: "UPDATE",
    retailer_id: p.id,
    data: {
      title:        p.name,
      description:  p.description || p.name,
      availability: (p.stock ?? 0) > 0 ? "in stock" : "out of stock",
      condition:    "new",
      price:        `${p.price} GBP`,
      link:         `https://${storeDomain}/products/${p.id}`,
      image_link:   p.imageUrl ?? `https://${storeDomain}/placeholder.jpg`,
      brand:        "LUXE BOUTIQUE",
      google_product_category: p.categoryName ?? "Apparel & Accessories",
    },
  }));

  // Push in batches of 50 (Facebook API limit per request)
  const BATCH = 50;
  let totalSynced = 0;
  const errors: string[] = [];

  for (let i = 0; i < requests.length; i += BATCH) {
    const chunk = requests.slice(i, i + BATCH);
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${catalogId}/items_batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token, item_type: "PRODUCT_ITEM", requests: chunk }),
      });
      const data = await r.json() as Record<string, unknown>;
      if (!r.ok || data["error"]) {
        errors.push((data["error"] as Record<string, string>)?.message ?? `HTTP ${r.status}`);
      } else {
        totalSynced += chunk.length;
      }
    } catch (err) {
      errors.push(String(err));
    }
  }

  if (errors.length > 0) {
    addEvent("commerce", `Catalog sync failed (${errors.length} error${errors.length > 1 ? "s" : ""})`, errors[0]!, "error");
    return res.status(400).json({ ok: false, synced: totalSynced, errors });
  }

  addEvent("commerce", `Catalog synced — ${totalSynced} product${totalSynced !== 1 ? "s" : ""} pushed`, `Live data pushed to Facebook Catalog ${catalogId}.`, "sync");
  return res.json({ ok: true, synced: totalSynced, catalogId, message: `Successfully synced ${totalSynced} product${totalSynced !== 1 ? "s" : ""} to your Facebook catalog.` });
});

// ── Pixel Events ───────────────────────────────────────────────────────────────

router.get("/facebook/pixel-events", async (_req, res) => {
  return res.json(await db.select().from(facebookPixelEventsTable).orderBy(desc(facebookPixelEventsTable.updatedAt)));
});

router.put("/facebook/pixel-events/:id", async (req, res) => {
  const { enabled } = req.body as { enabled: boolean };
  const [updated] = await db.update(facebookPixelEventsTable)
    .set({ enabled: Boolean(enabled), updatedAt: new Date() })
    .where(eq(facebookPixelEventsTable.id, req.params.id as string)).returning();
  if (!updated) return res.status(404).json({ error: "Pixel event not found" });
  return res.json(updated);
});

// ── Audiences ─────────────────────────────────────────────────────────────────

router.get("/facebook/audiences", async (_req, res) => {
  return res.json(await db.select().from(facebookAudiencesTable).orderBy(desc(facebookAudiencesTable.createdAt)));
});

router.post("/facebook/audiences", async (req, res) => {
  const { name, type } = req.body as { name: string; type: string };
  const [aud] = await db.insert(facebookAudiencesTable)
    .values({ id: randomUUID(), name, type, size: "Building…", status: "Building" }).returning();
  addEvent("facebook", `Audience created: ${name}`, "Building audience — this may take 24-48 hours.", "info");
  return res.status(201).json(aud);
});

router.put("/facebook/audiences/:id", async (req, res) => {
  const { status } = req.body as { status: string };
  const [updated] = await db.update(facebookAudiencesTable).set({ status })
    .where(eq(facebookAudiencesTable.id, req.params.id as string)).returning();
  if (!updated) return res.status(404).json({ error: "Audience not found" });
  return res.json(updated);
});

router.delete("/facebook/audiences/:id", async (req, res) => {
  await db.delete(facebookAudiencesTable).where(eq(facebookAudiencesTable.id, req.params.id as string));
  return res.json({ ok: true });
});

// ── Page Posts ────────────────────────────────────────────────────────────────

router.get("/facebook/posts", async (_req, res) => {
  return res.json(await db.select().from(facebookPagePostsTable).orderBy(desc(facebookPagePostsTable.createdAt)));
});

router.post("/facebook/posts", async (req, res) => {
  const { caption, imageUrl, link, postType, scheduledFor, status } = req.body as { caption?: string; imageUrl?: string; link?: string; postType?: string; scheduledFor?: string; status?: string };
  const [post] = await db.insert(facebookPagePostsTable).values({
    id: randomUUID(),
    caption: caption ?? "",
    imageUrl: imageUrl ?? null,
    link: link ?? null,
    postType: postType ?? "Standard",
    scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    status: status ?? "Draft",
  }).returning();
  addEvent("facebook", `Post ${post.status.toLowerCase()}: ${post.caption.slice(0, 60)}…`, post.status === "Published" ? "Post is live on your Facebook Page." : `Saved as ${post.status.toLowerCase()}.`, "sync");
  return res.status(201).json(post);
});

router.post("/facebook/posts/:id/publish", async (req, res) => {
  const id = req.params.id as string;
  const { pageId, pageAccessToken } = req.body as { pageId?: string; pageAccessToken?: string };
  const [post] = await db.select().from(facebookPagePostsTable)
    .where(eq(facebookPagePostsTable.id, id)).limit(1);
  if (!post) return res.status(404).json({ error: "Post not found" });

  if (!pageId || !pageAccessToken) {
    return res.status(400).json({ error: "Missing pageId or pageAccessToken — add Facebook credentials first." });
  }

  const url = new URL(`https://graph.facebook.com/v21.0/${pageId}/feed`);
  try {
    const body: Record<string, string> = { message: post.caption, access_token: pageAccessToken };
    if (post.link) body["link"] = post.link;
    const r = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json() as Record<string, unknown>;
    if (!r.ok || data["error"]) {
      const errMsg = (data["error"] as Record<string, string>)?.message ?? `HTTP ${r.status}`;
      return res.status(400).json({ error: errMsg });
    }
    const [updated] = await db.update(facebookPagePostsTable).set({ status: "Published" })
      .where(eq(facebookPagePostsTable.id, id)).returning();
    addEvent("facebook", "Post published to Facebook Page", `Post ID: ${String(data["id"] ?? id)}`, "sync");
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.delete("/facebook/posts/:id", async (req, res) => {
  await db.delete(facebookPagePostsTable).where(eq(facebookPagePostsTable.id, req.params.id as string));
  return res.json({ ok: true });
});

// ── Post Templates ────────────────────────────────────────────────────────────

router.get("/facebook/post-templates", async (_req, res) => {
  return res.json(await db.select().from(facebookPostTemplatesTable).orderBy(desc(facebookPostTemplatesTable.createdAt)));
});

router.post("/facebook/post-templates", async (req, res) => {
  const { name, body, postType } = req.body as { name: string; body: string; postType: string };
  const [tpl] = await db.insert(facebookPostTemplatesTable)
    .values({ id: randomUUID(), name, body, postType: postType ?? "Standard" }).returning();
  return res.status(201).json(tpl);
});

router.put("/facebook/post-templates/:id/use", async (req, res) => {
  const [tpl] = await db.select().from(facebookPostTemplatesTable)
    .where(eq(facebookPostTemplatesTable.id, req.params.id as string)).limit(1);
  if (!tpl) return res.status(404).json({ error: "Template not found" });
  const [updated] = await db.update(facebookPostTemplatesTable)
    .set({ usageCount: tpl.usageCount + 1 })
    .where(eq(facebookPostTemplatesTable.id, tpl.id)).returning();
  return res.json(updated);
});

// ── Live: Page Info ────────────────────────────────────────────────────────────

router.get("/facebook/page-info", async (_req, res) => {
  const creds = getFbCreds();
  const pageId = creds["page_id"];
  if (!pageId) return res.status(400).json({ error: "Missing Facebook Page ID — add credentials in channel settings." });
  const result = await fbGraphGet(`/${pageId}`, { fields: "name,fan_count,followers_count,link,picture" });
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.json(result.data);
});

// ── Live: Instagram ────────────────────────────────────────────────────────────

router.get("/facebook/instagram/account", async (_req, res) => {
  const igCreds = credentials["instagram"] ?? {};
  const fbCreds = getFbCreds();
  const igUserId = igCreds["ig_user_id"];
  const token = igCreds["page_access_token"] || fbCreds["page_access_token"];
  if (!igUserId || !token) return res.status(400).json({ error: "Missing Instagram credentials — add IG Business Account ID and Page Access Token." });
  const url = new URL(`https://graph.facebook.com/v21.0/${igUserId}`);
  url.searchParams.set("fields", "name,username,profile_picture_url,followers_count,media_count,biography,website");
  url.searchParams.set("access_token", token);
  try {
    const r = await fetch(url.toString());
    const data = await r.json() as Record<string, unknown>;
    if (!r.ok || data["error"]) return res.status(400).json({ error: (data["error"] as Record<string, string>)?.message ?? `HTTP ${r.status}` });
    return res.json({ instagram_business_account: data });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get("/facebook/instagram/media", async (_req, res) => {
  const igCreds = credentials["instagram"] ?? {};
  const fbCreds = getFbCreds();
  const igUserId = igCreds["ig_user_id"];
  const token = igCreds["page_access_token"] || fbCreds["page_access_token"];
  if (!igUserId || !token) return res.status(400).json({ error: "Missing Instagram credentials." });
  const url = new URL(`https://graph.facebook.com/v21.0/${igUserId}/media`);
  url.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink");
  url.searchParams.set("limit", "24");
  url.searchParams.set("access_token", token);
  try {
    const r = await fetch(url.toString());
    const data = await r.json() as Record<string, unknown>;
    if (!r.ok || data["error"]) return res.status(400).json({ error: (data["error"] as Record<string, string>)?.message ?? `HTTP ${r.status}` });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post("/facebook/instagram/publish", async (req, res) => {
  const igCreds = credentials["instagram"] ?? {};
  const fbCreds = getFbCreds();
  const igUserId = igCreds["ig_user_id"];
  const token = igCreds["page_access_token"] || fbCreds["page_access_token"];
  const { imageUrl, caption } = req.body as { imageUrl: string; caption?: string };
  if (!igUserId || !token) return res.status(400).json({ error: "Missing Instagram credentials." });
  if (!imageUrl) return res.status(400).json({ error: "imageUrl is required." });
  try {
    const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, caption: caption ?? "", access_token: token }),
    });
    const container = await containerRes.json() as Record<string, string>;
    if (!containerRes.ok || !container["id"]) return res.status(400).json({ error: (container as any)["error"]?.message ?? "Container creation failed" });

    await new Promise((r) => setTimeout(r, 3000));

    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container["id"], access_token: token }),
    });
    const published = await publishRes.json() as Record<string, string>;
    if (!publishRes.ok || !published["id"]) return res.status(400).json({ error: (published as any)["error"]?.message ?? "Publish failed" });

    addEvent("instagram", "Post published to Instagram", `Media ID: ${published["id"]}`, "sync");
    return res.json({ mediaId: published["id"] });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── Live: Meta Ads ─────────────────────────────────────────────────────────────

router.get("/facebook/ads/account", async (_req, res) => {
  const adsCreds = credentials["ads"] ?? {};
  const fbCreds = getFbCreds();
  const adAccountId = adsCreds["ad_account_id"] || fbCreds["ad_account_id"];
  const token = adsCreds["page_access_token"] || fbCreds["page_access_token"];
  if (!adAccountId || !token) return res.status(400).json({ error: "Missing ad account credentials — add Ad Account ID and Page Access Token." });
  const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const url = new URL(`https://graph.facebook.com/v21.0/${actId}`);
  url.searchParams.set("fields", "id,name,currency,account_status,amount_spent,balance,spend_cap");
  url.searchParams.set("access_token", token);
  try {
    const r = await fetch(url.toString());
    const data = await r.json() as Record<string, unknown>;
    if (!r.ok || data["error"]) return res.status(400).json({ error: (data["error"] as Record<string, string>)?.message ?? `HTTP ${r.status}` });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get("/facebook/ads/insights", async (req, res) => {
  const adsCreds = credentials["ads"] ?? {};
  const fbCreds = getFbCreds();
  const adAccountId = adsCreds["ad_account_id"] || fbCreds["ad_account_id"];
  const token = adsCreds["page_access_token"] || fbCreds["page_access_token"];
  if (!adAccountId || !token) return res.status(400).json({ error: "Missing ad account credentials." });
  const preset = (req.query["date_preset"] ?? req.query["preset"] ?? "last_7d") as string;
  const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const url = new URL(`https://graph.facebook.com/v21.0/${actId}/insights`);
  url.searchParams.set("fields", "spend,impressions,clicks,reach,ctr,cpc,frequency");
  url.searchParams.set("date_preset", preset);
  url.searchParams.set("access_token", token);
  try {
    const r = await fetch(url.toString());
    const data = await r.json() as Record<string, unknown>;
    if (!r.ok || data["error"]) return res.status(400).json({ error: (data["error"] as Record<string, string>)?.message ?? `HTTP ${r.status}` });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get("/facebook/ads/campaigns", async (_req, res) => {
  const adsCreds = credentials["ads"] ?? {};
  const fbCreds = getFbCreds();
  const adAccountId = adsCreds["ad_account_id"] || fbCreds["ad_account_id"];
  const token = adsCreds["page_access_token"] || fbCreds["page_access_token"];
  if (!adAccountId || !token) return res.status(400).json({ error: "Missing ad account credentials." });
  const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const url = new URL(`https://graph.facebook.com/v21.0/${actId}/campaigns`);
  url.searchParams.set("fields", "id,name,status,objective,budget_remaining,daily_budget,lifetime_budget");
  url.searchParams.set("access_token", token);
  try {
    const r = await fetch(url.toString());
    const data = await r.json() as Record<string, unknown>;
    if (!r.ok || data["error"]) return res.status(400).json({ error: (data["error"] as Record<string, string>)?.message ?? `HTTP ${r.status}` });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
