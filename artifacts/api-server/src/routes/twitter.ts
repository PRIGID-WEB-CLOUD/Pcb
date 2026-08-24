import { Router } from "express";
import { randomUUID, createHmac } from "crypto";
import { addEvent, getChannelCredentials } from "./channels";
import { requireAdmin } from "../middleware/requireAdmin";
import { db, twitterHashtagsTable, twitterAutoRulesTable, twitterTweetQueueTable, twitterContentTemplatesTable, twitterSchedulerSettingsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();
router.use(requireAdmin);

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTwCreds() { return getChannelCredentials("twitter"); }

function oauthSign(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string,
): string {
  const enc = encodeURIComponent;
  const sorted = Object.entries(params).sort(([a], [b]) => (a < b ? -1 : 1));
  const paramStr = sorted.map(([k, v]) => `${enc(k)}=${enc(v)}`).join("&");
  const base = `${method.toUpperCase()}&${enc(url)}&${enc(paramStr)}`;
  const sigKey = `${enc(consumerSecret)}&${enc(tokenSecret)}`;
  return createHmac("sha1", sigKey).update(base).digest("base64");
}

// ── Hashtag Routes ────────────────────────────────────────────────────────────

router.get("/twitter/hashtags", async (_req, res) => {
  return res.json(await db.select().from(twitterHashtagsTable).orderBy(desc(twitterHashtagsTable.createdAt)));
});

router.post("/twitter/hashtags", async (req, res) => {
  const { tag } = req.body as { tag: string };
  const [ht] = await db.insert(twitterHashtagsTable).values({ id: randomUUID(), tag }).returning();
  return res.status(201).json(ht);
});

router.delete("/twitter/hashtags/:id", async (req, res) => {
  await db.delete(twitterHashtagsTable).where(eq(twitterHashtagsTable.id, req.params.id as string));
  return res.json({ ok: true });
});

// ── Auto-rule Routes ──────────────────────────────────────────────────────────

router.get("/twitter/rules", async (_req, res) => {
  return res.json(await db.select().from(twitterAutoRulesTable).orderBy(desc(twitterAutoRulesTable.createdAt)));
});

router.post("/twitter/rules", async (req, res) => {
  const { trigger, action, template, active } = req.body as { trigger: string; action: string; template?: string; active?: boolean };
  const [rule] = await db.insert(twitterAutoRulesTable).values({
    id: randomUUID(), trigger, action, template: template ?? "default", active: active ?? true,
  }).returning();
  return res.status(201).json(rule);
});

router.put("/twitter/rules/:id", async (req, res) => {
  const [rule] = await db.update(twitterAutoRulesTable)
    .set({ active: Boolean(req.body.active) })
    .where(eq(twitterAutoRulesTable.id, req.params.id as string)).returning();
  if (!rule) return res.status(404).json({ error: "Rule not found" });
  return res.json(rule);
});

// ── Queue Routes ──────────────────────────────────────────────────────────────

router.get("/twitter/queue", async (_req, res) => {
  return res.json(await db.select().from(twitterTweetQueueTable).orderBy(desc(twitterTweetQueueTable.createdAt)));
});

router.post("/twitter/queue", async (req, res) => {
  const { text, scheduledFor, status, imageStyle } = req.body as { text: string; scheduledFor?: string; status?: string; imageStyle?: string };
  const [tweet] = await db.insert(twitterTweetQueueTable).values({
    id: randomUUID(), text, scheduledFor: scheduledFor ?? "", status: status ?? "Queued", imageStyle: imageStyle ?? "None",
  }).returning();
  return res.status(201).json(tweet);
});

router.put("/twitter/queue/:id", async (req, res) => {
  const [tweet] = await db.update(twitterTweetQueueTable)
    .set({ status: String(req.body.status) })
    .where(eq(twitterTweetQueueTable.id, req.params.id as string)).returning();
  if (!tweet) return res.status(404).json({ error: "Tweet not found" });
  return res.json(tweet);
});

router.delete("/twitter/queue/:id", async (req, res) => {
  await db.delete(twitterTweetQueueTable).where(eq(twitterTweetQueueTable.id, req.params.id as string));
  return res.json({ ok: true });
});

// ── Template Routes ───────────────────────────────────────────────────────────

router.get("/twitter/templates", async (_req, res) => {
  return res.json(await db.select().from(twitterContentTemplatesTable).orderBy(desc(twitterContentTemplatesTable.createdAt)));
});

router.post("/twitter/templates", async (req, res) => {
  const { name, body } = req.body as { name: string; body: string };
  const [tpl] = await db.insert(twitterContentTemplatesTable).values({ id: randomUUID(), name, body }).returning();
  return res.status(201).json(tpl);
});

router.put("/twitter/templates/:id/use", async (req, res) => {
  const [tpl] = await db.select().from(twitterContentTemplatesTable)
    .where(eq(twitterContentTemplatesTable.id, req.params.id as string)).limit(1);
  if (!tpl) return res.status(404).json({ error: "Template not found" });
  const [updated] = await db.update(twitterContentTemplatesTable)
    .set({ usageCount: tpl.usageCount + 1 })
    .where(eq(twitterContentTemplatesTable.id, tpl.id)).returning();
  return res.json(updated);
});

// ── Scheduler Routes ──────────────────────────────────────────────────────────

router.get("/twitter/scheduler", async (_req, res) => {
  const [scheduler] = await db.select().from(twitterSchedulerSettingsTable)
    .where(eq(twitterSchedulerSettingsTable.id, "default")).limit(1);
  return res.json(scheduler ?? { id: "default", schedulerOn: false, dropFrequency: "Daily Digest (6 PM)", imageStyle: "Product Photo" });
});

router.put("/twitter/scheduler", async (req, res) => {
  const [scheduler] = await db.insert(twitterSchedulerSettingsTable).values({
    id: "default",
    schedulerOn: Boolean(req.body.schedulerOn ?? false),
    dropFrequency: String(req.body.dropFrequency ?? "Daily Digest (6 PM)"),
    imageStyle: String(req.body.imageStyle ?? "Product Photo"),
  }).onConflictDoUpdate({
    target: twitterSchedulerSettingsTable.id,
    set: {
      schedulerOn: Boolean(req.body.schedulerOn ?? false),
      dropFrequency: String(req.body.dropFrequency ?? "Daily Digest (6 PM)"),
      imageStyle: String(req.body.imageStyle ?? "Product Photo"),
      updatedAt: new Date(),
    },
  }).returning();
  return res.json(scheduler);
});

// ── Live: Twitter/X Me ────────────────────────────────────────────────────────

router.get("/twitter/me", async (_req, res) => {
  const creds = await getTwCreds();
  const bearerToken = creds["bearer_token"];
  if (!bearerToken) {
    return res.status(400).json({ error: "Missing Twitter Bearer Token — add credentials in channel settings." });
  }
  try {
    const r = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url,public_metrics,description",
      { headers: { Authorization: `Bearer ${bearerToken}` } },
    );
    const data = await r.json() as Record<string, unknown>;
    if (!r.ok) {
      return res.status(r.status).json({ error: (data["detail"] as string) ?? (data["title"] as string) ?? `HTTP ${r.status}` });
    }
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── Live: Publish Tweet ───────────────────────────────────────────────────────

router.post("/twitter/posts/publish", async (req, res) => {
  const creds = await getTwCreds();
  const { text } = req.body as { text: string };
  if (!text?.trim()) return res.status(400).json({ error: "Tweet text is required." });

  const requiredKeys = ["api_key", "api_secret", "access_token", "access_token_secret"];
  const missing = requiredKeys.filter((k) => !creds[k]?.trim());
  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing Twitter credentials: ${missing.join(", ")}. Add them in channel settings.` });
  }

  try {
    const tweetUrl = "https://api.twitter.com/2/tweets";
    const oauthParams: Record<string, string> = {
      oauth_consumer_key:     creds["api_key"]!,
      oauth_token:            creds["access_token"]!,
      oauth_signature_method: "HMAC-SHA1",
      oauth_version:          "1.0",
      oauth_timestamp:        String(Math.floor(Date.now() / 1000)),
      oauth_nonce:            randomUUID().replace(/-/g, ""),
    };
    oauthParams["oauth_signature"] = oauthSign(
      "POST", tweetUrl, oauthParams,
      creds["api_secret"]!,
      creds["access_token_secret"]!,
    );
    const authHeader =
      "OAuth " +
      Object.entries(oauthParams)
        .map(([k, v]) => `${k}="${encodeURIComponent(v)}"`)
        .join(", ");

    const r = await fetch(tweetUrl, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await r.json() as Record<string, unknown>;
    if (!r.ok) {
      return res.status(r.status).json({ error: (data["detail"] as string) ?? `HTTP ${r.status}` });
    }

    addEvent("twitter", "Tweet published", `"${text.slice(0, 60)}${text.length > 60 ? "…" : ""}"`, "sync");
    const [queued] = await db.insert(twitterTweetQueueTable).values({
      id: randomUUID(), text,
      scheduledFor: new Date().toISOString(),
      status: "Published", imageStyle: "None",
    }).returning();
    return res.json({ tweet: (data["data"] as Record<string, unknown>), queued });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── Verify credentials ────────────────────────────────────────────────────────

router.get("/twitter/verify", async (_req, res) => {
  const creds = await getTwCreds();
  const bearerToken = creds["bearer_token"];
  if (!bearerToken) {
    return res.status(400).json({ ok: false, error: "Missing Twitter Bearer Token — add credentials in channel settings." });
  }
  try {
    const r = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url",
      { headers: { Authorization: `Bearer ${bearerToken}` } },
    );
    if (r.ok) {
      const data = await r.json() as Record<string, unknown>;
      return res.json({ ok: true, user: (data["data"] as Record<string, unknown>) });
    }
    return res.json({ ok: false, error: `Twitter API returned HTTP ${r.status}` });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
