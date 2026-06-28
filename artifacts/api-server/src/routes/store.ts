import { Router } from "express";
import { randomUUID } from "crypto";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

// ── Type definitions ──────────────────────────────────────────────────────────

interface Category  { id: string; name: string; slug: string; description: string; productCount: number; }
interface Variant   { id: string; size: string; color: string; stock: number; price: number | null; sku: string; }
interface Product   { id: string; name: string; price: number; categoryId: string; category: { id: string; name: string } | null; stock: number; trackQuantity: boolean; status: string; imageUrl: string | null; description: string; tags: string | null; variants: Variant[]; createdAt: string; }
interface Order     { id: string; customerId: string; customerEmail: string; customerName: string; status: string; total: number; items: { name: string; qty: number; price: number }[]; createdAt: string; }
interface BlogPost  { id: string; title: string; slug: string; content: string; status: string; authorName: string; publishedAt: string | null; createdAt: string; }
interface MediaItem { id: string; filename: string; url: string; mimeType: string; size: number; createdAt: string; }
interface Customer  { id: string; name: string; email: string; totalOrders: number; totalSpent: number; createdAt: string; }
interface Coupon    { id: string; code: string; type: "percent" | "fixed"; value: number; usageCount: number; active: boolean; expiresAt: string | null; }
interface TeamMember{ id: string; name: string; email: string; role: string; status: string; invitedAt: string; }

// ── Seed data ─────────────────────────────────────────────────────────────────

let categories: Category[] = [
  { id: "cat-rtw",  name: "Ready-to-Wear", slug: "ready-to-wear", description: "Seasonal clothing collections.", productCount: 3 },
  { id: "cat-acc",  name: "Accessories",   slug: "accessories",   description: "Bags, belts, scarves and more.",  productCount: 1 },
  { id: "cat-foot", name: "Footwear",      slug: "footwear",      description: "Handcrafted shoes and boots.",    productCount: 1 },
];

function catById(id: string) { return categories.find((c) => c.id === id) ?? null; }
function catShape(cat: Category | null) { return cat ? { id: cat.id, name: cat.name } : null; }

let products: Product[] = [
  { id: randomUUID(), name: "Cashmere Overcoat",      price: 1850, categoryId: "cat-rtw",  category: { id: "cat-rtw",  name: "Ready-to-Wear" }, stock: 12, trackQuantity: true,  status: "ACTIVE", imageUrl: null, description: "Crafted from Grade-A Mongolian cashmere.", tags: "cashmere,coat,winter", variants: [], createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: randomUUID(), name: "Silk Charmeuse Blouse",  price: 620,  categoryId: "cat-rtw",  category: { id: "cat-rtw",  name: "Ready-to-Wear" }, stock: 28, trackQuantity: true,  status: "ACTIVE", imageUrl: null, description: "Hand-finished silk charmeuse, ivory.",      tags: "silk,blouse",         variants: [], createdAt: new Date(Date.now() - 86400000 * 8).toISOString()  },
  { id: randomUUID(), name: "Alligator Derby Shoes",  price: 3400, categoryId: "cat-foot", category: { id: "cat-foot", name: "Footwear"       }, stock: 6,  trackQuantity: true,  status: "ACTIVE", imageUrl: null, description: "Full-grain alligator leather, hand-lasted.", tags: "shoes,leather",       variants: [], createdAt: new Date(Date.now() - 86400000 * 5).toISOString()  },
  { id: randomUUID(), name: "Gold-Clasp Evening Bag", price: 980,  categoryId: "cat-acc",  category: { id: "cat-acc",  name: "Accessories"    }, stock: 15, trackQuantity: true,  status: "ACTIVE", imageUrl: null, description: "18k gold-plated clasp, satin lining.",      tags: "bag,evening",         variants: [], createdAt: new Date(Date.now() - 86400000 * 3).toISOString()  },
  { id: randomUUID(), name: "Merino Turtleneck",      price: 290,  categoryId: "cat-rtw",  category: { id: "cat-rtw",  name: "Ready-to-Wear" }, stock: 40, trackQuantity: true,  status: "ACTIVE", imageUrl: null, description: "Extra-fine 18.5-micron merino.",             tags: "merino,knitwear",     variants: [], createdAt: new Date(Date.now() - 86400000 * 1).toISOString()  },
];

const productVariants = new Map<string, Variant[]>(products.map((p) => [p.id, []]));

let orders: Order[] = [
  { id: randomUUID(), customerId: "c1", customerEmail: "audrey@example.com",   customerName: "Audrey Chen",    status: "DELIVERED",  total: 2470, items: [{ name: "Silk Charmeuse Blouse",  qty: 1, price: 620  }, { name: "Gold-Clasp Evening Bag", qty: 1, price: 980 }],  createdAt: new Date(Date.now() - 86400000 * 7).toISOString()  },
  { id: randomUUID(), customerId: "c2", customerEmail: "marcus@example.com",   customerName: "Marcus Webb",    status: "PROCESSING", total: 1850, items: [{ name: "Cashmere Overcoat",       qty: 1, price: 1850 }],                                                          createdAt: new Date(Date.now() - 86400000 * 2).toISOString()  },
  { id: randomUUID(), customerId: "c3", customerEmail: "isabelle@example.com", customerName: "Isabelle Morel", status: "PENDING",    total: 3400, items: [{ name: "Alligator Derby Shoes",   qty: 1, price: 3400 }],                                                          createdAt: new Date(Date.now() - 86400000 * 1).toISOString()  },
  { id: randomUUID(), customerId: "c4", customerEmail: "james@example.com",    customerName: "James Harlow",   status: "SHIPPED",    total: 580,  items: [{ name: "Merino Turtleneck",       qty: 2, price: 290  }],                                                          createdAt: new Date(Date.now() - 43200000).toISOString()      },
];

