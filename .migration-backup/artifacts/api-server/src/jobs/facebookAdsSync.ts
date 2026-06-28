import { db } from "@workspace/db";
import { facebookAdMetrics } from "@workspace/db/schema";
import { getCredMap } from "../lib/social/credentials";
import * as Meta from "../lib/social/meta";
import { logJobRun } from "./index";

export async function runFacebookAdsSyncJob(): Promise<void> {
  const startedAt = new Date();
  try {
    console.log("[Facebook Ads] Syncing ad metrics...");

    const credsMap = await getCredMap("facebook", ["access_token", "ad_account_id"]);
    if (!credsMap.access_token || !credsMap.ad_account_id) {
      console.log("[Facebook Ads] No ad account configured — skipping");
      return;
    }

    const insights = await Meta.getAdAccountInsights(credsMap.ad_account_id, credsMap.access_token);
    if (!insights || (insights as any).error) {
      console.log("[Facebook Ads] No insights returned:", (insights as any)?.error?.message ?? "unknown");
      return;
    }

    const data: any = (insights as any).data?.[0] ?? {};
    const today = new Date().toISOString().slice(0, 10);

    await db
      .insert(facebookAdMetrics)
      .values({
        date: today,
        impressions: parseInt(data.impressions ?? "0", 10),
        clicks: parseInt(data.clicks ?? "0", 10),
        spend: parseFloat(data.spend ?? "0"),
        reach: parseInt(data.reach ?? "0", 10),
        ctr: parseFloat(data.ctr ?? "0"),
      })
      .onConflictDoUpdate({
        target: facebookAdMetrics.date,
        set: {
          impressions: parseInt(data.impressions ?? "0", 10),
          clicks: parseInt(data.clicks ?? "0", 10),
          spend: parseFloat(data.spend ?? "0"),
          reach: parseInt(data.reach ?? "0", 10),
          ctr: parseFloat(data.ctr ?? "0"),
        },
      });

    console.log(`[Facebook Ads] Synced metrics for ${today}`);
    await logJobRun("facebookAdsSync", "success", startedAt);
  } catch (err: any) {
    console.error("[Facebook Ads] Job error:", err);
    await logJobRun("facebookAdsSync", "failed", startedAt, err.message);
  }
}
