import { Router } from "express";
import { randomUUID } from "crypto";

const router = Router();

// ── In-memory store ──────────────────────────────────────────────────────────

interface SettingsRecord { [key: string]: string }
interface ApiKey { id: string; name: string; key: string; createdAt: string; lastUsed: string | null; }
interface Provider { id: string; name: string; label: string; description: string; mode: string; enabled: boolean; connected: boolean; apiKey: string | null; }

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

let apiKeys: ApiKey[] = [
  { id: randomUUID(), name: "Production Key", key: `pk_live_${randomUUID().replace(/-/g, "")}`, createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), lastUsed: new Date(Date.now() - 3600000).toISOString() },
];

let providers: Provider[] = [
  { id: randomUUID(), name: "paystack",    label: "Paystack",    description: "Accept card payments via Paystack (NGN, GHS, ZAR, USD).",  mode: "live", enabled: false, connected: false, apiKey: null },
  { id: randomUUID(), name: "flutterwave", label: "Flutterwave", description: "Multi-currency payments via Flutterwave across Africa.",     mode: "live", enabled: false, connected: false, apiKey: null },
  { id: randomUUID(), name: "stripe",      label: "Stripe",      description: "Global card payments via Stripe (all major currencies).",   mode: "live", enabled: false, connected: false, apiKey: null },
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

router.get("/apikeys", (_req, res) => {
  res.json(apiKeys.map((k) => ({ ...k, key: `${k.key.slice(0, 12)}…` })));
});

router.post("/apikeys", (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name) return res.status(400).json({ error: "name is required." });
  const key: ApiKey = { id: randomUUID(), name, key: `pk_live_${randomUUID().replace(/-/g, "")}`, createdAt: new Date().toISOString(), lastUsed: null };
  apiKeys = [key, ...apiKeys];
  res.status(201).json(key);
});

router.delete("/apikeys/:id", (req, res) => {
  apiKeys = apiKeys.filter((k) => k.id !== req.params.id);
  res.json({ ok: true });
});

router.delete("/apikeys/:id/permanent", (req, res) => {
  apiKeys = apiKeys.filter((k) => k.id !== req.params.id);
  res.json({ ok: true });
});

// ── Providers ─────────────────────────────────────────────────────────────────

router.get("/providers", (_req, res) => {
  res.json(providers.map((p) => ({ ...p, apiKey: p.apiKey ? `${p.apiKey.slice(0, 8)}…` : null })));
});

router.put("/providers/:name", (req, res) => {
  const { name } = req.params;
  const idx = providers.findIndex((p) => p.name === name);
  if (idx === -1) return res.status(404).json({ error: "Provider not found" });
  if (req.body.apiKey) providers[idx].apiKey = req.body.apiKey;
  providers[idx] = { ...providers[idx], ...req.body, apiKey: req.body.apiKey ?? providers[idx].apiKey };
  res.json({ ...providers[idx], apiKey: providers[idx].apiKey ? `${providers[idx].apiKey!.slice(0, 8)}…` : null });
});

router.post("/providers/:name/connect", async (req, res) => {
  const { name } = req.params;
  const idx = providers.findIndex((p) => p.name === name);
  if (idx === -1) return res.status(404).json({ error: "Provider not found" });

  const provider = providers[idx];
  const apiKey = provider.apiKey;

  if (!apiKey) {
    return res.status(400).json({ connected: false, error: "No API key saved — add your key first." });
  }

  if (name === "paystack") {
    try {
      const r = await fetch("https://api.paystack.co/bank", { headers: { Authorization: `Bearer ${apiKey}` } });
      if (r.ok) {
        providers[idx].connected = true;
        return res.json({ connected: true });
      }
      return res.json({ connected: false, error: "Invalid Paystack secret key." });
    } catch {
      return res.json({ connected: false, error: "Could not reach Paystack API." });
    }
  }

  if (name === "flutterwave") {
    try {
      const r = await fetch("https://api.flutterwave.com/v3/banks/NG", { headers: { Authorization: `Bearer ${apiKey}` } });
      if (r.ok) {
        providers[idx].connected = true;
        return res.json({ connected: true });
      }
      return res.json({ connected: false, error: "Invalid Flutterwave secret key." });
    } catch {
      return res.json({ connected: false, error: "Could not reach Flutterwave API." });
    }
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
