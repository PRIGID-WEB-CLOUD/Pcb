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
  const startedAt = performance.now();
  const creds = await getChannelCredentials(channelId);
  let result: { pass: boolean; detail: string; providerData?: unknown };

  const graphGet = async (path: string, token: string, fields: string) => {
    const url = new URL(`https://graph.facebook.com/v21.0${path}`);
    url.searchParams.set("fields", fields);
    url.searchParams.set("access_token", token);
    const response = await fetch(url.toString());
    const data = await response.json() as Record<string, unknown>;
    const providerError = data.error as Record<string, string> | undefined;
    return {
      ok: response.ok && !providerError,
      data,
      error: providerError?.message ?? `Provider returned HTTP ${response.status}`,
    };
  };

  try {
    if (channelId === "facebook") {
      const pageId = creds.page_id;
      const token = creds.page_access_token;
      if (!pageId || !token) throw new Error("Missing Facebook Page ID or Page Access Token.");
      const response = await graphGet(`/${pageId}`, token, "id,name,fan_count,followers_count");
      result = response.ok
        ? { pass: true, detail: "Facebook Page API responded successfully.", providerData: response.data }
        : { pass: false, detail: response.error };
    } else if (channelId === "instagram") {
      const accountId = creds.ig_user_id;
      const token = creds.page_access_token;
      if (!accountId || !token) throw new Error("Missing Instagram Business Account ID or Page Access Token.");
      const response = await graphGet(`/${accountId}`, token, "id,name,username,followers_count,media_count");
      result = response.ok
        ? { pass: true, detail: "Instagram Graph API responded successfully.", providerData: response.data }
        : { pass: false, detail: response.error };
    } else if (channelId === "commerce") {
      const catalogId = creds.catalog_id;
      const token = creds.page_access_token;
      if (!catalogId || !token) throw new Error("Missing Meta Catalog ID or Page Access Token.");
      const response = await graphGet(`/${catalogId}`, token, "id,name,product_count,vertical");
      result = response.ok
        ? { pass: true, detail: "Meta Commerce catalog API responded successfully.", providerData: response.data }
        : { pass: false, detail: response.error };
    } else if (channelId === "ads") {
      const accountId = creds.ad_account_id;
      const token = creds.page_access_token;
      if (!accountId || !token) throw new Error("Missing Meta Ad Account ID or Page Access Token.");
      const normalizedId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
      const response = await graphGet(`/${normalizedId}`, token, "id,name,currency,account_status");
      result = response.ok
        ? { pass: true, detail: "Meta Ads API responded successfully.", providerData: response.data }
        : { pass: false, detail: response.error };
    } else if (channelId === "whatsapp") {
      const phoneNumberId = creds.phone_number_id;
      const token = creds.system_access_token;
      if (!phoneNumberId || !token) throw new Error("Missing WhatsApp Phone Number ID or System Access Token.");
      const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,quality_rating,status,verified_name`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json() as Record<string, unknown>;
      const providerError = data.error as Record<string, string> | undefined;
      result = response.ok && !providerError
        ? { pass: true, detail: "WhatsApp Business API responded successfully.", providerData: data }
        : { pass: false, detail: providerError?.message ?? `Provider returned HTTP ${response.status}` };
    } else if (channelId === "twitter") {
      const token = creds.bearer_token;
      if (!token) throw new Error("Missing X/Twitter Bearer Token.");
      const response = await fetch("https://api.twitter.com/2/users/me?user.fields=name,username", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json() as Record<string, unknown>;
      result = response.ok
        ? { pass: true, detail: "X/Twitter API responded successfully.", providerData: data.data }
        : { pass: false, detail: (data.detail as string) ?? (data.title as string) ?? `Provider returned HTTP ${response.status}` };
    } else {
      result = { pass: false, detail: `Unsupported channel: ${channelId}.` };
    }
  } catch (error) {
    result = { pass: false, detail: error instanceof Error ? error.message : String(error) };
  }

  const latency = Math.round(performance.now() - startedAt);
  await db.update(channelConfigsTable)
    .set({ latency, status: result.pass ? "CONNECTED" : "DISCONNECTED", updatedAt: new Date() })
    .where(eq(channelConfigsTable.channelId, channelId));
  addEvent(
    channelId,
    result.pass ? "Live connection test passed" : "Live connection test failed",
    `${result.detail} (${latency}ms)`,
    result.pass ? "sync" : "error",
  );
  return res.json({ pass: result.pass, ok: result.pass, latency, detail: result.detail, providerData: result.providerData });
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