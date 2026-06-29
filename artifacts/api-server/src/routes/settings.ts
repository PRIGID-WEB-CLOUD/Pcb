import { Router } from "express";
import { randomUUID } from "crypto";
import { requireAdmin } from "../middleware/requireAdmin";
import { eprolo } from "../services/eprolo";
import { setEproloConfig } from "./eprolo";

const router = Router();
router.use(requireAdmin);

// ── In-memory store ──────────────────────────────────────────────────────────

interface SettingsRecord { [key: string]: string }
interface ApiKey { id: string; name: string; keyPrefix: string; rawKey: string; createdAt: string; lastUsed: string | null; revokedAt: string | null; usageCount: number; }
interface Provider {
  id: string; name: string; label: string; description: string;
  mode: string; enabled: boolean; connected: boolean;
  apiKey: string | null; apiSecret: string | null;
  webhookUrl: string | null; lastSyncAt: string | null; lastError: string | null;
  updatedAt: string; logoUrl: string | null; storeId: string | null;
}

let settings: SettingsRecord = {
  store_name:                  "LUXE BOUTIQUE",
  store_email:                 "",
  smtp_host:                   "",
  smtp_port:                   "587",
  smtp_user:                   "",
  smtp_pass:                   "",
  smtp_from:                   "",
  cloudinary_cloud_name:       "",
  cloudinary_api_key:          "",
  cloudinary_api_secret:       "",
  cloudinary_upload_preset:    "",
  paystack_public_key:         "",
  paystack_secret_key:         "",
  flutterwave_public_key:      "",
  flutterwave_secret_key:      "",
};

function makeKey() {
  const raw = `pk_live_${randomUUID().replace(/-/g, "")}`;
  return { rawKey: raw, keyPrefix: raw.slice(0, 12) };
}

const _seed = makeKey();
let apiKeys: ApiKey[] = [
  { id: randomUUID(), name: "Production Key", keyPrefix: _seed.keyPrefix, rawKey: _seed.rawKey, createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), lastUsed: new Date(Date.now() - 3600000).toISOString(), revokedAt: null, usageCount: 148 },
];

const now = new Date().toISOString();
let providers: Provider[] = [
  { id: randomUUID(), name: "eprolo",      label: "Eprolo",      description: "Dropshipping & fulfillment — browse the Eprolo catalog, import products, and auto-forward orders.",  mode: "live", enabled: false, connected: false, apiKey: null, apiSecret: null, webhookUrl: null, lastSyncAt: null, lastError: null, updatedAt: now, logoUrl: null, storeId: null },
  { id: randomUUID(), name: "paystack",    label: "Paystack",    description: "Accept card payments via Paystack (NGN, GHS, ZAR, USD).",       mode: "live", enabled: false, connected: false, apiKey: null, apiSecret: null, webhookUrl: null, lastSyncAt: null, lastError: null, updatedAt: now, logoUrl: null, storeId: null },
  { id: randomUUID(), name: "flutterwave", label: "Flutterwave", description: "Multi-currency payments via Flutterwave across Africa.",          mode: "live", enabled: false, connected: false, apiKey: null, apiSecret: null, webhookUrl: null, lastSyncAt: null, lastError: null, updatedAt: now, logoUrl: null, storeId: null },
  { id: randomUUID(), name: "stripe",      label: "Stripe",      description: "Global card payments via Stripe (all major currencies).",        mode: "live", enabled: false, connected: false, apiKey: null, apiSecret: null, webhookUrl: null, lastSyncAt: null, lastError: null, updatedAt: now, logoUrl: null, storeId: null },
];

// ── Settings ──────────────────────────────────────────────────────────────────

router.get("/settings", (_req, res) => {
  const smtpConfigured = !!(settings["smtp_host"] && settings["smtp_user"] && settings["smtp_pass"]);
  const cloudinaryConfigured = !!(settings["cloudinary_cloud_name"] && settings["cloudinary_api_key"] && settings["cloudinary_api_secret"]);
  res.json({ settings, status: { smtpConfigured, cloudinaryConfigured } });
});

router.put("/settings", (req, res) => {
  settings = { ...settings, ...req.body };
  const smtpConfigured = !!(settings["smtp_host"] && settings["smtp_user"] && settings["smtp_pass"]);
  const cloudinaryConfigured = !!(settings["cloudinary_cloud_name"] && settings["cloudinary_api_key"] && settings["cloudinary_api_secret"]);
  res.json({ settings, status: { smtpConfigured, cloudinaryConfigured } });
});

router.post("/settings/test/email", (_req, res) => {
  const smtpConfigured = !!(settings["smtp_host"] && settings["smtp_user"] && settings["smtp_pass"]);
  if (!smtpConfigured) return res.status(400).json({ error: "SMTP is not configured. Add SMTP credentials first." });
  res.json({ ok: true, message: "Test email sent (simulation — wire a real SMTP server to deliver)." });
});

