import { randomUUID } from "crypto";
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
  ]).onConflictDoNothing();
  console.log("✓ categories");

  // ── Products ────────────────────────────────────────────────────────────────
  const now = Date.now();
  await db.insert(productsTable).values([
    { id: randomUUID(), name: "Cashmere Overcoat",      price: 1850, categoryId: "cat-rtw",  stock: 12, description: "Crafted from Grade-A Mongolian cashmere.", tags: "cashmere,coat,winter", createdAt: new Date(now - 86400000 * 10) },
    { id: randomUUID(), name: "Silk Charmeuse Blouse",  price: 620,  categoryId: "cat-rtw",  stock: 28, description: "Hand-finished silk charmeuse, ivory.",      tags: "silk,blouse",         createdAt: new Date(now - 86400000 * 8)  },
    { id: randomUUID(), name: "Alligator Derby Shoes",  price: 3400, categoryId: "cat-foot", stock: 3,  description: "Full-grain alligator leather, hand-lasted.", tags: "shoes,leather",       createdAt: new Date(now - 86400000 * 5)  },
    { id: randomUUID(), name: "Gold-Clasp Evening Bag", price: 980,  categoryId: "cat-acc",  stock: 15, description: "18k gold-plated clasp, satin lining.",      tags: "bag,evening",         createdAt: new Date(now - 86400000 * 3)  },
    { id: randomUUID(), name: "Merino Turtleneck",      price: 290,  categoryId: "cat-rtw",  stock: 40, description: "Extra-fine 18.5-micron merino.",             tags: "merino,knitwear",     createdAt: new Date(now - 86400000 * 1)  },
  ]).onConflictDoNothing();
  console.log("✓ products");

  // ── Orders ──────────────────────────────────────────────────────────────────
  await db.insert(ordersTable).values([
    { id: randomUUID(), customerEmail: "audrey@example.com",   customerName: "Audrey Chen",    status: "DELIVERED",  total: 1600, items: [{ name: "Silk Charmeuse Blouse", qty: 1, price: 620 }, { name: "Gold-Clasp Evening Bag", qty: 1, price: 980 }], createdAt: new Date(now - 86400000 * 7)   },
    { id: randomUUID(), customerEmail: "marcus@example.com",   customerName: "Marcus Webb",    status: "PROCESSING", total: 1850, items: [{ name: "Cashmere Overcoat",       qty: 1, price: 1850 }],                                                        createdAt: new Date(now - 86400000 * 2)   },
    { id: randomUUID(), customerEmail: "isabelle@example.com", customerName: "Isabelle Morel", status: "PENDING",    total: 3400, items: [{ name: "Alligator Derby Shoes",   qty: 1, price: 3400 }],                                                        createdAt: new Date(now - 86400000 * 1)   },
    { id: randomUUID(), customerEmail: "james@example.com",    customerName: "James Harlow",   status: "SHIPPED",    total: 580,  items: [{ name: "Merino Turtleneck",       qty: 2, price: 290  }],                                                        createdAt: new Date(now - 86400000 * 0.5) },
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
      id:           randomUUID(),
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
