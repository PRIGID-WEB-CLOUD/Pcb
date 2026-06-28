import { db } from "@workspace/db";
import { twitterTweetQueue } from "@workspace/db/schema";
import { eq, and, lte } from "drizzle-orm";
import * as Twitter from "../lib/social/twitter";
import { getCredMap, missingCreds } from "../lib/social/credentials";
import { logJobRun } from "./index";

const REQUIRED = ["api_key", "api_secret", "access_token", "access_token_secret"];

export async function runTwitterQueueJob(): Promise<void> {
  const startedAt = new Date();
  try {
    const now = new Date().toISOString();
    const due = await db
      .select()
      .from(twitterTweetQueue)
      .where(and(eq(twitterTweetQueue.status, "Queued"), lte(twitterTweetQueue.scheduledFor, now)));

    if (!due.length) return;
    console.log(`[Twitter Queue] ${due.length} tweet(s) due — posting...`);

    const credsMap = await getCredMap("twitter", [...REQUIRED, "bearer_token"]);
    const missing = missingCreds(credsMap, REQUIRED);
    if (missing.length) {
      console.log("[Twitter Queue] Missing credentials — skipping");
      return;
    }

    const creds: Twitter.TwitterCreds = {
      api_key: credsMap.api_key,
      api_secret: credsMap.api_secret,
      access_token: credsMap.access_token,
      access_token_secret: credsMap.access_token_secret,
      bearer_token: credsMap.bearer_token,
    };

    for (const tweet of due) {
      try {
        const result = await Twitter.postTweet(creds, tweet.text);
        const tweetId: string | undefined = (result as any).data?.id;
        await db
          .update(twitterTweetQueue)
          .set({ status: "Posted", postedTweetId: tweetId ?? null, lastError: null })
          .where(eq(twitterTweetQueue.id, tweet.id));
        console.log(`[Twitter Queue] Posted tweet ${tweet.id} → ${tweetId}`);
      } catch (err: any) {
        const retryCount = (tweet.retryCount ?? 0) + 1;
        const isFinal = retryCount >= 3;
        await db
          .update(twitterTweetQueue)
          .set({ retryCount, lastError: err.message ?? "Unknown error", status: isFinal ? "Failed" : "Queued" })
          .where(eq(twitterTweetQueue.id, tweet.id));
        console.error(`[Twitter Queue] Failed tweet ${tweet.id} (attempt ${retryCount}):`, err.message);
      }
    }

    await logJobRun("twitterQueueRunner", "success", startedAt);
  } catch (err: any) {
    console.error("[Twitter Queue] Job error:", err);
    await logJobRun("twitterQueueRunner", "failed", startedAt, err.message);
  }
}
