import { Router } from "express";
import { randomUUID } from "crypto";
import { addEvent, credentials } from "./channels";

const router = Router();

// ── In-memory store ──────────────────────────────────────────────────────────

interface Connection      { id: string; connectionKey: string; active: boolean; }
interface CatalogSettings { id: string; includedCategories: string[]; minPrice: number; maxPrice: number; }
interface PixelEvent      { id: string; storeEvent: string; fbEvent: string; enabled: boolean; }
interface Audience        { id: string; name: string; size: string; type: string; status: string; }
interface PagePost {
  id: string; caption: string; imageUrl: string | null; link: string | null;
  postType: string; scheduledFor: string | null; status: string;
  likes: number; comments: number; shares: number; reach: number; createdAt: string;
}
interface PostTemplate { id: string; name: string; body: string; postType: string; usageCount: number; }

let connections: Connection[] = [
  { id: randomUUID(), connectionKey: "facebook",  active: false },
  { id: randomUUID(), connectionKey: "instagram", active: false },
  { id: randomUUID(), connectionKey: "pixel",     active: false },
  { id: randomUUID(), connectionKey: "messenger", active: false },
];

let catalog: CatalogSettings = {
  id: randomUUID(),
  includedCategories: ["Ready-to-Wear", "Accessories", "Footwear"],
  minPrice: 0,
  maxPrice: 10000,
};

let pixelEvents: PixelEvent[] = [
  { id: randomUUID(), storeEvent: "Page View",        fbEvent: "PageView",        enabled: true  },
  { id: randomUUID(), storeEvent: "Product Viewed",   fbEvent: "ViewContent",     enabled: true  },
  { id: randomUUID(), storeEvent: "Add to Cart",      fbEvent: "AddToCart",       enabled: true  },
  { id: randomUUID(), storeEvent: "Begin Checkout",   fbEvent: "InitiateCheckout",enabled: true  },
  { id: randomUUID(), storeEvent: "Purchase",         fbEvent: "Purchase",        enabled: true  },
  { id: randomUUID(), storeEvent: "Search",           fbEvent: "Search",          enabled: false },
  { id: randomUUID(), storeEvent: "Wishlist Add",     fbEvent: "AddToWishlist",   enabled: false },
];

let audiences: Audience[] = [
  { id: randomUUID(), name: "Past Customers (180d)", size: "12.4K", type: "Custom",    status: "Active"   },
  { id: randomUUID(), name: "High-Value Lookalike",  size: "2.1M",  type: "Lookalike", status: "Active"   },
  { id: randomUUID(), name: "Cart Abandoners",       size: "3.8K",  type: "Retargeting",status: "Building" },
];

let posts: PagePost[] = [];
let postTemplates: PostTemplate[] = [
  { id: randomUUID(), name: "New Arrival Drop", body: "✨ Just arrived — {product_name}. Crafted for the discerning few. Shop now via our link in bio. #LuxeBoutique #NewArrival", postType: "Product Spotlight", usageCount: 7 },
  { id: randomUUID(), name: "Collection Launch", body: "Introducing The {collection_name} Collection — where precision meets quiet luxury. Available now. #LuxeBoutique", postType: "Collection Launch", usageCount: 3 },
  { id: randomUUID(), name: "Brand Story",       body: "Every thread tells a story. At LUXE BOUTIQUE, we believe in garments that last beyond seasons. Discover our heritage. 🖤", postType: "Brand Story", usageCount: 2 },
];

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

router.get("/facebook/connections", (_req, res) => {
  res.json(connections);
});

router.put("/facebook/connections/:connectionKey", (req, res) => {
  const { connectionKey } = req.params;
  const { active } = req.body as { active: boolean };
  connections = connections.map((c) => c.connectionKey === connectionKey ? { ...c, active } : c);
  res.json(connections.find((c) => c.connectionKey === connectionKey));
});

// ── Catalog ───────────────────────────────────────────────────────────────────

router.get("/facebook/catalog", (_req, res) => {
  res.json(catalog);
});

router.put("/facebook/catalog", (req, res) => {
  catalog = { ...catalog, ...req.body };
  res.json(catalog);
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
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
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
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/facebook/catalog/sync", async (_req, res) => {
  const creds = getFbCreds();
  const catalogId = creds["catalog_id"];
  if (!catalogId) {
    return res.status(400).json({ error: "Missing Commerce Catalog ID — add it in credentials." });
  }
  addEvent("commerce", "Catalog sync requested", "Live catalog sync requires Meta Commerce Manager setup.", "info");
  res.json({ ok: true, synced: 0, message: "Catalog sync queued. Connect Meta Commerce Manager to run live sync." });
});

// ── Pixel Events ───────────────────────────────────────────────────────────────

