import { Router } from "express";
import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin";
import { eprolo } from "../services/eprolo";
import { sendEmail } from "../services/mailer";
import { db, apiKeysTable, appSettingsTable, providerPluginsTable } from "@workspace/db";

const router = Router();
router.use(requireAdmin);

const DEFAULT_SETTINGS: Record<string, string> = { store_name: "LUXE BOUTIQUE" };
const PROVIDER_CATALOG = [
  { name: "eprolo", label: "Eprolo", description: "Dropshipping and fulfillment." },
  { name: "paystack", label: "Paystack", description: "Card payments via Paystack." },
  { name: "flutterwave", label: "Flutterwave", description: "Multi-currency payments via Flutterwave." },
  { name: "stripe", label: "Stripe", description: "Global card payments via Stripe." },
];

async function readSettings() {
  const rows = await db.select().from(appSettingsTable);
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) };
}

function configured(settings: Record<string, string>) {
  return {
    smtpConfigured: Boolean(settings.smtp_host && settings.smtp_user && settings.smtp_pass),
    cloudinaryConfigured: Boolean(settings.cloudinary_cloud_name && settings.cloudinary_api_key && settings.cloudinary_api_secret),
  };
}

router.get("/settings", async (_req, res) => {
  const settings = await readSettings();
  return res.json({ settings, status: configured(settings) });
});

router.put("/settings", async (req, res) => {
  for (const [key, value] of Object.entries(req.body as Record<string, unknown>)) {
    if (typeof value !== "string") continue;
    await db.insert(appSettingsTable).values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
  }
  const settings = await readSettings();
  return res.json({ settings, status: configured(settings) });
});

router.post("/settings/test/email", async (_req, res) => {
  const settings = await readSettings();
  if (!configured(settings).smtpConfigured) {
    return res.status(400).json({ error: "SMTP is not configured. Add SMTP credentials first." });
  }
  const sentTo = settings.smtp_test_email || settings.store_email || settings.smtp_user;
  try {
    await sendEmail({
      to: sentTo,
      subject: "Luxe Boutique SMTP test",
      text: "Your Luxe Boutique SMTP settings are working.",
      html: "<p>Your Luxe Boutique SMTP settings are working.</p>",
    });
    return res.json({ ok: true, sentTo });
  } catch (error) {
    console.error("[Settings] SMTP test failed:", error instanceof Error ? error.message : error);
    return res.status(502).json({ error: "SMTP connection or authentication failed. Check the host, port, username, and password." });
  }
});

router.post("/settings/test/cloudinary", async (_req, res) => {
  const settings = await readSettings();
  if (!configured(settings).cloudinaryConfigured) {
    return res.status(400).json({ error: "Cloudinary credentials not configured." });
  }
  return res.status(501).json({ error: "Cloudinary is configured, but the upload adapter is not enabled in this deployment." });
});

function makeKey() {
  const rawKey = `pk_live_${randomUUID().replace(/-/g, "")}`;
  return { rawKey, keyPrefix: rawKey.slice(0, 12) };
}

function safeKey(key: typeof apiKeysTable.$inferSelect) {
  const { rawKey: _, ...rest } = key;
  return rest;
}

router.get("/apikeys", async (_req, res) => {
  const keys = await db.select().from(apiKeysTable).orderBy(desc(apiKeysTable.createdAt));
  return res.json(keys.map(safeKey));
});

router.post("/apikeys", async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name) return res.status(400).json({ error: "name is required." });
  const { rawKey, keyPrefix } = makeKey();
  const [key] = await db.insert(apiKeysTable).values({
    id: randomUUID(), name, rawKey, keyPrefix,
  }).returning();
  return res.status(201).json({ ...safeKey(key), rawKey });
});

router.delete("/apikeys/:id", async (req, res) => {
  const [key] = await db.update(apiKeysTable)
    .set({ revokedAt: new Date() }).where(eq(apiKeysTable.id, req.params.id as string)).returning();
  if (!key) return res.status(404).json({ error: "API key not found." });
  return res.json({ ok: true });
});

