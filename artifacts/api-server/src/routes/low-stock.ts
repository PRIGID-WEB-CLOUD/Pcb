import { Router } from "express";
import { db, productsTable, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin";
import { eventBus } from "../lib/eventBus";

const router = Router();
router.use(requireAdmin);

const THRESHOLD_KEY = "low_stock_threshold";
const LAST_CHECKED_KEY = "low_stock_last_checked_at";

async function readSettings() {
  const rows = await db.select().from(appSettingsTable)
    .where(eq(appSettingsTable.key, THRESHOLD_KEY));
  const checkedRows = await db.select().from(appSettingsTable)
    .where(eq(appSettingsTable.key, LAST_CHECKED_KEY));
  const parsed = Number(rows[0]?.value);
  return {
    threshold: Number.isFinite(parsed) && parsed >= 0 ? parsed : 5,
    lastCheckedAt: checkedRows[0]?.value ?? null,
  };
}

async function writeSetting(key: string, value: string) {
  await db.insert(appSettingsTable).values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchLowStockProducts(limit: number) {
  const products = await db.select().from(productsTable).where(eq(productsTable.status, "ACTIVE"));
  return products
    .filter((p) => p.trackQuantity && (p.stock ?? 0) <= limit)
    .map((p) => ({ id: p.id, name: p.name, stock: p.stock ?? 0 }));
}

async function checkAndEmit() {
  const { threshold } = await readSettings();
  const products = await fetchLowStockProducts(threshold);
  const checkedAt = new Date().toISOString();
  await writeSetting(LAST_CHECKED_KEY, checkedAt);
  if (products.length === 0) return;

  eventBus.publish({
    type: "low_stock",
    payload: { products, threshold, checkedAt },
  });
}

// Run check every 5 minutes
setInterval(() => { checkAndEmit().catch(() => {}); }, 5 * 60 * 1000);

// Initial check after 30s so the server is fully ready
setTimeout(() => { checkAndEmit().catch(() => {}); }, 30_000);

// ── Routes ────────────────────────────────────────────────────────────────────

router.get("/admin/low-stock", async (_req, res) => {
  const settings = await readSettings();
  const products = await fetchLowStockProducts(settings.threshold);
  return res.json({ products, threshold: settings.threshold, checkedAt: settings.lastCheckedAt });
});

router.post("/admin/low-stock/check", async (_req, res) => {
  const { threshold } = await readSettings();
  const products = await fetchLowStockProducts(threshold);
  const checkedAt = new Date().toISOString();
  await writeSetting(LAST_CHECKED_KEY, checkedAt);
  if (products.length > 0) {
    eventBus.publish({ type: "low_stock", payload: { products, threshold, checkedAt } });
  }
  return res.json({ products, threshold, checkedAt });
});

router.get("/admin/low-stock/settings", async (_req, res) => {
  const { threshold } = await readSettings();
  return res.json({ threshold });
});

router.put("/admin/low-stock/settings", async (req, res) => {
  const { threshold: t } = req.body as { threshold: number };
  if (typeof t !== "number" || t < 0 || t > 10000) {
    return res.status(400).json({ error: "threshold must be a number between 0 and 10000" });
  }
  const threshold = Math.floor(t);
  await writeSetting(THRESHOLD_KEY, String(threshold));
  checkAndEmit().catch(() => {});
  return res.json({ threshold });
});

export default router;
