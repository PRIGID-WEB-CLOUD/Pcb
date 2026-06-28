import { Router } from "express";
import { db } from "@workspace/db";
import {
  twitterHashtags, twitterAutoRules, twitterTweetQueue,
  twitterContentTemplates, twitterSchedulerSettings,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../lib/auth";
import { getCredMap, missingCreds } from "../lib/social/credentials";
import * as Twitter from "../lib/social/twitter";

const router = Router();
const TWITTER_CREDS = ["api_key", "api_secret", "access_token", "access_token_secret", "bearer_token"];

async function adminOnly(req: any, res: any): Promise<boolean> {
  const user = await getSession(req);
  if (!user || user.role !== "ADMIN") { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

async function getTwitterCreds(): Promise<Twitter.TwitterCreds | null> {
  const creds = await getCredMap("twitter", TWITTER_CREDS);
  const missing = missingCreds(creds, ["api_key", "api_secret", "access_token", "access_token_secret"]);
  if (missing.length) return null;
  return {
    api_key: creds.api_key,
    api_secret: creds.api_secret,
    access_token: creds.access_token,
    access_token_secret: creds.access_token_secret,
    bearer_token: creds.bearer_token,
  };
}

// ── Account Info ──────────────────────────────────────────────────────────────

router.get("/me", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getTwitterCreds();
    if (!creds) { res.status(400).json({ error: "Missing Twitter credentials. Add them in Credentials tab.", missing: ["api_key","api_secret","access_token","access_token_secret"] }); return; }
    const data = await Twitter.getMyUser(creds);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch Twitter account" });
  }
});

router.get("/verify", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getTwitterCreds();
    if (!creds) { res.json({ ok: false, error: "Missing credentials" }); return; }
    const result = await Twitter.verifyCredentials(creds);
    res.json(result);
  } catch (err: any) {
    res.json({ ok: false, error: err.message });
  }
});

// ── Timeline ──────────────────────────────────────────────────────────────────

router.get("/timeline/:userId", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getTwitterCreds();
    if (!creds) { res.status(400).json({ error: "Missing Twitter credentials", missing: [] }); return; }
    const data = await Twitter.getUserTimeline(creds, req.params.userId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch timeline" });
  }
});

// ── Publish Tweets ────────────────────────────────────────────────────────────

router.post("/posts/publish", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getTwitterCreds();
    if (!creds) {
      res.status(400).json({ error: "Missing Twitter credentials. Add them in Credentials tab.", missing: ["api_key","api_secret","access_token","access_token_secret"] });
      return;
    }

    const { text, replyToId } = req.body;
    if (!text?.trim()) { res.status(400).json({ error: "Tweet text is required" }); return; }
    if (text.length > 280) { res.status(400).json({ error: "Tweet exceeds 280 characters" }); return; }

    const result = await Twitter.postTweet(creds, text, replyToId);
    const tweetId = (result as any).data?.id;

    const [queued] = await db.insert(twitterTweetQueue).values({
      text,
      scheduledFor: new Date().toISOString(),
      status: "Sent",
      imageStyle: "None",
    }).returning();

    res.json({ ok: true, tweet: (result as any).data, queued });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Tweet publish failed" });
  }
});

router.post("/posts/reply", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getTwitterCreds();
    if (!creds) { res.status(400).json({ error: "Missing Twitter credentials" }); return; }

    const { tweetId, text } = req.body;
    if (!tweetId || !text) { res.status(400).json({ error: "tweetId and text are required" }); return; }

    const result = await Twitter.replyToTweet(creds, tweetId, text);
    res.json({ ok: true, tweet: (result as any).data });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Reply failed" });
  }
});

router.get("/tweets/:id/metrics", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getTwitterCreds();
    if (!creds) { res.status(400).json({ error: "Missing Twitter credentials" }); return; }
    const data = await Twitter.getTweetMetrics(creds, req.params.id);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch tweet metrics" });
  }
});

// ── Hashtags ──────────────────────────────────────────────────────────────────

router.get("/hashtags", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    res.json(await db.select().from(twitterHashtags));
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/hashtags", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const tag = req.body.tag.startsWith("#") ? req.body.tag : `#${req.body.tag}`;
    const [created] = await db.insert(twitterHashtags).values({ tag }).returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/hashtags/:id", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    await db.delete(twitterHashtags).where(eq(twitterHashtags.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Auto Rules ────────────────────────────────────────────────────────────────

router.get("/rules", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    res.json(await db.select().from(twitterAutoRules));
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/rules", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [created] = await db.insert(twitterAutoRules).values(req.body).returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/rules/:id", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [updated] = await db.update(twitterAutoRules)
      .set({ active: req.body.active })
      .where(eq(twitterAutoRules.id, req.params.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Queue ─────────────────────────────────────────────────────────────────────

router.get("/queue", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    res.json(await db.select().from(twitterTweetQueue).orderBy(desc(twitterTweetQueue.createdAt)));
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/queue", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [created] = await db.insert(twitterTweetQueue).values(req.body).returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/queue/:id", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [updated] = await db.update(twitterTweetQueue)
      .set(req.body)
      .where(eq(twitterTweetQueue.id, req.params.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/queue/:id", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    await db.delete(twitterTweetQueue).where(eq(twitterTweetQueue.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Content Templates ─────────────────────────────────────────────────────────

router.get("/templates", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    res.json(await db.select().from(twitterContentTemplates));
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/templates", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [created] = await db.insert(twitterContentTemplates)
      .values({ name: req.body.name.toLowerCase().replace(/\s+/g, "_"), body: req.body.body })
      .returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/templates/:id/use", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [tpl] = await db.select().from(twitterContentTemplates).where(eq(twitterContentTemplates.id, req.params.id)).limit(1);
    const [updated] = await db.update(twitterContentTemplates)
      .set({ usageCount: (tpl?.usageCount ?? 0) + 1 })
      .where(eq(twitterContentTemplates.id, req.params.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Scheduler ─────────────────────────────────────────────────────────────────

router.get("/scheduler", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [settings] = await db.select().from(twitterSchedulerSettings).limit(1);
    res.json(settings);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/scheduler", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [existing] = await db.select().from(twitterSchedulerSettings).limit(1);
    const [updated] = await db.update(twitterSchedulerSettings)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(twitterSchedulerSettings.id, existing.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