router.delete("/apikeys/:id/permanent", async (req, res) => {
  await db.delete(apiKeysTable).where(eq(apiKeysTable.id, req.params.id as string));
  return res.json({ ok: true });
});

function safeProvider(provider: typeof providerPluginsTable.$inferSelect) {
  return {
    ...provider,
    apiKey: provider.apiKey ? `${provider.apiKey.slice(0, 6)}…` : null,
    apiSecret: provider.apiSecret ? "●●●●●●●●" : null,
  };
}

async function getProvider(name: string) {
  const [existing] = await db.select().from(providerPluginsTable)
    .where(eq(providerPluginsTable.name, name)).limit(1);
  if (existing) return existing;
  const metadata = PROVIDER_CATALOG.find((provider) => provider.name === name);
  if (!metadata) return null;
  const [created] = await db.insert(providerPluginsTable).values({
    id: randomUUID(), ...metadata,
  }).returning();
  return created;
}

router.get("/providers", async (_req, res) => {
  const providers = await Promise.all(PROVIDER_CATALOG.map((provider) => getProvider(provider.name)));
  return res.json(providers.filter(Boolean).map((provider) => safeProvider(provider!)));
});

router.put("/providers/:name", async (req, res) => {
  const provider = await getProvider(req.params.name as string);
  if (!provider) return res.status(404).json({ error: "Provider not found" });
  const raw = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ["apiKey", "apiSecret", "storeId", "enabled"]) {
    if (key in raw) updates[key] = raw[key];
  }
  const [updated] = await db.update(providerPluginsTable).set(updates)
    .where(eq(providerPluginsTable.id, provider.id)).returning();
  return res.json(safeProvider(updated));
});

router.post("/providers/:name/connect", async (req, res) => {
  const provider = await getProvider(req.params.name as string);
  if (!provider) return res.status(404).json({ error: "Provider not found" });
  if (!provider.apiKey) return res.status(400).json({ connected: false, error: "No API key saved — add your key first." });

  if (provider.name === "eprolo") {
    if (!provider.apiSecret) return res.status(400).json({ connected: false, error: "Eprolo requires both API Key and API Secret." });
    const result = await eprolo.testConnection({ apiKey: provider.apiKey, apiSecret: provider.apiSecret });
    await db.update(providerPluginsTable).set({
      connected: result.ok, lastError: result.ok ? null : result.message,
      lastSyncAt: result.ok ? new Date() : provider.lastSyncAt, updatedAt: new Date(),
    }).where(eq(providerPluginsTable.id, provider.id));
    return res.json({ connected: result.ok, message: result.message });
  }

  if (provider.name === "paystack") {
    try {
      const response = await fetch("https://api.paystack.co/bank", { headers: { Authorization: `Bearer ${provider.apiKey}` } });
      if (!response.ok) return res.json({ connected: false, error: "Invalid Paystack secret key." });
    } catch { return res.json({ connected: false, error: "Could not reach Paystack API." }); }
  } else if (provider.name === "flutterwave") {
    try {
      const response = await fetch("https://api.flutterwave.com/v3/banks/NG", { headers: { Authorization: `Bearer ${provider.apiKey}` } });
      if (!response.ok) return res.json({ connected: false, error: "Invalid Flutterwave secret key." });
    } catch { return res.json({ connected: false, error: "Could not reach Flutterwave API." }); }
  } else {
    return res.status(501).json({ connected: false, error: "Stripe connection testing is not configured." });
  }

  const [updated] = await db.update(providerPluginsTable).set({
    connected: true, lastError: null, lastSyncAt: new Date(), updatedAt: new Date(),
  }).where(eq(providerPluginsTable.id, provider.id)).returning();
  return res.json({ connected: true, provider: safeProvider(updated) });
});

router.post("/providers/:name/disconnect", async (req, res) => {
  const provider = await getProvider(req.params.name as string);
  if (provider) await db.update(providerPluginsTable)
    .set({ connected: false, updatedAt: new Date() }).where(eq(providerPluginsTable.id, provider.id));
  return res.json({ ok: true });
});

export default router;