import { Router } from "express";
import { randomUUID } from "crypto";
import { db, productsTable, categoriesTable, ordersTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin";
import { validate } from "../middleware/validate";
import { z } from "zod";

const router = Router();

// ── Types (non-DB: variants, media, team, coupons still in-memory) ─────────────

interface Variant    { id: string; size: string; color: string; stock: number; price: number | null; sku: string; }
interface MediaItem  { id: string; filename: string; url: string; mimeType: string; size: number; createdAt: string; }
interface Customer   { id: string; name: string; email: string; totalOrders: number; totalSpent: number; createdAt: string; }
interface Coupon     { id: string; code: string; type: "percent" | "fixed"; value: number; usageCount: number; active: boolean; expiresAt: string | null; }
interface TeamMember { id: string; name: string; email: string; role: string; status: string; invitedAt: string; }
interface BlogPost   { id: string; title: string; slug: string; content: string; status: string; authorName: string; publishedAt: string | null; createdAt: string; }

// In-memory (not migrated to DB yet)
const productVariants = new Map<string, Variant[]>();
let mediaItems: MediaItem[] = [
  { id: randomUUID(), filename: "hero-overcoat.jpg",    url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800", mimeType: "image/jpeg", size: 248000, createdAt: new Date().toISOString() },
  { id: randomUUID(), filename: "accessories-edit.jpg", url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800",   mimeType: "image/jpeg", size: 195000, createdAt: new Date().toISOString() },
];
let customers: Customer[] = [
  { id: "c1", name: "Audrey Chen",    email: "audrey@example.com",   totalOrders: 3, totalSpent: 7420,  createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: "c2", name: "Marcus Webb",    email: "marcus@example.com",   totalOrders: 2, totalSpent: 5240,  createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: "c3", name: "Isabelle Morel", email: "isabelle@example.com", totalOrders: 5, totalSpent: 12800, createdAt: new Date(Date.now() - 86400000 * 60).toISOString() },
  { id: "c4", name: "James Harlow",   email: "james@example.com",    totalOrders: 1, totalSpent: 580,   createdAt: new Date(Date.now() - 86400000 * 5).toISOString()  },
];
let coupons: Coupon[] = [
  { id: randomUUID(), code: "LUXE20",    type: "percent", value: 20, usageCount: 34,  active: true,  expiresAt: null },
  { id: randomUUID(), code: "WELCOME10", type: "percent", value: 10, usageCount: 127, active: true,  expiresAt: null },
  { id: randomUUID(), code: "FLAT50",    type: "fixed",   value: 50, usageCount: 12,  active: false, expiresAt: "2025-12-31T23:59:59Z" },
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
  res.status(201).json(await enrichProduct(p));
});

router.get("/products/:id", async (req, res) => {
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  res.json(await enrichProduct(rows[0]));
});

router.put("/products/:id", requireAdmin, async (req, res) => {
  const allowed = ["name", "price", "categoryId", "stock", "trackQuantity", "status", "imageUrl", "description", "tags"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  const rows = await db.update(productsTable).set(updates).where(eq(productsTable.id, req.params.id)).returning();
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  res.json(await enrichProduct(rows[0]));
});

router.delete("/products/:id", requireAdmin, async (req, res) => {
  productVariants.delete(req.params.id);
  await db.delete(productsTable).where(eq(productsTable.id, req.params.id));
  res.json({ ok: true });
});

// ── Product Variants (in-memory) ──────────────────────────────────────────────

router.get("/products/:id/variants", async (req, res) => {
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  res.json(productVariants.get(req.params.id) ?? []);
});

router.post("/products/:id/variants", requireAdmin, async (req, res) => {
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  const variant: Variant = { id: randomUUID(), size: req.body.size ?? "", color: req.body.color ?? "", stock: req.body.stock ?? 0, price: req.body.price ?? null, sku: req.body.sku ?? "" };
  const existing = productVariants.get(req.params.id) ?? [];
  productVariants.set(req.params.id, [...existing, variant]);
  res.status(201).json(variant);
});

router.put("/products/:id/variants/:variantId", requireAdmin, (req, res) => {
  const { id, variantId } = req.params;
  const variants = productVariants.get(id);
  if (!variants) return res.status(404).json({ error: "Product not found" });
  const idx = variants.findIndex((v) => v.id === variantId);
  if (idx === -1) return res.status(404).json({ error: "Variant not found" });
  variants[idx] = { ...variants[idx], ...req.body };
  productVariants.set(id, variants);
  res.json(variants[idx]);
});

router.delete("/products/:id/variants/:variantId", requireAdmin, (req, res) => {
  const { id, variantId } = req.params;
  const variants = productVariants.get(id) ?? [];
  productVariants.set(id, variants.filter((v) => v.id !== variantId));
  res.json({ ok: true });
});

// ── Orders ────────────────────────────────────────────────────────────────────

router.get("/orders", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  res.json(rows);
});

router.get("/orders/:id", requireAdmin, async (req, res) => {
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Order not found" });
  res.json(rows[0]);
});

router.put("/orders/:id", requireAdmin, async (req, res) => {
  const allowed = ["status"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  const rows = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, req.params.id)).returning();
  if (!rows[0]) return res.status(404).json({ error: "Order not found" });
  res.json(rows[0]);
});

// ── Categories ────────────────────────────────────────────────────────────────

router.get("/categories", async (_req, res) => {
  const rows = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  const withCount = await Promise.all(rows.map(async (c) => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.categoryId, c.id));
    return { ...c, productCount: count ?? 0 };
  }));
  res.json(withCount);
});

