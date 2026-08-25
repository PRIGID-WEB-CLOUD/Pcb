import { Router } from "express";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "crypto";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  db,
  channelCredentialsTable,
  channelConfigsTable,
  channelEventLogsTable,
  channelWebhooksTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();
router.use(requireAdmin);

type ChannelStatus = "CONNECTED" | "PAUSED" | "DISCONNECTED";
type EventType = "sync" | "error" | "warning" | "info";

const CHANNELS = ["facebook", "instagram", "commerce", "ads", "whatsapp", "twitter"] as const;
const SECRET_FIELDS = new Set([
  "app_secret", "page_access_token", "bearer_token", "api_secret",
  "access_token", "access_token_secret", "system_access_token", "webhook_verify_token",
]);
const CREDENTIAL_FIELDS: Record<typeof CHANNELS[number], string[]> = {
  facebook: ["page_id", "catalog_id", "app_id", "app_secret", "page_access_token", "pixel_id", "ad_account_id"],
  instagram: ["ig_user_id", "page_access_token"],
  commerce: ["catalog_id", "page_access_token"],
  ads: ["ad_account_id", "page_access_token"],
  whatsapp: ["phone_number_id", "waba_id", "system_access_token", "webhook_verify_token"],
  twitter: ["api_key", "api_secret", "access_token", "access_token_secret", "bearer_token"],
};
const credentialSchemas = Object.fromEntries(
  CHANNELS.map((channel) => [
    channel,
    z.object(Object.fromEntries(CREDENTIAL_FIELDS[channel].map((field) => [field, z.string().max(4096).optional()]))).strict(),
  ]),
) as unknown as Record<typeof CHANNELS[number], z.ZodType<Record<string, string | undefined>>>;

function encryptionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required to encrypt channel credentials.");
  return createHash("sha256").update(secret).digest();
}

function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `enc:v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;
}

function decryptSecret(value: string) {
  if (!value.startsWith("enc:v1:")) return value;
  const [, , ivText, tagText, ciphertextText] = value.split(":");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8");
}

function maskSecret(value: string) {
  return `••••••••••••${value.slice(-4)}`;
}

function publicCredentials(data: Record<string, string>) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [
    key,
    SECRET_FIELDS.has(key) ? maskSecret(value) : value,
  ]));
}
const DEFAULT_WEBHOOKS = [
  { webhookId: "order_created", label: "Order Created", url: "/webhooks/order-created", active: true },
  { webhookId: "product_updated", label: "Product Updated", url: "/webhooks/product-updated", active: true },
  { webhookId: "cart_abandoned", label: "Cart Abandoned", url: "/webhooks/cart-abandoned", active: false },
  { webhookId: "customer_signup", label: "Customer Sign-up", url: "/webhooks/customer-signup", active: true },
];

export async function getChannelCredentials(channel: string): Promise<Record<string, string>> {
  const [row] = await db.select().from(channelCredentialsTable)
    .where(eq(channelCredentialsTable.channel, channel)).limit(1);
  const stored = row?.data ?? {};
  const decrypted = Object.fromEntries(Object.entries(stored).map(([key, value]) => [key, decryptSecret(value)]));
  if (row && Object.entries(stored).some(([key, value]) => SECRET_FIELDS.has(key) && !value.startsWith("enc:v1:"))) {
    await persistCredentials(channel, decrypted);
  }
  return decrypted;
}

async function persistCredentials(channel: string, data: Record<string, string>) {
  const encrypted = Object.fromEntries(Object.entries(data).map(([key, value]) => [
    key,
    SECRET_FIELDS.has(key) && value ? encryptSecret(value) : value,
  ]));
  await db.insert(channelCredentialsTable)
    .values({ channel, data: encrypted, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: channelCredentialsTable.channel,
      set: { data: encrypted, updatedAt: new Date() },
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
  const parsedStatus = z.enum(["CONNECTED", "PAUSED", "DISCONNECTED"]).safeParse(req.body.status);
  if (!parsedStatus.success) return res.status(400).json({ error: "Invalid channel status." });
  const status: ChannelStatus = parsedStatus.data;
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
  const channel = req.params.channel as string;
  if (!CHANNELS.includes(channel as typeof CHANNELS[number])) return res.status(404).json({ error: "Unknown channel." });
  return res.json(publicCredentials(await getChannelCredentials(channel)));
});

router.put("/channels/credentials/:channel", async (req, res) => {
  const channel = req.params.channel as string;
  if (!CHANNELS.includes(channel as typeof CHANNELS[number])) return res.status(404).json({ error: "Unknown channel." });
  const parsed = credentialSchemas[channel as typeof CHANNELS[number]].safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid credential fields.", details: parsed.error.flatten() });
  const existing = await getChannelCredentials(channel);
  const data = { ...existing };
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined || (SECRET_FIELDS.has(key) && value.startsWith("••••"))) continue;
    if (value === "") delete data[key];
    else data[key] = value;
  }
  await persistCredentials(channel, data);
  addEvent(channel, "API credentials updated", "Credentials saved to database.", "info");
  return res.json({ ok: true, credentials: publicCredentials(data) });
});

router.delete("/channels/credentials/:channel", async (req, res) => {
  const channel = req.params.channel as string;
  if (!CHANNELS.includes(channel as typeof CHANNELS[number])) return res.status(404).json({ error: "Unknown channel." });
  await persistCredentials(channel, {});
  addEvent(channel, "API credentials cleared", "All credentials removed.", "warning");
  return res.json({ ok: true });
});

export default router;