import { db, pool } from "./index";
import { categoriesTable, productsTable, ordersTable, usersTable } from "./schema";

function simpleHash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return String(h >>> 0);
}

async function seed() {
  // ── Categories ──────────────────────────────────────────────────────────────
  await db.insert(categoriesTable).values([
    { id: "cat-rtw",  name: "Ready-to-Wear", slug: "ready-to-wear", description: "Seasonal clothing collections." },
    { id: "cat-acc",  name: "Accessories",   slug: "accessories",   description: "Bags, belts, scarves and more." },
    { id: "cat-foot", name: "Footwear",      slug: "footwear",      description: "Handcrafted shoes and boots." },
    { id: "cat-fine", name: "Fine Jewellery",slug: "fine-jewellery",description: "Precious stones and metals." },
    { id: "cat-home", name: "Maison",        slug: "maison",        description: "Luxury homeware and objects." },
  ]).onConflictDoNothing();
  console.log("✓ categories");

  // ── Products ─────────────────────────────────────────────────────────────────
  // Fixed IDs so re-running is idempotent (onConflictDoNothing)
  const now = Date.now();
  await db.insert(productsTable).values([
    // ── New Arrivals (shown first on homepage) ──
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
    // ── Trending Now (shown in second product row) ──
    {
      id: "prod-007", name: "Leather Trench Coat", price: 2200, categoryId: "cat-rtw", stock: 8,
      imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1036&auto=format&fit=crop",
      description: "Butter-soft lambskin, fully lined in silk.", tags: "leather,coat",
      createdAt: new Date(now - 86400000 * 14),
    },
    {
      id: "prod-008", name: "Diamond Tennis Bracelet", price: 5800, categoryId: "cat-fine", stock: 5,
      imageUrl: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=2070&auto=format&fit=crop",
      description: "2.4ct total weight, VS1 clarity, 18k white gold.", tags: "jewellery,diamond",
      createdAt: new Date(now - 86400000 * 12),
    },
    {
      id: "prod-009", name: "Suede Chelsea Boots", price: 890, categoryId: "cat-foot", stock: 18,
      imageUrl: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?q=80&w=987&auto=format&fit=crop",
      description: "Premium Spanish suede, leather-lined, Goodyear welt.", tags: "boots,suede",
      createdAt: new Date(now - 86400000 * 9),
    },
    {
      id: "prod-010", name: "Linen Blazer", price: 740, categoryId: "cat-rtw", stock: 20,
      imageUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4b4e27?q=80&w=2080&auto=format&fit=crop",
      description: "Unstructured Belgian linen in oatmeal.", tags: "blazer,linen,summer",
      createdAt: new Date(now - 86400000 * 6),
    },
    {
      id: "prod-011", name: "Silk Scarf — Botanical", price: 310, categoryId: "cat-acc", stock: 35,
      imageUrl: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?q=80&w=2070&auto=format&fit=crop",
      description: "Hand-rolled edges, 100% Mulberry silk, original print.", tags: "scarf,silk",
      createdAt: new Date(now - 86400000 * 4),
    },
  ]).onConflictDoNothing();
  console.log("✓ products");

  // ── Orders ──────────────────────────────────────────────────────────────────
  await db.insert(ordersTable).values([
    { id: "ord-001", customerEmail: "audrey@example.com",   customerName: "Audrey Chen",    status: "DELIVERED",  total: 1600, items: [{ name: "Silk Charmeuse Blouse", qty: 1, price: 620 }, { name: "Gold-Clasp Evening Bag", qty: 1, price: 980 }], createdAt: new Date(now - 86400000 * 7)   },
    { id: "ord-002", customerEmail: "marcus@example.com",   customerName: "Marcus Webb",    status: "PROCESSING", total: 1850, items: [{ name: "Cashmere Overcoat",       qty: 1, price: 1850 }],                                                        createdAt: new Date(now - 86400000 * 2)   },
    { id: "ord-003", customerEmail: "isabelle@example.com", customerName: "Isabelle Morel", status: "PENDING",    total: 3400, items: [{ name: "Alligator Derby Shoes",   qty: 1, price: 3400 }],                                                        createdAt: new Date(now - 86400000 * 1)   },
    { id: "ord-004", customerEmail: "james@example.com",    customerName: "James Harlow",   status: "SHIPPED",    total: 580,  items: [{ name: "Merino Turtleneck",       qty: 2, price: 290  }],                                                        createdAt: new Date(now - 86400000 * 0.5) },
    { id: "ord-005", customerEmail: "sophia@example.com",   customerName: "Sophia Laurent", status: "DELIVERED",  total: 5800, items: [{ name: "Diamond Tennis Bracelet", qty: 1, price: 5800 }],                                                        createdAt: new Date(now - 86400000 * 15)  },
    { id: "ord-006", customerEmail: "theo@example.com",     customerName: "Theo Hartmann",  status: "PROCESSING", total: 2200, items: [{ name: "Leather Trench Coat",     qty: 1, price: 2200 }],                                                        createdAt: new Date(now - 86400000 * 3)   },
  ]).onConflictDoNothing();
  console.log("✓ orders");

  // ── Super-admin user (only if no admin exists yet) ──────────────────────────
  const { eq, or } = await import("drizzle-orm");
  const existing = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.role, "ADMIN"), eq(usersTable.role, "SUPER_ADMIN")))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(usersTable).values({
      id:           "user-super-admin",
      name:         "LUXE Admin",
      email:        "admin@luxeboutique.com",
      role:         "SUPER_ADMIN",
      passwordHash: "",
    }).onConflictDoNothing();
    console.log("✓ super admin user seeded (admin@luxeboutique.com)");
  } else {
    console.log("✓ admin already exists, skipping");
  }

  await pool.end();
  console.log("✓ seed complete");
}

seed().catch((err) => { console.error(err); process.exit(1); });
