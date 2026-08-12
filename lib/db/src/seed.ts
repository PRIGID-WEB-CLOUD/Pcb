import { db, pool } from "./index";
import { categories, products, orders, users } from "./schema";

async function seed() {
  // ── Users ──────────────────────────────────────────────────────────────────
  await db.insert(users).values([
    {
      id: "user-customer",
      name: "Audrey Chen",
      email: "audrey@example.com",
      role: "USER",
    },
    {
      id: "user-admin",
      name: "LUXE Admin",
      email: "admin@luxeboutique.com",
      role: "ADMIN",
    },
  ]).onConflictDoNothing();
  console.log("✓ users");

  // ── Categories ──────────────────────────────────────────────────────────────
  await db.insert(categories).values([
    { id: "cat-rtw",  name: "Ready-to-Wear", slug: "ready-to-wear", description: "Seasonal clothing collections." },
    { id: "cat-acc",  name: "Accessories",   slug: "accessories",   description: "Bags, belts, scarves and more." },
    { id: "cat-foot", name: "Footwear",      slug: "footwear",      description: "Handcrafted shoes and boots." },
    { id: "cat-fine", name: "Fine Jewellery",slug: "fine-jewellery",description: "Precious stones and metals." },
    { id: "cat-home", name: "Maison",        slug: "maison",        description: "Luxury homeware and objects." },
  ]).onConflictDoNothing();
  console.log("✓ categories");

  // ── Products ─────────────────────────────────────────────────────────────────
  const now = Date.now();
  await db.insert(products).values([
    {
      id: "prod-001", name: "Cashmere Overcoat", price: 1850, categoryId: "cat-rtw", stock: 12,
      imageUrl: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=987&auto=format&fit=crop",
      description: "Crafted from Grade-A Mongolian cashmere.", tags: "cashmere,coat,winter",
      createdAt: new Date(now - 86400000 * 10),
    },
    {
      id: "prod-002", name: "Silk Charmeuse Blouse", price: 620, categoryId: "cat-rtw", stock: 28,
      imageUrl: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?q=80&w=987&auto=format&fit=crop",
      description: "Hand-finished silk charmeuse, ivory.", tags: "silk,blouse",
      createdAt: new Date(now - 86400000 * 8),
    },
    {
      id: "prod-003", name: "Alligator Derby Shoes", price: 3400, categoryId: "cat-foot", stock: 3,
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop",
      description: "Full-grain alligator leather, hand-lasted.", tags: "shoes,leather",
      createdAt: new Date(now - 86400000 * 5),
    },
    {
      id: "prod-004", name: "Gold-Clasp Evening Bag", price: 980, categoryId: "cat-acc", stock: 15,
      imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=2069&auto=format&fit=crop",
      description: "18k gold-plated clasp, satin lining.", tags: "bag,evening",
      createdAt: new Date(now - 86400000 * 3),
    },
    {
      id: "prod-005", name: "Merino Turtleneck", price: 290, categoryId: "cat-rtw", stock: 40,
      imageUrl: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=1964&auto=format&fit=crop",
      description: "Extra-fine 18.5-micron merino.", tags: "merino,knitwear",
      createdAt: new Date(now - 86400000 * 1),
    },
    {
      id: "prod-006", name: "Wide-Brim Felt Hat", price: 420, categoryId: "cat-acc", stock: 22,
      imageUrl: "https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?q=80&w=987&auto=format&fit=crop",
      description: "Italian felt, hand-shaped brim and grosgrain ribbon.", tags: "hat,accessories",
      createdAt: new Date(now - 86400000 * 0.5),
    },
  ]).onConflictDoNothing();
  console.log("✓ products");

  // ── Orders ──────────────────────────────────────────────────────────────────
  await db.insert(orders).values([
    { id: "ord-001", userId: "user-customer", total: 1600, status: "DELIVERED", createdAt: new Date(now - 86400000 * 7) },
    { id: "ord-002", userId: "user-customer", total: 1850, status: "PROCESSING", createdAt: new Date(now - 86400000 * 2) },
    { id: "ord-003", userId: "user-customer", total: 3400, status: "PENDING", createdAt: new Date(now - 86400000 * 1) },
  ]).onConflictDoNothing();
  console.log("✓ orders");

  await pool.end();
  console.log("✓ seed complete");
}

seed().catch((err) => { console.error(err); process.exit(1); });
