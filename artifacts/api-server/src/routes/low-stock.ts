import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin";
import { eventBus } from "../lib/eventBus";

const router = Router();
router.use(requireAdmin);

// ── In-memory settings ────────────────────────────────────────────────────────
let threshold = 5;
let lastCheckedAt: string | null = null;
let lastAlertedIds = new Set<string>();

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchLowStockProducts(limit: number) {
  const products = await db.select().from(productsTable).where(eq(productsTable.status, "ACTIVE"));
  return products
    .filter((p) => p.trackQuantity && (p.stock ?? 0) <= limit)
    .map((p) => ({ id: p.id, name: p.name, stock: p.stock ?? 0 }));
}

async function checkAndEmit() {
  const products = await fetchLowStockProducts(threshold);
  lastCheckedAt = new Date().toISOString();

  if (products.length === 0) {
    lastAlertedIds = new Set();
    return;
  }

  const newOnes = products.filter((p) => !lastAlertedIds.has(p.id));
  if (newOnes.length === 0) return;

  lastAlertedIds = new Set(products.map((p) => p.id));

  eventBus.publish({
    type: "low_stock",
    payload: { products, threshold, checkedAt: lastCheckedAt },
  });
}

// Run check every 5 minutes
setInterval(() => { checkAndEmit().catch(() => {}); }, 5 * 60 * 1000);

// Initial check after 30s so the server is fully ready
setTimeout(() => { checkAndEmit().catch(() => {}); }, 30_000);

// ── Routes ────────────────────────────────────────────────────────────────────

router.get("/admin/low-stock", async (_req, res) => {
  const products = await fetchLowStockProducts(threshold);
  return res.json({ products, threshold, checkedAt: lastCheckedAt });
});

router.post("/admin/low-stock/check", async (_req, res) => {
  const products = await fetchLowStockProducts(threshold);
  lastCheckedAt = new Date().toISOString();
  lastAlertedIds = new Set(products.map((p) => p.id));
  if (products.length > 0) {
    eventBus.publish({ type: "low_stock", payload: { products, threshold, checkedAt: lastCheckedAt } });
  }
  return res.json({ products, threshold, checkedAt: lastCheckedAt });
});

router.get("/admin/low-stock/settings", (_req, res) => {
  return res.json({ threshold });
});

router.put("/admin/low-stock/settings", (req, res) => {
  const { threshold: t } = req.body as { threshold: number };
  if (typeof t !== "number" || t < 0 || t > 10000) {
    return res.status(400).json({ error: "threshold must be a number between 0 and 10000" });
  }
  threshold = Math.floor(t);
  lastAlertedIds = new Set();
  checkAndEmit().catch(() => {});
  return res.json({ threshold });
});

export default router;