router.post("/categories", requireAdmin, async (req, res) => {
  const { name, description } = req.body as { name: string; description: string };
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [cat] = await db.insert(categoriesTable).values({ id: randomUUID(), name, slug, description: description ?? "" }).returning();
  res.status(201).json({ ...cat, productCount: 0 });
});

router.put("/categories/:id", requireAdmin, async (req, res) => {
  const allowed = ["name", "description"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  if (req.body.name) updates["slug"] = String(req.body.name).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const rows = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, req.params.id)).returning();
  if (!rows[0]) return res.status(404).json({ error: "Category not found" });
  res.json(rows[0]);
});

router.delete("/categories/:id", requireAdmin, async (req, res) => {
  await db.delete(categoriesTable).where(eq(categoriesTable.id, req.params.id));
  res.json({ ok: true });
});

// ── Blog Posts ────────────────────────────────────────────────────────────────

router.get("/posts", (_req, res) => { res.json(blogPosts); });

router.post("/posts", requireAdmin, (req, res) => {
  const { title, content, status, authorName } = req.body as Partial<BlogPost>;
  const slug = (title ?? "post").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const post: BlogPost = { id: randomUUID(), title: title ?? "", slug, content: content ?? "", status: status ?? "DRAFT", authorName: authorName ?? "Admin", publishedAt: status === "PUBLISHED" ? new Date().toISOString() : null, createdAt: new Date().toISOString() };
  blogPosts = [post, ...blogPosts];
  res.status(201).json(post);
});

router.get("/posts/:id", (req, res) => {
  const p = blogPosts.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Post not found" });
  res.json(p);
});

router.put("/posts/:id", requireAdmin, (req, res) => {
  const idx = blogPosts.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Post not found" });
  const updated = { ...blogPosts[idx], ...req.body };
  if (req.body.status === "PUBLISHED" && !blogPosts[idx].publishedAt) updated.publishedAt = new Date().toISOString();
  blogPosts[idx] = updated;
  res.json(updated);
});

router.delete("/posts/:id", requireAdmin, (req, res) => {
  blogPosts = blogPosts.filter((x) => x.id !== req.params.id);
  res.json({ ok: true });
});

// ── Media ─────────────────────────────────────────────────────────────────────

router.get("/media", requireAdmin, (_req, res) => { res.json(mediaItems); });

router.delete("/media/:id", requireAdmin, (req, res) => {
  mediaItems = mediaItems.filter((x) => x.id !== req.params.id);
  res.json({ ok: true });
});

router.post("/media/upload", requireAdmin, (_req, res) => {
  const item: MediaItem = { id: randomUUID(), filename: "upload.jpg", url: "", mimeType: "image/jpeg", size: 0, createdAt: new Date().toISOString() };
  mediaItems = [item, ...mediaItems];
  res.status(201).json(item);
});

// ── Users / Customers ─────────────────────────────────────────────────────────

router.get("/users", requireAdmin, (_req, res) => { res.json(customers); });

// ── Coupons ───────────────────────────────────────────────────────────────────

router.get("/coupons", requireAdmin, (_req, res) => { res.json(coupons); });

router.post("/coupons", requireAdmin, (req, res) => {
  const coupon: Coupon = { id: randomUUID(), code: "", type: "percent", value: 10, usageCount: 0, active: true, expiresAt: null, ...req.body };
  coupons = [coupon, ...coupons];
  res.status(201).json(coupon);
});

router.put("/coupons/:id", requireAdmin, (req, res) => {
  const idx = coupons.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Coupon not found" });
  coupons[idx] = { ...coupons[idx], ...req.body };
  res.json(coupons[idx]);
});

router.delete("/coupons/:id", requireAdmin, (req, res) => {
  coupons = coupons.filter((x) => x.id !== req.params.id);
  res.json({ ok: true });
});

// ── Team ──────────────────────────────────────────────────────────────────────

router.get("/team", requireAdmin, (_req, res) => { res.json(teamMembers); });

router.post("/team/invite", requireAdmin, (req, res) => {
  const { email, role } = req.body as { email: string; role: string };
  const member: TeamMember = { id: randomUUID(), name: "", email, role: role ?? "EDITOR", status: "Invited", invitedAt: new Date().toISOString() };
  teamMembers = [...teamMembers, member];
  res.status(201).json({ ok: true, token: randomUUID() });
});

router.get("/team/accept", (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token) return res.status(400).json({ error: "token is required" });
  res.json({ ok: true, email: "" });
});

router.post("/team/accept", (req, res) => {
  const { token, name } = req.body as { token: string; name: string };
  if (!token) return res.status(400).json({ error: "token is required" });
  res.json({ ok: true, name });
});

export default router;
