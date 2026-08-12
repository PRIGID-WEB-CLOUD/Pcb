import { db } from "@workspace/db";
import { twitterAutoRules, twitterContentTemplates, twitterTweetQueue, products } from "@workspace/db/schema";
import { eq, gt, lte, and } from "drizzle-orm";
import { logJobRun } from "./index";

export async function runTwitterAutoRulesJob(): Promise<void> {
  const startedAt = new Date();
  try {
    const activeRules = await db.select().from(twitterAutoRules).where(eq(twitterAutoRules.active, true));
    if (!activeRules.length) return;

    console.log(`[Twitter Rules] Checking ${activeRules.length} active rule(s)...`);
    const now = new Date();

    for (const rule of activeRules) {
      try {
        const since = rule.lastFiredAt ?? new Date(0);
        let matchingProducts: { id: string; name: string; price: number; stock: number }[] = [];

        if (rule.trigger === "new_arrival") {
          matchingProducts = await db
            .select({ id: products.id, name: products.name, price: products.price, stock: products.stock })
            .from(products)
            .where(and(eq(products.status, "ACTIVE"), gt(products.createdAt, since)));
        } else if (rule.trigger === "low_stock") {
          matchingProducts = await db
            .select({ id: products.id, name: products.name, price: products.price, stock: products.stock })
            .from(products)
            .where(and(
              eq(products.trackQuantity, true),
              lte(products.stock, 5),
              gt(products.stock, 0),
              gt(products.updatedAt, since),
            ));
        } else if (rule.trigger === "back_in_stock") {
          matchingProducts = await db
            .select({ id: products.id, name: products.name, price: products.price, stock: products.stock })
            .from(products)
            .where(and(eq(products.trackQuantity, true), gt(products.stock, 0), gt(products.updatedAt, since)));
        }

        if (!matchingProducts.length) continue;

        const [template] = await db
          .select()
          .from(twitterContentTemplates)
          .where(eq(twitterContentTemplates.name, rule.template))
          .limit(1);

        if (!template) {
          console.log(`[Twitter Rules] Template "${rule.template}" not found — skipping rule ${rule.id}`);
          continue;
        }

        for (const product of matchingProducts) {
          let text = template.body
            .replace(/\{name\}/g, product.name)
            .replace(/\{price\}/g, `$${product.price.toFixed(2)}`)
            .replace(/\{stock\}/g, String(product.stock));

          if (text.length > 280) text = text.slice(0, 277) + "...";

          await db.insert(twitterTweetQueue).values({
            text,
            scheduledFor: now.toISOString(),
            status: "Queued",
            imageStyle: "Single Product High-Res",
          });
          console.log(`[Twitter Rules] Queued tweet for rule "${rule.trigger}" → product "${product.name}"`);
        }

        await db
          .update(twitterAutoRules)
          .set({ lastFiredAt: now, firedCount: (rule.firedCount ?? 0) + matchingProducts.length })
          .where(eq(twitterAutoRules.id, rule.id));
      } catch (err: any) {
        console.error(`[Twitter Rules] Error on rule ${rule.id}:`, err);
      }
    }

    await logJobRun("twitterAutoRules", "success", startedAt);
  } catch (err: any) {
    console.error("[Twitter Rules] Job error:", err);
    await logJobRun("twitterAutoRules", "failed", startedAt, err.message);
  }
}
