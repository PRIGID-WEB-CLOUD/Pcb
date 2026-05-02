import { Router } from "express";
import { db } from "@workspace/db";
import { categories, products } from "@workspace/db/schema";
import { getSession } from "../lib/auth";

const router = Router();

router.use(async (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }
  const user = await getSession(req);
  if (!user || user.role !== "ADMIN") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

const SEED_CATEGORIES = [
  { name: "Monochrome" },
  { name: "Accessories" },
  { name: "Footwear" },
  { name: "Outerwear" },
  { name: "Tailoring" },
];

const SEED_PRODUCTS = [
  { name: "Architectural Silk Blazer", description: "A masterwork in structured tailoring, crafted from the finest Habotai silk sourced from heritage mills in Como, Italy.", price: 2850, imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop", category: "Monochrome" },
  { name: "Precision-Cut Trousers", description: "Fluid wool-cashmere trousers with a high-waisted silhouette and razor-sharp creases.", price: 1290, imageUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4b4de2?q=80&w=800&auto=format&fit=crop", category: "Monochrome" },
  { name: "Heritage Wool Overcoat", description: "A sculptural overcoat in double-faced cashmere wool with minimal stitching and a floating lining.", price: 4200, imageUrl: "https://images.unsplash.com/photo-1578932750294-f5075e85f44a?q=80&w=800&auto=format&fit=crop", category: "Outerwear" },
  { name: "Minimal Leather Tote", description: "Vegetable-tanned full-grain leather tote, hand-stitched in our London atelier.", price: 1680, imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop", category: "Accessories" },
  { name: "Swiss Chronograph Watch", description: "An in-house movement visible through a sapphire crystal caseback, encased in brushed Grade 5 titanium.", price: 8900, imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop", category: "Accessories" },
  { name: "Handcrafted Derby Shoes", description: "Goodyear-welted calfskin Derby shoes from our Northampton artisans, built for a lifetime of wear.", price: 1450, imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop", category: "Footwear" },
  { name: "Cashmere Rollneck Sweater", description: "Two-ply Mongolian cashmere sweater in a slim-fit rollneck silhouette, pre-washed for immediate softness.", price: 890, imageUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4b4de2?q=80&w=800&auto=format&fit=crop", category: "Monochrome" },
  { name: "Bespoke Silk Tie", description: "Seven-fold silk grenadine tie, hand-rolled and finished with a bar-tack in our London workshop.", price: 280, imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop", category: "Accessories" },
  { name: "Structured Suit Jacket", description: "Half-canvas construction in S130s Super Fine Merino, chest pocket with a surgeons cuff.", price: 3100, imageUrl: "https://images.unsplash.com/photo-1593032465175-481ac7f401a0?q=80&w=800&auto=format&fit=crop", category: "Tailoring" },
  { name: "Chelsea Boots in Black Calf", description: "Sleek Chelsea boots in polished black calfskin with an elasticated side panel and leather sole.", price: 1200, imageUrl: "https://images.unsplash.com/photo-1555234139-3e2ecb4ab59f?q=80&w=800&auto=format&fit=crop", category: "Footwear" },
  { name: "Raw Silk Shirt", description: "Relaxed raw silk shirt with a subtle slubbed texture, mother-of-pearl buttons, and a spread collar.", price: 620, imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop", category: "Monochrome" },
  { name: "Lambskin Leather Gloves", description: "Unlined lambskin gloves with a cashmere interior lining and a snap-button wrist fastening.", price: 340, imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop", category: "Accessories" },
];

router.post("/", async (req, res) => {
  try {
    const categoryMap: Record<string, string> = {};
    for (const cat of SEED_CATEGORIES) {
      const [inserted] = await db.insert(categories).values(cat).onConflictDoNothing().returning();
      const existing = inserted || (await db.select().from(categories).where((t) => {
        const { eq } = require("drizzle-orm");
        return eq(t.name, cat.name);
      }).limit(1))[0];
      if (existing) categoryMap[cat.name] = existing.id;
    }

    const allCats = await db.select().from(categories);
    for (const cat of allCats) categoryMap[cat.name] = cat.id;

    for (const prod of SEED_PRODUCTS) {
      const categoryId = categoryMap[prod.category];
      if (!categoryId) continue;
      await db.insert(products).values({
        name: prod.name, description: prod.description, price: prod.price,
        imageUrl: prod.imageUrl, categoryId,
      }).onConflictDoNothing();
    }

    res.json({ message: "Seed completed", categories: allCats.length });
  } catch (err: any) {
    console.error("Seed error:", err);
    res.status(500).json({ error: "Seed failed", details: err.message });
  }
});

export default router;
