import { Router } from "express";
import { randomUUID } from "crypto";
import { db, productsTable, categoriesTable, ordersTable } from "@workspace/db";
import { eq, desc, sql, like } from "drizzle-orm";
import { eprolo } from "../services/eprolo";
import { getEproloConfig } from "./eprolo";
import { requireAdmin } from "../middleware/requireAdmin";
import { validate } from "../middleware/validate";
import { z } from "zod";
import { eventBus } from "../lib/eventBus";

const router = Router();

// ── Types (non-DB: variants, media, team, coupons still in-memory) ─────────────

interface Variant    { id: string; size: string; color: string; stock: number; price: number | null; sku: string; }
interface MediaItem  { id: string; filename: string; url: string; mimeType: string; size: number; createdAt: string; }
interface Customer   { id: string; name: string; email: string; totalOrders: number; totalSpent: number; createdAt: string; }
interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}
interface TeamMember { id: string; name: string; email: string; role: string; status: string; invitedAt: string; }
interface BlogPost   { id: string; title: string; slug: string; content: string; status: string; authorName: string; publishedAt: string | null; createdAt: string; }

// In-memory (not migrated to DB yet)
const productVariants = new Map<string, Variant[]>();
let mediaItems: MediaItem[] = [
  { id: randomUUID(), filename: "hero-overcoat.jpg",    url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800", mimeType: "image/jpeg", size: 248000, createdAt: new Date().toISOString() },
  { id: randomUUID(), filename: "accessories-edit.jpg", url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800",   imageType: "image/jpeg", size: 195000, createdAt: new Date().toISOString() } as unknown as MediaItem,
];
let customers: Customer[] = [
  { id: "c1", name: "Audrey Chen",    email: "audrey@example.com",   totalOrders: 3, totalSpent: 7420,  createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: "c2", name: "Marcus Webb",    email: "marcus@example.com",   totalOrders: 2, totalSpent: 5240,  createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: "c3", name: "Isabelle Morel", email: "isabelle@example.com", totalOrders: 5, totalSpent: 12800, createdAt: new Date(Date.now() - 86400000 * 60).toISOString() },
  { id: "c4", name: "James Harlow",   email: "james@example.com",    totalOrders: 1, totalSpent: 580,   createdAt: new Date(Date.now() - 86400000 * 5).toISOString()  },
];
let coupons: Coupon[] = [
  { id: randomUUID(), code: "LUXE20",    description: "A signature offer for returning clients.", discountType: "PERCENTAGE", discountValue: 20, minOrderAmount: 0, maxUses: null, usedCount: 34,  active: true,  expiresAt: null, createdAt: new Date(Date.now() - 86400000 * 45).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: randomUUID(), code: "WELCOME10", description: "Welcome offer for new clients.", discountType: "PERCENTAGE", discountValue: 10, minOrderAmount: 0, maxUses: null, usedCount: 127, active: true,  expiresAt: null, createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: randomUUID(), code: "FLAT50",    description: "A fixed amount seasonal offer.", discountType: "FIXED", discountValue: 50, minOrderAmount: 250, maxUses: 50, usedCount: 12, active: false, expiresAt: "2025-12-31T23:59:59Z", createdAt: new Date(Date.now() - 86400000 * 90).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 10).toISOString() },
];
let teamMembers: TeamMember[] = [
  { id: randomUUID(), name: "LUXE Admin", email: "admin@luxeboutique.com", role: "SUPER_ADMIN", status: "Active", invitedAt: new Date(Date.now() - 86400000 * 90).toISOString() },
];
let blogPosts: BlogPost[] = [
  { id: randomUUID(), title: "The Art of Quiet Luxury",   slug: "quiet-luxury",   content: "Quiet luxury is not about conspicuous logos…", status: "PUBLISHED", authorName: "LUXE BOUTIQUE", publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(), createdAt: new Date(Date.now() - 86400000 * 6).toISOString() },
  { id: randomUUID(), title: "Autumn Collection Preview", slug: "autumn-preview", content: "As the days grow shorter…",                     status: "DRAFT",     authorName: "LUXE BOUTIQUE", publishedAt: null,                                                      createdAt: new Date(Date.now() - 86400000 * 1).toISOString() },
];

// ── Products ──────────────────────────────────────────────────────────────────

async function enrichProduct(p: typeof productsTable.$inferSelect) {
  const cat = p.categoryId
    ? (await db.select().from(categoriesTable).where(eq(categoriesTable.id, p.categoryId)).limit(1))[0]
    : null;
  return {
    ...p,
    category: cat ? { id: cat.id, name: cat.name } : null,
    variants:  productVariants.get(p.id) ?? [],
  };
}

const productSchema = z.object({
  name:          z.string().min(1),
  price:         z.number().int().min(0).optional().default(0),
  categoryId:    z.string().optional().nullable(),
  stock:         z.number().int().min(0).optional().default(0),
  trackQuantity: z.boolean().optional().default(true),
  status:        z.string().optional().default("ACTIVE"),
  imageUrl:      z.string().optional().nullable(),
  description:   z.string().optional().default(""),
  tags:          z.string().optional().nullable(),
});

router.get("/products", async (_req, res) => {
  const prods = await db.select().from(productsTable).orderBy(desc(productsTable.createdAt));
  const enriched = await Promise.all(prods.map(enrichProduct));
  res.json(enriched);
});

router.post("/products", requireAdmin, validate(productSchema), async (req, res) => {
  const body = req.body as z.infer<typeof productSchema>;
  const [p] = await db.insert(productsTable).values({ id: randomUUID(), ...body }).returning();
  productVariants.set(p.id, []);
  return res.status(201).json(await enrichProduct(p));
});

router.get("/products/:id", async (req, res) => {
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id as string)).limit(1);
  const productId = req.params.id as string;
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  return res.json(await enrichProduct(rows[0]));
});

