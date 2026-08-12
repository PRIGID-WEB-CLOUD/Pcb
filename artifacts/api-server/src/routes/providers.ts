import { Router } from "express";
import { db } from "@workspace/db";
import { providerPlugins } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

const BUILT_IN_PROVIDERS = [
  {
    name: "printful",
    label: "Printful",
    description: "Print-on-demand fulfillment — auto-create products, sync orders, and handle global shipping.",
    logoUrl: "https://cdn.brandfetch.io/idVfgx4WKb/w/512/h/512/theme/dark/logo.png?k=id64Mup7ac",
  },
  {
    name: "eprolo",
    label: "Eprolo",
    description: "Dropshipping & branding platform — source products, private labeling, and automated fulfillment.",
    logoUrl: "https://cdn.brandfetch.io/idV2xTiYc8/w/512/h/512/theme/dark/logo.png?k=id64Mup7ac",
  },
  {
    name: "shipbob",
    label: "ShipBob",
    description: "3PL fulfillment network — warehousing, packing, and 2-day shipping across the US & EU.",
    logoUrl: null,
  },
  {
    name: "gooten",
    label: "Gooten",
    description: "On-demand manufacturing partner — 150+ products with global fulfillment capabilities.",
    logoUrl: null,
  },
];

async function ensureSeeded() {
  const existing = await db.select().from(providerPlugins);
  if (existing.length === 0) {
    for (const p of BUILT_IN_PROVIDERS) {
      await db.insert(providerPlugins).values(p).onConflictDoNothing();
    }
  }
}

router.get("/", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await ensureSeeded();
    const plugins = await db.select().from(providerPlugins);
    res.json(plugins);
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.get("/:name", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [plugin] = await db.select().from(providerPlugins).where(eq(providerPlugins.name, req.params.name)).limit(1);
    if (!plugin) return res.status(404).json({ error: "Provider not found" });
    res.json(plugin);
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.put("/:name", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { apiKey, apiSecret, storeId, webhookUrl, enabled, settings } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (apiKey      !== undefined) updates.apiKey      = apiKey;
    if (apiSecret   !== undefined) updates.apiSecret   = apiSecret;
    if (storeId     !== undefined) updates.storeId     = storeId;
    if (webhookUrl  !== undefined) updates.webhookUrl  = webhookUrl;
    if (enabled     !== undefined) updates.enabled     = enabled;
    if (settings    !== undefined) updates.settings    = typeof settings === "string" ? settings : JSON.stringify(settings);

    const [updated] = await db.update(providerPlugins)
      .set(updates)
      .where(eq(providerPlugins.name, req.params.name))
      .returning();

    if (!updated) return res.status(404).json({ error: "Provider not found" });
    res.json(updated);
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.post("/:name/connect", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const [plugin] = await db.select().from(providerPlugins).where(eq(providerPlugins.name, req.params.name)).limit(1);
    if (!plugin) return res.status(404).json({ error: "Provider not found" });

    if (!plugin.apiKey) {
      return res.status(400).json({ error: "API key is required to connect" });
    }

    let connected = false;
    let lastError: string | null = null;

    if (plugin.name === "printful") {
      try {
        const r = await fetch("https://api.printful.com/store", {
          headers: { Authorization: `Bearer ${plugin.apiKey}` },
        });
        connected = r.ok;
        if (!r.ok) lastError = `Printful API returned ${r.status}`;
      } catch (e: unknown) {
        lastError = e instanceof Error ? e.message : "Connection failed";
      }
    } else if (plugin.name === "eprolo") {
      connected = plugin.apiKey.length > 8;
      if (!connected) lastError = "Invalid API key format";
    } else {
      connected = plugin.apiKey.length > 4;
    }

    await db.update(providerPlugins)
      .set({ connected, lastError, lastSyncAt: connected ? new Date() : undefined, updatedAt: new Date() })
      .where(eq(providerPlugins.name, req.params.name));

    res.json({ connected, error: lastError });
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.post("/:name/disconnect", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    await db.update(providerPlugins)
      .set({ connected: false, enabled: false, apiKey: null, apiSecret: null, storeId: null, updatedAt: new Date() })
      .where(eq(providerPlugins.name, req.params.name));

    res.json({ success: true });
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

export default router;
