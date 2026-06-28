import cron from "node-cron";
import { db } from "@workspace/db";
import { jobRuns } from "@workspace/db/schema";
import { runTwitterQueueJob } from "./twitterQueueRunner";
import { runTwitterAutoRulesJob } from "./twitterAutoRules";
import { runWhatsappJourneysJob } from "./whatsappJourneys";
import { runFacebookAdsSyncJob } from "./facebookAdsSync";

export async function logJobRun(
  jobName: string,
  status: "success" | "failed",
  startedAt: Date,
  error?: string,
): Promise<void> {
  try {
    await db.insert(jobRuns).values({ jobName, status, startedAt, finishedAt: new Date(), error: error ?? null });
  } catch (e) {
    console.error("[Jobs] Failed to log job run:", e);
  }
}

export function startJobs(): void {
  console.log("[Jobs] Registering background jobs...");

  cron.schedule("* * * * *", async () => {
    try { await runTwitterQueueJob(); }
    catch (e) { console.error("[Jobs] Uncaught error in twitterQueueRunner:", e); }
  });

  cron.schedule("*/15 * * * *", async () => {
    try { await runTwitterAutoRulesJob(); }
    catch (e) { console.error("[Jobs] Uncaught error in twitterAutoRules:", e); }
  });

  cron.schedule("*/5 * * * *", async () => {
    try { await runWhatsappJourneysJob(); }
    catch (e) { console.error("[Jobs] Uncaught error in whatsappJourneys:", e); }
  });

  cron.schedule("*/15 * * * *", async () => {
    try { await runFacebookAdsSyncJob(); }
    catch (e) { console.error("[Jobs] Uncaught error in facebookAdsSync:", e); }
  });

  console.log("[Jobs] All background jobs registered ✓");
}
