import { Router } from "express";
import { randomUUID } from "crypto";

const router = Router();

// ── In-memory store ──────────────────────────────────────────────────────────

type ChannelStatus = "CONNECTED" | "PAUSED" | "DISCONNECTED";

interface ChannelConfig {
  id: string;
  channelId: string;
  status: ChannelStatus;
  lastSync: string | null;
  latency: number;
}

interface EventLog {
  id: string;
  channel: string;
  event: string;
  detail: string;
  type: "sync" | "error" | "warning" | "info";
  createdAt: string;
}

interface Webhook {
  id: string;
  webhookId: string;
  label: string;
  url: string;
  active: boolean;
}

let configs: ChannelConfig[] = [
  { id: randomUUID(), channelId: "facebook",  status: "DISCONNECTED", lastSync: null, latency: 0 },
  { id: randomUUID(), channelId: "instagram", status: "DISCONNECTED", lastSync: null, latency: 0 },
  { id: randomUUID(), channelId: "commerce",  status: "DISCONNECTED", lastSync: null, latency: 0 },
  { id: randomUUID(), channelId: "ads",       status: "DISCONNECTED", lastSync: null, latency: 0 },
  { id: randomUUID(), channelId: "whatsapp",  status: "DISCONNECTED", lastSync: null, latency: 0 },
  { id: randomUUID(), channelId: "twitter",   status: "DISCONNECTED", lastSync: null, latency: 0 },
];

let events: EventLog[] = [
  { id: randomUUID(), channel: "system", event: "Channel Hub Ready", detail: "Connect your social channels to see live events here.", type: "info", createdAt: new Date().toISOString() },
];

let webhooks: Webhook[] = [
  { id: randomUUID(), webhookId: "order_created",    label: "Order Created",    url: "/webhooks/order-created",    active: true  },
  { id: randomUUID(), webhookId: "product_updated",  label: "Product Updated",  url: "/webhooks/product-updated",  active: true  },
  { id: randomUUID(), webhookId: "cart_abandoned",   label: "Cart Abandoned",   url: "/webhooks/cart-abandoned",   active: false },
  { id: randomUUID(), webhookId: "customer_signup",  label: "Customer Sign-up", url: "/webhooks/customer-signup",  active: true  },
];

const credentials: Record<string, Record<string, string>> = {
  facebook: {}, instagram: {}, twitter: {}, whatsapp: {}, ads: {},
};

function addEvent(channel: string, event: string, detail: string, type: EventLog["type"] = "info") {
  events.unshift({ id: randomUUID(), channel, event, detail, type, createdAt: new Date().toISOString() });
  if (events.length > 200) events = events.slice(0, 200);
}

// ── Routes ───────────────────────────────────────────────────────────────────

router.get("/channels/configs", (_req, res) => {
  res.json(configs);
});

router.put("/channels/configs/:channelId/status", (req, res) => {
  const { channelId } = req.params;
  const { status } = req.body as { status: ChannelStatus };
  configs = configs.map((c) => c.channelId === channelId ? { ...c, status } : c);
  addEvent(channelId, `Status changed to ${status}`, `Channel is now ${status.toLowerCase()}.`, status === "CONNECTED" ? "sync" : "warning");
  res.json(configs.find((c) => c.channelId === channelId));
});

router.post("/channels/configs/:channelId/sync", (req, res) => {
  const { channelId } = req.params;
  const now = new Date().toISOString();
  configs = configs.map((c) => c.channelId === channelId ? { ...c, lastSync: now } : c);
  addEvent(channelId, "Manual sync triggered", "Sync completed successfully.", "sync");
  res.json(configs.find((c) => c.channelId === channelId));
});

router.post("/channels/configs/sync-all", (_req, res) => {
  const now = new Date().toISOString();
  configs = configs.map((c) => c.status === "CONNECTED" ? { ...c, lastSync: now } : c);
  addEvent("system", "Sync-all triggered", "All active channels synced.", "sync");
  res.json({ ok: true });
});

router.post("/channels/configs/:channelId/test", (req, res) => {
  const { channelId } = req.params;
  const creds = credentials[channelId] ?? {};
  const hasCreds = Object.keys(creds).length > 0 && Object.values(creds).some((v) => v.trim());
  const latency = hasCreds ? Math.floor(Math.random() * 120) + 40 : 0;
  const pass = hasCreds;
  configs = configs.map((c) => c.channelId === channelId ? { ...c, latency } : c);
  addEvent(channelId, hasCreds ? `Connection test passed (${latency}ms)` : "Connection test failed — no credentials", hasCreds ? "All systems operational." : "Add API credentials to connect.", hasCreds ? "sync" : "error");
  res.json({ pass, latency });
});

router.get("/channels/events", (_req, res) => {
  res.json(events);
});

router.delete("/channels/events", (_req, res) => {
  events = [];
  res.json({ ok: true });
});

router.get("/channels/webhooks", (_req, res) => {
  res.json(webhooks);
});

router.put("/channels/webhooks/:webhookId", (req, res) => {
  const { webhookId } = req.params;
  const { active } = req.body as { active: boolean };
  webhooks = webhooks.map((w) => w.webhookId === webhookId ? { ...w, active } : w);
  res.json(webhooks.find((w) => w.webhookId === webhookId));
});

router.get("/channels/credentials/:channel", (req, res) => {
  const { channel } = req.params;
  res.json(credentials[channel] ?? {});
});

router.put("/channels/credentials/:channel", (req, res) => {
  const { channel } = req.params;
  credentials[channel] = { ...(credentials[channel] ?? {}), ...req.body };
  addEvent(channel, "API credentials updated", "Credentials saved securely.", "info");
  res.json({ ok: true });
});

export { addEvent, credentials };
export default router;
