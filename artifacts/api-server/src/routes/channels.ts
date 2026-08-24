import { Router } from "express";
import { randomUUID } from "crypto";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  db,
  channelCredentialsTable,
  channelConfigsTable,
  channelEventLogsTable,
  channelWebhooksTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();
router.use(requireAdmin);

type ChannelStatus = "CONNECTED" | "PAUSED" | "DISCONNECTED";
type EventType = "sync" | "error" | "warning" | "info";

const CHANNELS = ["facebook", "instagram", "commerce", "ads", "whatsapp", "twitter"] as const;
const DEFAULT_WEBHOOKS = [
  { webhookId: "order_created", label: "Order Created", url: "/webhooks/order-created", active: true },
  { webhookId: "product_updated", label: "Product Updated", url: "/webhooks/product-updated", active: true },
  { webhookId: "cart_abandoned", label: "Cart Abandoned", url: "/webhooks/cart-abandoned", active: false },
  { webhookId: "customer_signup", label: "Customer Sign-up", url: "/webhooks/customer-signup", active: true },
];

export async function getChannelCredentials(channel: string): Promise<Record<string, string>> {
  const [row] = await db.select().from(channelCredentialsTable)
    .where(eq(channelCredentialsTable.channel, channel)).limit(1);
  return row?.data ?? {};
}

async function persistCredentials(channel: string, data: Record<string, string>) {
  await db.insert(channelCredentialsTable)
    .values({ channel, data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: channelCredentialsTable.channel,
      set: { data, updatedAt: new Date() },
    });
}

async function ensureDefaults() {
  for (const channelId of CHANNELS) {
    await db.insert(channelConfigsTable)
      .values({ id: randomUUID(), channelId, status: "DISCONNECTED", latency: 0 })
      .onConflictDoNothing({ target: channelConfigsTable.channelId });
  }
  for (const webhook of DEFAULT_WEBHOOKS) {
    await db.insert(channelWebhooksTable)
      .values({ id: randomUUID(), ...webhook })
      .onConflictDoNothing({ target: channelWebhooksTable.webhookId });
  }
}

export function addEvent(channel: string, event: string, detail: string, type: EventType = "info") {
  void db.insert(channelEventLogsTable).values({
    id: randomUUID(), channel, event, detail, type,
  }).catch(() => {});
}

router.get("/channels/configs", async (_req, res) => {
  await ensureDefaults();
  return res.json(await db.select().from(channelConfigsTable));
});

router.put("/channels/configs/:channelId/status", async (req, res) => {
  const channelId = req.params.channelId as string;
  const status = req.body.status as ChannelStatus;
  const [updated] = await db.update(channelConfigsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(channelConfigsTable.channelId, channelId))
    .returning();
  if (!updated) return res.status(404).json({ error: "Channel not found" });
  addEvent(channelId, `Status changed to ${status}`, `Channel is now ${status.toLowerCase()}.`, status === "CONNECTED" ? "sync" : "warning");
  return res.json(updated);
});

router.post("/channels/configs/:channelId/sync", async (req, res) => {
  const channelId = req.params.channelId as string;
  const [updated] = await db.update(channelConfigsTable)
    .set({ lastSync: new Date(), updatedAt: new Date() })
    .where(eq(channelConfigsTable.channelId, channelId))
    .returning();
  if (!updated) return res.status(404).json({ error: "Channel not found" });
  addEvent(channelId, "Manual sync triggered", "Sync timestamp recorded. Connect the channel to perform a live sync.", "sync");
  return res.json(updated);
});

router.post("/channels/configs/sync-all", async (_req, res) => {
  await db.update(channelConfigsTable)
    .set({ lastSync: new Date(), updatedAt: new Date() })
    .where(eq(channelConfigsTable.status, "CONNECTED"));
  addEvent("system", "Sync-all triggered", "Active channel sync timestamps updated.", "sync");
  return res.json({ ok: true });
});

router.post("/channels/configs/:channelId/test", async (req, res) => {
  const channelId = req.params.channelId as string;
  const saved = await getChannelCredentials(channelId);
  const missing = Object.keys(saved).length === 0;
  const detail = missing
    ? "No credentials saved for this channel."
    : "Credentials are saved. Use the channel-specific live test to verify the external API.";
  addEvent(channelId, "Connection test unavailable", detail, missing ? "error" : "warning");
  return res.json({ pass: false, latency: 0, missing: missing ? ["credentials"] : [], detail });
});

router.get("/channels/events", async (_req, res) => {
  return res.json(await db.select().from(channelEventLogsTable).orderBy(desc(channelEventLogsTable.createdAt)).limit(200));
});

router.delete("/channels/events", async (_req, res) => {
  await db.delete(channelEventLogsTable);
  return res.json({ ok: true });
});

router.get("/channels/webhooks", async (_req, res) => {
  await ensureDefaults();
  return res.json(await db.select().from(channelWebhooksTable));
});

router.put("/channels/webhooks/:webhookId", async (req, res) => {
  const [updated] = await db.update(channelWebhooksTable)
    .set({ active: Boolean(req.body.active), updatedAt: new Date() })
    .where(eq(channelWebhooksTable.webhookId, req.params.webhookId as string))
    .returning();
  if (!updated) return res.status(404).json({ error: "Webhook not found" });
  return res.json(updated);
});

router.get("/channels/credentials/:channel", async (req, res) => {
  return res.json(await getChannelCredentials(req.params.channel as string));
});

router.put("/channels/credentials/:channel", async (req, res) => {
  const channel = req.params.channel as string;
  const data = { ...(await getChannelCredentials(channel)), ...req.body };
  await persistCredentials(channel, data);
  addEvent(channel, "API credentials updated", "Credentials saved to database.", "info");
  return res.json({ ok: true });
});

router.delete("/channels/credentials/:channel", async (req, res) => {
  const channel = req.params.channel as string;
  await persistCredentials(channel, {});
  addEvent(channel, "API credentials cleared", "All credentials removed.", "warning");
  return res.json({ ok: true });
});

export default router;