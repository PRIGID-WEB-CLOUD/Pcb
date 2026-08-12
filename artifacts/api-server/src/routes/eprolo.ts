import { Router } from "express";
import { randomUUID } from "crypto";
import { requireAdmin } from "../middleware/requireAdmin";
import { eprolo, type EproloConfig } from "../services/eprolo";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, like, and } from "drizzle-orm";

const router = Router();

// In-memory credential store (shared via module singleton — same process as settings.ts)
// We expose a setter/getter so settings.ts can write keys here
let _config: EproloConfig | null = null;
export function setEproloConfig(c: EproloConfig | null) { _config = c; }
export function getEproloConfig(): EproloConfig | null { return _config; }

function requireConfig(res: import("express").Response): boolean {
  if (!_config?.apiKey || !_config?.apiSecret) {
    res.status(400).json({ error: "Eprolo credentials not configured. Go to Providers → Configure Eprolo and save your API Key + Secret first." });
    return false;
  }
  return true;
}

// ── Browse Eprolo catalog ────────────────────────────────────────────────────
router.get("/eprolo/products", requireAdmin, async (req, res) => {
  if (!requireConfig(res)) return res.status(400);
  const { page_size = "20", page_num = "1", typeid } = req.query as Record<string, string>;
  try {
    const products = await eprolo.getProducts(_config!, { page_size: Number(page_size), page_num: Number(page_num), typeid });
    return res.json({ products, page: Number(page_num), pageSize: Number(page_size) });
  } catch (err: unknown) {
    return res.status(502).json({ error: err instanceof Error ? err.message : "Eprolo request failed" });
  }
});

// ── Get product detail ────────────────────────────────────────────────────────
router.get("/eprolo/products/:id", requireAdmin, async (req, res) => {
  if (!requireConfig(res)) return res.status(400);
  if (!requireConfig(res)) return;
  const id = req.params.id as string;
  const { product_id = id } = req.query as { product_id?: string };
  try {
    const detail = await eprolo.getProductDetail(_config!, id, product_id);
    return res.json(detail);
  } catch (err: unknown) {
    return res.status(502).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

// ── Sync inventory stock levels ───────────────────────────────────────────────
router.post("/eprolo/sync", requireAdmin, async (req, res) => {
  if (!requireConfig(res)) return res.status(400);
  try {
    const inventory = await eprolo.syncInventory(_config!);
    let updated = 0;
    for (const item of inventory) {
      const stockValue = item.num !== undefined ? Number(item.num) : (item.stock !== undefined ? Number(item.stock) : 0);
      const eproloId   = item.productid || item.id;
      if (!eproloId) continue;
      const result = await db.update(productsTable)
        .set({ stock: stockValue })
        .where(eq(productsTable.id, eproloId));
      if (result.rowCount ?? 0 > 0) updated++;
    }
    return res.json({ ok: true, synced: inventory.length, updated, message: `Synced ${inventory.length} items, updated ${updated} store products.` });
  } catch (err: unknown) {
    return res.status(502).json({ error: err instanceof Error ? err.message : "Sync failed" });
  }
});

// ── Import a product from Eprolo into the store catalog ──────────────────────
router.post("/eprolo/import", requireAdmin, async (req, res) => {
  if (!requireConfig(res)) return res.status(400);
  const { product } = req.body as { product?: Record<string, unknown> };
  if (!product) return res.status(400).json({ error: "product is required" });

  try {
    // Ensure category exists
    const rawCat = String(product.product_type || product.vendor || "Dropship");
    const catName = rawCat.split(">").pop()?.trim() || rawCat;
    const catSlug = catName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    let category = (await db.select().from(categoriesTable).where(eq(categoriesTable.slug, catSlug)).limit(1))[0];
    if (!category) {
      const [c] = await db.insert(categoriesTable).values({ id: randomUUID(), name: catName, slug: catSlug, description: `Imported from Eprolo` }).returning();
      category = c;
    }

    // Map Eprolo product to store schema
    const images: string[] = ((product.imagelist as { src: string }[] | undefined) ?? []).map((i) => i.src);
    const primaryImage = images[0] ?? null;
    const price = Math.round(Number(product.cost || product.price || 0));

    const [newProduct] = await db.insert(productsTable).values({
      id:          randomUUID(),
      name:        String(product.title || product.name || "Eprolo Product"),
      description: String(product.body_html || product.description || "High quality dropship product."),
      price,
      imageUrl:    primaryImage,
      categoryId:  category.id,
      status:      "DRAFT",
      trackQuantity: true,
      stock:       100,
      tags:        "eprolo,dropship",
    }).returning();

    return res.status(201).json({ ok: true, product: newProduct, message: `"${newProduct.name}" added to staging for review before publishing.` });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Import failed" });
  }
});

// ── Check if Eprolo is configured (public — used to conditionally show UI) ────
router.get("/eprolo/configured", requireAdmin, (_req, res) => {
  const cfg = _config;
  return res.json({ configured: !!(cfg?.apiKey && cfg?.apiSecret) });
});

// ── Staged (DRAFT) Eprolo products awaiting review ───────────────────────────
router.get("/eprolo/staged", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(productsTable)
      .where(and(eq(productsTable.status, "DRAFT"), like(productsTable.tags, "%eprolo%")));
    return res.json(rows);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

// ── Publish a staged product (DRAFT → ACTIVE) ─────────────────────────────────
router.post("/eprolo/staged/:id/publish", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id as string;
    const rows = await db.update(productsTable)
      .set({ status: "ACTIVE" })
      .where(and(eq(productsTable.id, id), like(productsTable.tags, "%eprolo%")))
      .returning();
    if (!rows[0]) return res.status(404).json({ error: "Staged product not found" });
    return res.json({ ok: true, product: rows[0] });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Publish failed" });
  }
});

// ── Reject (delete) a staged product ─────────────────────────────────────────
router.delete("/eprolo/staged/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id as string;
    await db.delete(productsTable)
      .where(and(eq(productsTable.id, id), like(productsTable.tags, "%eprolo%")));
    res.json({ ok: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Reject failed" });
  }
});

// ── Eprolo webhook receiver (tracking updates) ────────────────────────────────
router.post("/webhooks/eprolo", async (req, res) => {
  const rawBody  = JSON.stringify(req.body);
  const md5sign  = req.headers["md5sign"] as string | undefined;
  const signKey  = _config?.apiSecret;

  if (!signKey) return res.status(500).json({ error: "Eprolo not configured" });
  if (!md5sign) return res.status(401).json({ error: "Missing md5sign header" });
  if (!eprolo.verifyWebhook(rawBody, signKey, md5sign)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const shipments = Array.isArray(req.body) ? req.body : [req.body];
  for (const s of shipments) {
    console.log(`[Eprolo webhook] Order ${s.order_id} shipped via ${s.tracking_company} — ${s.tracking_url}`);
    // TODO: update order status to SHIPPED and notify customer
  }

  return res.json({ code: 0, msg: "success" });
});

export default router;
