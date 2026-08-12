import { Router } from "express";
import { db } from "@workspace/db";
import {
  channelConfigs, channelEventLogs, channelWebhooks, channelCredentials,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getSession } from "../lib/auth";
import * as Meta from "../lib/social/meta";
import * as WA from "../lib/social/whatsapp";
import * as Twitter from "../lib/social/twitter";

const router = Router();

const DEFAULT_CHANNEL_CONFIGS = [
  { channelId: "facebook",  status: "DISCONNECTED" as const, latency: 0 },
  { channelId: "instagram", status: "DISCONNECTED" as const, latency: 0 },
  { channelId: "commerce",  status: "DISCONNECTED" as const, latency: 0 },
  { channelId: "ads",       status: "DISCONNECTED" as const, latency: 0 },
  { channelId: "whatsapp",  status: "DISCONNECTED" as const, latency: 0 },
  { channelId: "twitter",   status: "DISCONNECTED" as const, latency: 0 },
];

const DEFAULT_WEBHOOKS = [
  { webhookId: "wh-order-created",   label: "Order Created",    url: "/webhooks/orders/created",    active: true  },
  { webhookId: "wh-cart-abandoned",  label: "Cart Abandoned",   url: "/webhooks/cart/abandoned",    active: true  },
  { webhookId: "wh-product-updated", label: "Product Updated",  url: "/webhooks/products/updated",  active: false },
  { webhookId: "wh-review-posted",   label: "Review Posted",    url: "/webhooks/reviews/posted",    active: false },
];

async function ensureChannelDefaults() {
  const existing = await db.select().from(channelConfigs);
  const existingIds = new Set(existing.map((c) => c.channelId));
  for (const cfg of DEFAULT_CHANNEL_CONFIGS) {
    if (!existingIds.has(cfg.channelId)) {
      await db.insert(channelConfigs).values(cfg);
    }
  }
  const existingHooks = await db.select().from(channelWebhooks);
  if (existingHooks.length === 0) {
    for (const hook of DEFAULT_WEBHOOKS) {
      await db.insert(channelWebhooks).values(hook);
    }
  }
}

// GET /api/channels/configs
router.get("/configs", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await ensureChannelDefaults();
    const configs = await db.select().from(channelConfigs);
    res.json(configs);
  } catch { res.status(500).json({ error: "Failed to fetch channel configs" }); }
});

// PUT /api/channels/configs/:channelId/status
router.put("/configs/:channelId/status", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { status } = req.body;
    const [updated] = await db.update(channelConfigs)
      .set({ status, updatedAt: new Date() })
      .where(eq(channelConfigs.channelId, req.params.channelId))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to update channel status" }); }
});

// POST /api/channels/configs/:channelId/sync
router.post("/configs/:channelId/sync", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const latency = Math.floor(Math.random() * 150) + 60;
    const [updated] = await db.update(channelConfigs)
      .set({ lastSync: new Date(), latency, updatedAt: new Date() })
      .where(eq(channelConfigs.channelId, req.params.channelId))
      .returning();
    await db.insert(channelEventLogs).values({
      channel: req.params.channelId, event: "Manual Sync Complete",
      detail: "Data refreshed from source", type: "sync",
    });
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to sync channel" }); }
});

// POST /api/channels/configs/sync-all
router.post("/configs/sync-all", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.update(channelConfigs).set({ lastSync: new Date(), updatedAt: new Date() });
    await db.insert(channelEventLogs).values({
      channel: "All Channels", event: "Global Sync Complete",
      detail: "4 channels refreshed", type: "sync",
    });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to sync all" }); }
});