router.put("/products/:id", requireAdmin, async (req, res) => {
  const productId = req.params.id as string;
  const allowed = ["name", "price", "categoryId", "stock", "trackQuantity", "status", "imageUrl", "description", "tags"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  const rows = await db.update(productsTable).set(updates).where(eq(productsTable.id, req.params.id as string)).returning();
  const rows = await db.update(productsTable).set(updates).where(eq(productsTable.id, productId)).returning();
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  return res.json(await enrichProduct(rows[0]));
});

router.delete("/products/:id", requireAdmin, async (req, res) => {
  productVariants.delete(req.params.id as string);
  await db.delete(productsTable).where(eq(productsTable.id, req.params.id as string));
  return res.json({ ok: true });
  const productId = req.params.id as string;
  productVariants.delete(productId);
  await db.delete(productsTable).where(eq(productsTable.id, productId));
  res.json({ ok: true });
});

// ── Manual sync (stamp updatedAt to mark as manually synced) ──────────────────
router.post("/products/:id/sync", requireAdmin, async (req, res) => {
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id as string)).limit(1);
  const productId = req.params.id as string;
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  const updates = req.body as Partial<typeof productsTable.$inferInsert>;
  const allowed = ["name", "price", "stock", "status", "imageUrl", "description", "tags"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in updates) patch[k] = (updates as Record<string, unknown>)[k];
  const [updated] = await db.update(productsTable).set(patch).where(eq(productsTable.id, req.params.id as string)).returning();
  return res.json({ ok: true, product: updated, syncedAt: new Date().toISOString() });
  const [updated] = await db.update(productsTable).set(patch).where(eq(productsTable.id, productId)).returning();
  res.json({ ok: true, product: updated, syncedAt: new Date().toISOString() });
});

// ── Product Variants (in-memory) ──────────────────────────────────────────────

