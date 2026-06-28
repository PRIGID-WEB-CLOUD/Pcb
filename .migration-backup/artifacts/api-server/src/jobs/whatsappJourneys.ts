import { db } from "@workspace/db";
import {
  whatsappJourneys, whatsappJourneySteps, whatsappJourneyRuns,
  whatsappContacts, whatsappTemplates, carts, cartItems, users,
} from "@workspace/db/schema";
import { eq, and, lte, lt, inArray, asc } from "drizzle-orm";
import { getCredMap } from "../lib/social/credentials";
import * as WA from "../lib/social/whatsapp";
import { logJobRun } from "./index";

export async function runWhatsappJourneysJob(): Promise<void> {
  const startedAt = new Date();
  try {
    console.log("[WhatsApp Journeys] Starting...");

    const activeJourneys = await db.select().from(whatsappJourneys).where(eq(whatsappJourneys.active, true));
    const now = new Date();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // ── 1. Trigger new runs for abandoned_cart ────────────────────────────────
    const abandonedJourney = activeJourneys.find((j) => j.journeyId === "abandoned_cart");
    if (abandonedJourney) {
      const steps = await db
        .select()
        .from(whatsappJourneySteps)
        .where(eq(whatsappJourneySteps.journeyId, "abandoned_cart"))
        .orderBy(asc(whatsappJourneySteps.stepOrder));

      if (steps.length) {
        const oldCarts = await db
          .select({ cart: carts, user: users })
          .from(carts)
          .innerJoin(users, eq(carts.userId, users.id))
          .where(lt(carts.id, "z")); // select all; filter below

        for (const { cart, user } of oldCarts) {
          const cartItemList = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
          if (!cartItemList.length) continue;

          const existingRun = await db
            .select()
            .from(whatsappJourneyRuns)
            .where(
              and(
                eq(whatsappJourneyRuns.journeyId, "abandoned_cart"),
                eq(whatsappJourneyRuns.userId, user.id),
                inArray(whatsappJourneyRuns.status, ["active"]),
              ),
            )
            .limit(1);

          if (existingRun.length) continue;

          await db.insert(whatsappJourneyRuns).values({
            journeyId: "abandoned_cart",
            customerPhone: user.email,
            userId: user.id,
            currentStep: 0,
            nextStepDueAt: new Date(now.getTime() + steps[0].delayMinutes * 60 * 1000),
            status: "active",
          });
        }
      }
    }

    // ── 2. Process due runs ───────────────────────────────────────────────────
    const dueRuns = await db
      .select()
      .from(whatsappJourneyRuns)
      .where(and(eq(whatsappJourneyRuns.status, "active"), lte(whatsappJourneyRuns.nextStepDueAt, now)));

    if (!dueRuns.length) {
      await logJobRun("whatsappJourneys", "success", startedAt);
      return;
    }

    console.log(`[WhatsApp Journeys] Processing ${dueRuns.length} run(s)...`);

    const credsMap = await getCredMap("whatsapp", ["phone_number_id", "system_access_token"]);
    const hasWaCreds = !!(credsMap.phone_number_id && credsMap.system_access_token);

    for (const run of dueRuns) {
      try {
        // Respect opt-out
        const [contact] = await db
          .select()
          .from(whatsappContacts)
          .where(eq(whatsappContacts.phone, run.customerPhone))
          .limit(1);

        if (contact && !contact.optedIn) {
          await db.update(whatsappJourneyRuns).set({ status: "stopped" }).where(eq(whatsappJourneyRuns.id, run.id));
          continue;
        }

        const steps = await db
          .select()
          .from(whatsappJourneySteps)
          .where(eq(whatsappJourneySteps.journeyId, run.journeyId))
          .orderBy(asc(whatsappJourneySteps.stepOrder));

        if (run.currentStep >= steps.length) {
          await db.update(whatsappJourneyRuns).set({ status: "completed" }).where(eq(whatsappJourneyRuns.id, run.id));
          continue;
        }

        const step = steps[run.currentStep];
        const [template] = await db
          .select()
          .from(whatsappTemplates)
          .where(eq(whatsappTemplates.name, step.templateName))
          .limit(1);

        if (template && hasWaCreds) {
          try {
            await WA.sendTemplateMessage(
              credsMap.phone_number_id,
              credsMap.system_access_token,
              run.customerPhone,
              template.name,
              "en",
            );
            await db
              .update(whatsappTemplates)
              .set({ sentCount: (template.sentCount ?? 0) + 1 })
              .where(eq(whatsappTemplates.id, template.id));
            console.log(`[WhatsApp Journeys] Sent "${template.name}" to ${run.customerPhone}`);
          } catch (e: any) {
            console.error(`[WhatsApp Journeys] Send failed:`, e.message);
          }
        } else {
          console.log(`[WhatsApp Journeys] Would send "${step.templateName}" to ${run.customerPhone} (no creds or template)`);
        }

        const nextStep = run.currentStep + 1;
        const isLast = nextStep >= steps.length;
        await db
          .update(whatsappJourneyRuns)
          .set({
            currentStep: nextStep,
            status: isLast ? "completed" : "active",
            nextStepDueAt: isLast ? null : new Date(now.getTime() + steps[nextStep].delayMinutes * 60 * 1000),
          })
          .where(eq(whatsappJourneyRuns.id, run.id));
      } catch (err: any) {
        console.error(`[WhatsApp Journeys] Error on run ${run.id}:`, err);
      }
    }

    await logJobRun("whatsappJourneys", "success", startedAt);
  } catch (err: any) {
    console.error("[WhatsApp Journeys] Job error:", err);
    await logJobRun("whatsappJourneys", "failed", startedAt, err.message);
  }
}