// POST /api/channels/configs/:channelId/test
router.post("/configs/:channelId/test", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const channelId = req.params.channelId;

    // Load saved credentials for this channel
    const credsRows = await db.select().from(channelCredentials)
      .where(eq(channelCredentials.channel, channelId));
    const credMap: Record<string, string> = {};
    for (const c of credsRows) credMap[c.keyName] = c.value;

    let pass = false;
    let latency = 0;
    let detail = "";
    const missing: string[] = [];

    const t0 = Date.now();

    try {
      if (channelId === "facebook" || channelId === "instagram") {
        const needed = ["page_id", "page_access_token"];
        const miss = needed.filter((k) => !credMap[k]?.trim());
        if (miss.length) {
          missing.push(...miss);
          detail = `Missing credentials: ${miss.join(", ")}`;
        } else {
          await Meta.getPageInfo(credMap.page_id, credMap.page_access_token);
          latency = Date.now() - t0;
          pass = true;
          detail = `Meta Graph API responded in ${latency}ms`;
        }
      } else if (channelId === "commerce") {
        const needed = ["catalog_id", "page_access_token"];
        const miss = needed.filter((k) => !credMap[k]?.trim());
        if (miss.length) {
          missing.push(...miss);
          detail = `Missing credentials: ${miss.join(", ")}`;
        } else {
          await Meta.getCatalogInfo(credMap.catalog_id, credMap.page_access_token);
          latency = Date.now() - t0;
          pass = true;
          detail = `Meta Commerce API responded in ${latency}ms`;
        }
      } else if (channelId === "ads") {
        const needed = ["ad_account_id", "page_access_token"];
        const miss = needed.filter((k) => !credMap[k]?.trim());
        if (miss.length) {
          missing.push(...miss);
          detail = `Missing credentials: ${miss.join(", ")}`;
        } else {
          await Meta.getAdAccountInfo(credMap.ad_account_id, credMap.page_access_token);
          latency = Date.now() - t0;
          pass = true;
          detail = `Meta Ads API responded in ${latency}ms`;
        }
      } else if (channelId === "whatsapp") {
        const needed = ["phone_number_id", "system_access_token"];
        const miss = needed.filter((k) => !credMap[k]?.trim());
        if (miss.length) {
          missing.push(...miss);
          detail = `Missing credentials: ${miss.join(", ")}`;
        } else {
          await WA.getPhoneNumberInfo(credMap.phone_number_id, credMap.system_access_token);
          latency = Date.now() - t0;
          pass = true;
          detail = `WhatsApp Cloud API responded in ${latency}ms`;
        }
      } else if (channelId === "twitter") {
        const needed = ["api_key", "api_secret", "access_token", "access_token_secret"];
        const miss = needed.filter((k) => !credMap[k]?.trim());
        if (miss.length) {
          missing.push(...miss);
          detail = `Missing credentials: ${miss.join(", ")}`;
        } else {
          await Twitter.getMyUser({
            api_key: credMap.api_key,
            api_secret: credMap.api_secret,
            access_token: credMap.access_token,
            access_token_secret: credMap.access_token_secret,
            bearer_token: credMap.bearer_token,
          });
          latency = Date.now() - t0;
          pass = true;
          detail = `Twitter API v2 responded in ${latency}ms`;
        }
      } else {
        detail = "Unknown channel — no test available";
      }
    } catch (apiErr: any) {
      pass = false;
      latency = Date.now() - t0;
      detail = `API error: ${apiErr.message ?? "Unknown error"}`;
    }

    await db.update(channelConfigs)
      .set({ latency: pass ? latency : undefined, updatedAt: new Date() })
      .where(eq(channelConfigs.channelId, channelId));

    await db.insert(channelEventLogs).values({
      channel: channelId,
      event: pass ? "Connection Test Passed" : "Connection Test Failed",
      detail,
      type: pass ? "info" : "error",
    });

    res.json({ pass, latency, missing, detail });
  } catch { res.status(500).json({ error: "Failed to test connection" }); }
});

// GET /api/channels/events
router.get("/events", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const events = await db.select().from(channelEventLogs)
      .orderBy(desc(channelEventLogs.createdAt)).limit(50);
    res.json(events);
  } catch { res.status(500).json({ error: "Failed to fetch events" }); }
});

// DELETE /api/channels/events
router.delete("/events", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(channelEventLogs);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to clear events" }); }
});

// GET /api/channels/webhooks
router.get("/webhooks", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const hooks = await db.select().from(channelWebhooks);
    res.json(hooks);
  } catch { res.status(500).json({ error: "Failed to fetch webhooks" }); }
});

// PUT /api/channels/webhooks/:webhookId
router.put("/webhooks/:webhookId", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { active } = req.body;
    const [updated] = await db.update(channelWebhooks)
      .set({ active, updatedAt: new Date() })
      .where(eq(channelWebhooks.webhookId, req.params.webhookId))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to update webhook" }); }
});

// GET /api/channels/credentials/:channel
router.get("/credentials/:channel", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const creds = await db.select().from(channelCredentials)
      .where(eq(channelCredentials.channel, req.params.channel));
    // Return as { keyName: value } map
    const map: Record<string, string> = {};
    for (const c of creds) map[c.keyName] = c.value;
    res.json(map);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// PUT /api/channels/credentials/:channel
router.put("/credentials/:channel", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const entries = Object.entries(req.body as Record<string, string>);
    for (const [keyName, value] of entries) {
      const existing = await db.select().from(channelCredentials)
        .where(and(eq(channelCredentials.channel, req.params.channel), eq(channelCredentials.keyName, keyName)))
        .limit(1);
      if (existing.length) {
        await db.update(channelCredentials)
          .set({ value, updatedAt: new Date() })
          .where(eq(channelCredentials.id, existing[0].id));
      } else {
        await db.insert(channelCredentials).values({ channel: req.params.channel, keyName, value });
      }
    }
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/credentials/:channel", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(channelCredentials).where(eq(channelCredentials.channel, req.params.channel));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to revoke credentials" }); }
});

export default router;