router.get("/products/:id/variants", async (req, res) => {
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id as string)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  return res.json(productVariants.get(req.params.id as string) ?? []);
});

router.post("/products/:id/variants", requireAdmin, async (req, res) => {
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id as string)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  const variant: Variant = { id: randomUUID(), size: req.body.size ?? "", color: req.body.color ?? "", stock: req.body.stock ?? 0, price: req.body.price ?? null, sku: req.body.sku ?? "" };
  const existing = productVariants.get(req.params.id as string) ?? [];
  productVariants.set(req.params.id as string, [...existing, variant]);
  return res.status(201).json(variant);
});

router.put("/products/:id/variants/:variantId", requireAdmin, (req, res) => {
  const { id, variantId } = req.params;
  const variants = productVariants.get(id as string);
  const productId = req.params.id as string;
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  res.json(productVariants.get(productId) ?? []);
});

router.post("/products/:id/variants", requireAdmin, async (req, res) => {
  const productId = req.params.id as string;
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  const variant: Variant = { id: randomUUID(), size: req.body.size ?? "", color: req.body.color ?? "", stock: req.body.stock ?? 0, price: req.body.price ?? null, sku: req.body.sku ?? "" };
  const existing = productVariants.get(productId) ?? [];
  productVariants.set(productId, [...existing, variant]);
  res.status(201).json(variant);
});

router.put("/products/:id/variants/:variantId", requireAdmin, (req, res) => {
  const id = req.params.id as string;
  const variantId = req.params.variantId as string;
  const variants = productVariants.get(id);
  if (!variants) return res.status(404).json({ error: "Product not found" });
  const idx = variants.findIndex((v) => v.id === variantId);
  if (idx === -1) return res.status(404).json({ error: "Variant not found" });
  variants[idx] = { ...variants[idx], ...req.body };
  productVariants.set(id as string, variants);
  return res.json(variants[idx]);
});

router.delete("/products/:id/variants/:variantId", requireAdmin, (req, res) => {
  const { id, variantId } = req.params;
  const variants = productVariants.get(id as string) ?? [];
  productVariants.set(id as string, variants.filter((v) => v.id !== variantId));
  return res.json({ ok: true });
  const id = req.params.id as string;
  const variantId = req.params.variantId as string;
  const variants = productVariants.get(id) ?? [];
  productVariants.set(id, variants.filter((v) => v.id !== variantId));
  res.json({ ok: true });
});

// ── Orders ────────────────────────────────────────────────────────────────────

type OrderItem = { name: string; qty: number; price: number };

router.get("/orders", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  return res.json(rows);
});

router.get("/orders/:id", requireAdmin, async (req, res) => {
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id as string)).limit(1);
  const orderId = req.params.id as string;
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Order not found" });
  return res.json(rows[0]);
});

// ── Eprolo auto-fulfillment helper ───────────────────────────────────────────
async function tryAutoForwardToEprolo(order: typeof ordersTable.$inferSelect, shippingAddress: Record<string, string>) {
  const cfg = getEproloConfig();
  if (!cfg) return;

  const items = Array.isArray(order.items) ? order.items as Array<{ productId?: string; id?: string; quantity?: number }> : [];
  const productIds = items.map(i => i.productId ?? i.id).filter(Boolean) as string[];
  if (!productIds.length) return;

  const eproloProducts = await db.select()
    .from(productsTable)
    .where(like(productsTable.tags, "%eprolo%"));

  const eproloProductIds = new Set(eproloProducts.map(p => p.id));
  const eproloItems = items.filter(i => eproloProductIds.has(i.productId ?? i.id ?? ""));

  if (!eproloItems.length) return;

  try {
    const fulfillmentItems = eproloItems.map(i => ({
      variantId: i.productId ?? i.id ?? "",
      quantity: i.quantity ?? 1,
    }));

    const addr = shippingAddress;
    const eproloOrderId = await eprolo.createOrder(cfg, {
      orderId: order.id,
      customer: {
        name:         addr.name        || order.customerName || "Valued Customer",
        phone:        addr.phone       || "0000000000",
        address:      addr.address     || addr.line1 || "N/A",
        city:         addr.city        || "New York",
        province:     addr.state       || "New York",
        provinceCode: addr.stateCode   || addr.state || "NY",
        postCode:     addr.postalCode  || "10001",
        country:      addr.country     || "United States",
        countryCode:  addr.countryCode || "US",
      },
      items: fulfillmentItems,
    });

    console.log(`[Eprolo] Auto-forwarded order ${order.id} → Eprolo order ${eproloOrderId}`);
  } catch (err) {
    console.error(`[Eprolo] Auto-forward failed for order ${order.id}:`, err instanceof Error ? err.message : err);
  }
}