router.get("/facebook/pixel-events", (_req, res) => {
  res.json(pixelEvents);
});

router.put("/facebook/pixel-events/:id", (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body as { enabled: boolean };
  pixelEvents = pixelEvents.map((e) => e.id === id ? { ...e, enabled } : e);
  res.json(pixelEvents.find((e) => e.id === id));
});

// ── Audiences ─────────────────────────────────────────────────────────────────

router.get("/facebook/audiences", (_req, res) => {
  res.json(audiences);
});

router.post("/facebook/audiences", (req, res) => {
  const { name, type } = req.body as { name: string; type: string };
  const aud: Audience = { id: randomUUID(), name, size: "Building…", type, status: "Building" };
  audiences = [aud, ...audiences];
  addEvent("facebook", `Audience created: ${name}`, "Building audience — this may take 24-48 hours.", "info");
  res.status(201).json(aud);
});

router.put("/facebook/audiences/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  audiences = audiences.map((a) => a.id === id ? { ...a, status } : a);
  res.json(audiences.find((a) => a.id === id));
});

router.delete("/facebook/audiences/:id", (req, res) => {
  audiences = audiences.filter((a) => a.id !== req.params.id);
  res.json({ ok: true });
});

// ── Page Posts ────────────────────────────────────────────────────────────────

router.get("/facebook/posts", (_req, res) => {
  res.json(posts);
});

router.post("/facebook/posts", (req, res) => {
  const { caption, imageUrl, link, postType, scheduledFor, status } = req.body as Partial<PagePost>;
  const post: PagePost = {
    id: randomUUID(),
    caption: caption ?? "",
    imageUrl: imageUrl ?? null,
    link: link ?? null,
    postType: postType ?? "Standard",
    scheduledFor: scheduledFor ?? null,
    status: status ?? "Draft",
    likes: 0, comments: 0, shares: 0, reach: 0,
    createdAt: new Date().toISOString(),
  };
  posts = [post, ...posts];
  addEvent("facebook", `Post ${post.status.toLowerCase()}: ${post.caption.slice(0, 60)}…`, post.status === "Published" ? "Post is live on your Facebook Page." : `Saved as ${post.status.toLowerCase()}.`, "sync");
  res.status(201).json(post);
});

router.post("/facebook/posts/:id/publish", async (req, res) => {
  const { id } = req.params;
  const { pageId, pageAccessToken } = req.body as { pageId?: string; pageAccessToken?: string };
  const post = posts.find((p) => p.id === id);
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
    const updated: PagePost = { ...post, status: "Published" };
    posts = posts.map((p) => p.id === id ? updated : p);
    addEvent("facebook", "Post published to Facebook Page", `Post ID: ${String(data["id"] ?? id)}`, "sync");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/facebook/posts/:id", (req, res) => {
  posts = posts.filter((p) => p.id !== req.params.id);
  res.json({ ok: true });
});

// ── Post Templates ────────────────────────────────────────────────────────────

router.get("/facebook/post-templates", (_req, res) => {
  res.json(postTemplates);
});

router.post("/facebook/post-templates", (req, res) => {
  const { name, body, postType } = req.body as { name: string; body: string; postType: string };
  const tpl: PostTemplate = { id: randomUUID(), name, body, postType: postType ?? "Standard", usageCount: 0 };
  postTemplates = [tpl, ...postTemplates];
  res.status(201).json(tpl);
});

router.put("/facebook/post-templates/:id/use", (req, res) => {
  const { id } = req.params;
  postTemplates = postTemplates.map((t) => t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t);
  res.json(postTemplates.find((t) => t.id === id));
});

// ── Live: Page Info ────────────────────────────────────────────────────────────

router.get("/facebook/page-info", async (_req, res) => {
  const creds = getFbCreds();
  const pageId = creds["page_id"];
  if (!pageId) return res.status(400).json({ error: "Missing Facebook Page ID — add credentials in channel settings." });
  const result = await fbGraphGet(`/${pageId}`, { fields: "name,fan_count,followers_count,link,picture" });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json(result.data);
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
    res.json({ instagram_business_account: data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
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
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
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
    if (!containerRes.ok || !container["id"]) return res.status(400).json({ error: (container as Record<string, Record<string, string>>)["error"]?.message ?? "Container creation failed" });

    await new Promise((r) => setTimeout(r, 3000));

    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container["id"], access_token: token }),
    });
    const published = await publishRes.json() as Record<string, string>;
    if (!publishRes.ok || !published["id"]) return res.status(400).json({ error: (published as Record<string, Record<string, string>>)["error"]?.message ?? "Publish failed" });

    addEvent("instagram", "Post published to Instagram", `Media ID: ${published["id"]}`, "sync");
    res.json({ mediaId: published["id"] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
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
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
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
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
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
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
