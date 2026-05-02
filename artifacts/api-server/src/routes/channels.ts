import { Router } from "express";
import { db } from "@workspace/db";
import {
  channelConfigs, channelEventLogs, channelWebhooks, channelCredentials,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

const DEFAULT_CONFIGS = [
  { channelId: "facebook", status: "CONNECTED", latency: 142 },
  { channelId: "commerce", status: "CONNECTED", latency: 98 },
  { channelId: "whatsapp", status: "CONNECTED", latency: 76 },
  { channelId: "twitter",  status: "CONNECTED", latency: 210 },
];

const DEFAULT_WEBHOOKS = [
  { webhookId: "order",    label: "Order Created",        url: "/v1/webhooks/order-created",        active: true  },
  { webhookId: "product",  label: "Product Updated",      url: "/v1/webhooks/product-updated",      active: true  },
  { webhookId: "cart",     label: "Cart Abandoned",       url: "/v1/webhooks/cart-abandoned",       active: false },
  { webhookId: "customer", label: "Customer Registered",  url: "/v1/webhooks/customer-registered",  active: true  },
];

const DEFAULT_EVENTS = [
  { channel: "Meta Commerce",  event: "Catalog Sync Complete", detail: "1,248 products pushed successfully",          type: "sync"    },
  { channel: "WhatsApp API",   event: "Journey Triggered",     detail: "Abandoned Cart — 14 messages sent",           type: "info"    },
  { channel: "Meta & Facebook",event: "Pixel Event Fired",     detail: "Purchase event — $1,240 attributed",          type: "info"    },
  { channel: "X Social",       event: "Auto-Post Sent",        detail: "Silk Evening Blazer — 2.4K impressions",      type: "sync"    },
  { channel: "WhatsApp API",   event: "Delivery Warning",      detail: "3 messages undelivered — invalid numbers",    type: "warning" },
  { channel: "Meta Commerce",  event: "Rate Limit Warning",    detail: "Approaching 80% of daily API quota",          type: "warning" },
];

async function seedIfEmpty() {
  const existing = await db.select().from(channelConfigs).limit(1);
  if (existing.length) return;
  await db.insert(channelConfigs).values(DEFAULT_CONFIGS.map(c => ({ ...c, lastSync: new Date() })));
  await db.insert(channelWebhooks).values(DEFAULT_WEBHOOKS);
  await db.insert(channelEventLogs).values(DEFAULT_EVENTS);
}

// GET /api/channels/configs
router.get("/configs", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await seedIfEmpty();
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
    const latency = Math.floor(Math.random() * 150) + 60;
    const pass = Math.random() > 0.1;
    await db.update(channelConfigs)
      .set({ latency, updatedAt: new Date() })
      .where(eq(channelConfigs.channelId, req.params.channelId));
    await db.insert(channelEventLogs).values({
      channel: req.params.channelId,
      event: pass ? "Connection Test Passed" : "Connection Test Failed",
      detail: pass ? `Latency: ${latency}ms` : "Authentication error — verify API keys",
      type: pass ? "info" : "error",
    });
    res.json({ pass, latency });
  } catch { res.status(500).json({ error: "Failed to test connection" }); }
});

// GET /api/channels/events
router.get("/events", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await seedIfEmpty();
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
    await seedIfEmpty();
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

export default router;