// Public checkout endpoint — no auth required (called by storefront)
router.post("/orders", async (req, res) => {
  const { customerName, customerEmail, total, items, shippingAddress } = req.body as {
    customerName?: string; customerEmail?: string; total?: number;
    items?: unknown[]; shippingAddress?: Record<string, string>;
  };
  if (!customerEmail || !total) return res.status(400).json({ error: "customerEmail and total are required" });
  const [order] = await db.insert(ordersTable).values({
    id: randomUUID(),
    customerName: customerName ?? "Guest",
    customerEmail,
    total: Math.round(total),
    status: "PENDING",
    items: (items as any) ?? [],
    items: (items ?? []) as OrderItem[],
  }).returning();
  eventBus.publish({ type: "new_order", payload: {
    id: order.id,
    customerName: order.customerName ?? "Guest",
    customerEmail: order.customerEmail,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
  }});

  // Fire-and-forget Eprolo fulfillment for dropship items
  tryAutoForwardToEprolo(order, shippingAddress ?? {}).catch(() => {});

  return res.status(201).json(order);
});

router.put("/orders/:id", requireAdmin, async (req, res) => {
  const orderId = req.params.id as string;
  const allowed = ["status"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  const rows = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, req.params.id as string)).returning();
  const rows = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, orderId)).returning();
  if (!rows[0]) return res.status(404).json({ error: "Order not found" });
  eventBus.publish({ type: "order_updated", payload: { id: rows[0].id, status: rows[0].status } });
  return res.json(rows[0]);
});

// ── Categories ────────────────────────────────────────────────────────────────

router.get("/categories", async (_req, res) => {
  const rows = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  const withCount = await Promise.all(rows.map(async (c) => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.categoryId, c.id));
    return { ...c, productCount: count ?? 0 };
  }));
  return res.json(withCount);
});

router.post("/categories", requireAdmin, async (req, res) => {
  const { name, description } = req.body as { name: string; description: string };
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [cat] = await db.insert(categoriesTable).values({ id: randomUUID(), name, slug, description: description ?? "" }).returning();
  return res.status(201).json({ ...cat, productCount: 0 });
});

router.put("/categories/:id", requireAdmin, async (req, res) => {
  const categoryId = req.params.id as string;
  const allowed = ["name", "description"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  if (req.body.name) updates["slug"] = String(req.body.name).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const rows = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, req.params.id as string)).returning();
  const rows = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, categoryId)).returning();
  if (!rows[0]) return res.status(404).json({ error: "Category not found" });
  return res.json(rows[0]);
});

router.delete("/categories/:id", requireAdmin, async (req, res) => {
  await db.delete(categoriesTable).where(eq(categoriesTable.id, req.params.id as string));
  return res.json({ ok: true });
  const categoryId = req.params.id as string;
  await db.delete(categoriesTable).where(eq(categoriesTable.id, categoryId));
  res.json({ ok: true });
});

// ── Blog Posts ────────────────────────────────────────────────────────────────

router.get("/posts", (_req, res) => { return res.json(blogPosts); });