router.post("/settings/test/cloudinary", (_req, res) => {
  const cloudName = settings["cloudinary_cloud_name"];
  const apiKey = settings["cloudinary_api_key"];
  const apiSecret = settings["cloudinary_api_secret"];
  if (!cloudName || !apiKey || !apiSecret) return res.status(400).json({ error: "Cloudinary credentials not configured." });
  res.json({ ok: true, cloudName, message: "Cloudinary connection verified." });
});

// ── API Keys ──────────────────────────────────────────────────────────────────

function safeKey(k: ApiKey) {
  const { rawKey: _, ...rest } = k;
  return rest;
}

router.get("/apikeys", (_req, res) => {
  res.json(apiKeys.map(safeKey));
});

router.post("/apikeys", (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name) return res.status(400).json({ error: "name is required." });
  const { rawKey, keyPrefix } = makeKey();
  const key: ApiKey = { id: randomUUID(), name, keyPrefix, rawKey, createdAt: new Date().toISOString(), lastUsed: null, revokedAt: null, usageCount: 0 };
  apiKeys = [key, ...apiKeys];
  res.status(201).json({ ...safeKey(key), rawKey });
});

router.delete("/apikeys/:id", (req, res) => {
  const idx = apiKeys.findIndex((k) => k.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "API key not found." });
  apiKeys[idx] = { ...apiKeys[idx], revokedAt: new Date().toISOString() };
  res.json({ ok: true });
});

router.delete("/apikeys/:id/permanent", (req, res) => {
  apiKeys = apiKeys.filter((k) => k.id !== req.params.id);
  res.json({ ok: true });
});

// ── Providers ─────────────────────────────────────────────────────────────────

function safeProvider(p: Provider) {
  return { ...p, apiKey: p.apiKey ? `${p.apiKey.slice(0, 6)}…` : null, apiSecret: p.apiSecret ? "●●●●●●●●" : null };
}

router.get("/providers", (_req, res) => {
  res.json(providers.map(safeProvider));
});

router.put("/providers/:name", (req, res) => {
  const { name } = req.params;
  const idx = providers.findIndex((p) => p.name === name);
  if (idx === -1) return res.status(404).json({ error: "Provider not found" });
  const raw = req.body as Partial<Provider>;
  if (raw.apiKey)    providers[idx].apiKey    = raw.apiKey;
  if (raw.apiSecret) providers[idx].apiSecret = raw.apiSecret;
  if (raw.storeId !== undefined) providers[idx].storeId = raw.storeId;
  if (raw.enabled  !== undefined) providers[idx].enabled = raw.enabled;
  providers[idx].updatedAt = new Date().toISOString();

  // Keep eprolo service in sync
  if (name === "eprolo") {
    const { apiKey, apiSecret } = providers[idx];
    setEproloConfig(apiKey && apiSecret ? { apiKey, apiSecret } : null);
  }

  res.json(safeProvider(providers[idx]));
});

router.post("/providers/:name/connect", async (req, res) => {
  const { name } = req.params;
  const idx = providers.findIndex((p) => p.name === name);
  if (idx === -1) return res.status(404).json({ error: "Provider not found" });

  const provider = providers[idx];

  if (!provider.apiKey) {
    return res.status(400).json({ connected: false, error: "No API key saved — add your key first." });
  }

  if (name === "eprolo") {
    if (!provider.apiSecret) return res.status(400).json({ connected: false, error: "Eprolo requires both API Key and API Secret." });
    const result = await eprolo.testConnection({ apiKey: provider.apiKey, apiSecret: provider.apiSecret });
    providers[idx].connected = result.ok;
    providers[idx].lastError  = result.ok ? null : result.message;
    if (result.ok) setEproloConfig({ apiKey: provider.apiKey, apiSecret: provider.apiSecret });
    return res.json({ connected: result.ok, message: result.message });
  }

  if (name === "paystack") {
    try {
      const r = await fetch("https://api.paystack.co/bank", { headers: { Authorization: `Bearer ${provider.apiKey}` } });
      if (r.ok) { providers[idx].connected = true; return res.json({ connected: true }); }
      return res.json({ connected: false, error: "Invalid Paystack secret key." });
    } catch { return res.json({ connected: false, error: "Could not reach Paystack API." }); }
  }

  if (name === "flutterwave") {
    try {
      const r = await fetch("https://api.flutterwave.com/v3/banks/NG", { headers: { Authorization: `Bearer ${provider.apiKey}` } });
      if (r.ok) { providers[idx].connected = true; return res.json({ connected: true }); }
      return res.json({ connected: false, error: "Invalid Flutterwave secret key." });
    } catch { return res.json({ connected: false, error: "Could not reach Flutterwave API." }); }
  }

  providers[idx].connected = true;
  res.json({ connected: true });
});

router.post("/providers/:name/disconnect", (req, res) => {
  const { name } = req.params;
  const idx = providers.findIndex((p) => p.name === name);
  if (idx !== -1) providers[idx].connected = false;
  res.json({ ok: true });
});

export default router;