let blogPosts: BlogPost[] = [
  { id: randomUUID(), title: "The Art of Quiet Luxury",   slug: "quiet-luxury",   content: "Quiet luxury is not about conspicuous logos…", status: "PUBLISHED", authorName: "LUXE BOUTIQUE", publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(), createdAt: new Date(Date.now() - 86400000 * 6).toISOString() },
  { id: randomUUID(), title: "Autumn Collection Preview", slug: "autumn-preview", content: "As the days grow shorter…",                     status: "DRAFT",     authorName: "LUXE BOUTIQUE", publishedAt: null,                                                      createdAt: new Date(Date.now() - 86400000 * 1).toISOString() },
];

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
  { id: randomUUID(), name: "LUXE Admin", email: "admin@luxeboutique.com", role: "OWNER", status: "Active", invitedAt: new Date(Date.now() - 86400000 * 90).toISOString() },
];

// ── Helper: enrich product with variants ──────────────────────────────────────

function enrichProduct(p: Product): Product {
  return { ...p, variants: productVariants.get(p.id) ?? [], category: catShape(catById(p.categoryId)) };
}

// ── Products ──────────────────────────────────────────────────────────────────

router.get("/products", (_req, res) => {
  res.json(products.map(enrichProduct));
});

router.post("/products", requireAdmin, (req, res) => {
  const body = req.body as Partial<Product>;
  const cat = catById(body.categoryId ?? "");
  const p: Product = {
    id: randomUUID(),
    name: body.name ?? "",
    price: body.price ?? 0,
    categoryId: body.categoryId ?? "",
    category: catShape(cat),
    stock: body.stock ?? 0,
    trackQuantity: body.trackQuantity ?? true,
    status: body.status ?? "ACTIVE",
    imageUrl: body.imageUrl ?? null,
    description: body.description ?? "",
    tags: body.tags ?? null,
    variants: [],
    createdAt: new Date().toISOString(),
  };
  products = [p, ...products];
  productVariants.set(p.id, []);
  res.status(201).json(enrichProduct(p));
});

router.get("/products/:id", (req, res) => {
  const p = products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(enrichProduct(p));
});

router.put("/products/:id", requireAdmin, (req, res) => {
  const idx = products.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Product not found" });
  const updated = { ...products[idx], ...req.body };
  if (req.body.categoryId) updated.category = catShape(catById(req.body.categoryId));
  products[idx] = updated;
  res.json(enrichProduct(products[idx]));
});

router.delete("/products/:id", requireAdmin, (req, res) => {
  products = products.filter((x) => x.id !== req.params.id);
  productVariants.delete(req.params.id);
  res.json({ ok: true });
});

// ── Product Variants ──────────────────────────────────────────────────────────

router.get("/products/:id/variants", (req, res) => {
  const { id } = req.params;
  if (!products.find((p) => p.id === id)) return res.status(404).json({ error: "Product not found" });
  res.json(productVariants.get(id) ?? []);
});

router.post("/products/:id/variants", requireAdmin, (req, res) => {
  const { id } = req.params;
  if (!products.find((p) => p.id === id)) return res.status(404).json({ error: "Product not found" });
  const variant: Variant = {
    id: randomUUID(),
    size: req.body.size ?? "",
    color: req.body.color ?? "",
    stock: req.body.stock ?? 0,
    price: req.body.price ?? null,
    sku: req.body.sku ?? "",
  };
  const existing = productVariants.get(id) ?? [];
  productVariants.set(id, [...existing, variant]);
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

router.get("/orders", requireAdmin, (_req, res) => { res.json(orders); });

router.get("/orders/:id", requireAdmin, (req, res) => {
  const o = orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: "Order not found" });
  res.json(o);
});

router.put("/orders/:id", requireAdmin, (req, res) => {
  const idx = orders.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Order not found" });
  orders[idx] = { ...orders[idx], ...req.body };
  res.json(orders[idx]);
});

// ── Categories ────────────────────────────────────────────────────────────────

router.get("/categories", (_req, res) => { res.json(categories); });

router.post("/categories", requireAdmin, (req, res) => {
  const { name, description } = req.body as { name: string; description: string };
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const cat: Category = { id: randomUUID(), name, slug, description, productCount: 0 };
  categories = [cat, ...categories];
  res.status(201).json(cat);
});

router.put("/categories/:id", requireAdmin, (req, res) => {
  const idx = categories.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Category not found" });
  categories[idx] = { ...categories[idx], ...req.body };
  res.json(categories[idx]);
});

router.delete("/categories/:id", requireAdmin, (req, res) => {
  categories = categories.filter((x) => x.id !== req.params.id);
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