router.post("/posts", requireAdmin, (req, res) => {
  const { title, content, status, authorName } = req.body as Partial<BlogPost>;
  const slug = (title ?? "post").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const post: BlogPost = { id: randomUUID(), title: title ?? "", slug, content: content ?? "", status: status ?? "DRAFT", authorName: authorName ?? "Admin", publishedAt: status === "PUBLISHED" ? new Date().toISOString() : null, createdAt: new Date().toISOString() };
  blogPosts = [post, ...blogPosts];
  return res.status(201).json(post);
});

router.get("/posts/:id", (req, res) => {
  const p = blogPosts.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Post not found" });
  return res.json(p);
});

router.put("/posts/:id", requireAdmin, (req, res) => {
  const idx = blogPosts.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Post not found" });
  const updated = { ...blogPosts[idx], ...req.body };
  if (req.body.status === "PUBLISHED" && !blogPosts[idx].publishedAt) updated.publishedAt = new Date().toISOString();
  blogPosts[idx] = updated;
  return res.json(updated);
});

router.delete("/posts/:id", requireAdmin, (req, res) => {
  blogPosts = blogPosts.filter((x) => x.id !== req.params.id);
  return res.json({ ok: true });
});

// ── Media ─────────────────────────────────────────────────────────────────────

router.get("/media", requireAdmin, (_req, res) => { return res.json(mediaItems); });

router.delete("/media/:id", requireAdmin, (req, res) => {
  mediaItems = mediaItems.filter((x) => x.id !== req.params.id);
  return res.json({ ok: true });
});

router.post("/media/upload", requireAdmin, (_req, res) => {
  const item: MediaItem = { id: randomUUID(), filename: "upload.jpg", url: "", mimeType: "image/jpeg", size: 0, createdAt: new Date().toISOString() };
  mediaItems = [item, ...mediaItems];
  return res.status(201).json(item);
});

// ── Users / Customers ─────────────────────────────────────────────────────────

router.get("/users", requireAdmin, (_req, res) => { return res.json(customers); });

// ── Coupons ───────────────────────────────────────────────────────────────────

router.get("/coupons", requireAdmin, (_req, res) => { return res.json(coupons); });

router.post("/coupons", requireAdmin, (req, res) => {
  const now = new Date().toISOString();
  const coupon: Coupon = {
    id: randomUUID(),
    code: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minOrderAmount: 0,
    maxUses: null,
    usedCount: 0,
    active: true,
    expiresAt: null,
    ...req.body,
    createdAt: now,
    updatedAt: now,
  };
  coupons = [coupon, ...coupons];
  return res.status(201).json(coupon);
});

router.put("/coupons/:id", requireAdmin, (req, res) => {
  const idx = coupons.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Coupon not found" });
  coupons[idx] = { ...coupons[idx], ...req.body, updatedAt: new Date().toISOString() };
  return res.json(coupons[idx]);
});

router.delete("/coupons/:id", requireAdmin, (req, res) => {
  coupons = coupons.filter((x) => x.id !== req.params.id);
  return res.json({ ok: true });
});

// ── Team ──────────────────────────────────────────────────────────────────────

router.get("/team", requireAdmin, (_req, res) => { return res.json(teamMembers); });

router.post("/team/invite", requireAdmin, (req, res) => {
  const { email, role } = req.body as { email: string; role: string };
  const member: TeamMember = { id: randomUUID(), name: "", email, role: role ?? "EDITOR", status: "Invited", invitedAt: new Date().toISOString() };
  teamMembers = [...teamMembers, member];
  return res.status(201).json({ ok: true, token: randomUUID() });
});

router.get("/team/accept", (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token) return res.status(400).json({ error: "token is required" });
  return res.json({ ok: true, email: "" });
});

router.post("/team/accept", (req, res) => {
  const { token, name } = req.body as { token: string; name: string };
  if (!token) return res.status(400).json({ error: "token is required" });
  return res.json({ ok: true, name });
});

export default router;
