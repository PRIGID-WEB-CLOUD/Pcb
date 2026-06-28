import { Router } from "express";
import { randomUUID, createHmac } from "crypto";
import { addEvent, credentials } from "./channels";

const router = Router();

// ── In-memory store ──────────────────────────────────────────────────────────

interface Hashtag         { id: string; tag: string; }
interface AutoRule        { id: string; trigger: string; action: string; template: string; active: boolean; }
interface QueuedTweet     { id: string; text: string; scheduledFor: string; status: string; imageStyle: string; }
interface ContentTemplate { id: string; name: string; body: string; usageCount: number; }
interface Scheduler       { id: string; schedulerOn: boolean; dropFrequency: string; imageStyle: string; }

let hashtags: Hashtag[] = [
  { id: randomUUID(), tag: "#LuxeBoutique" },
  { id: randomUUID(), tag: "#NewArrival" },
  { id: randomUUID(), tag: "#SustainableLuxury" },
];

let rules: AutoRule[] = [
  { id: randomUUID(), trigger: "New Product Published", action: "Post immediately", template: "new_arrival", active: true  },
  { id: randomUUID(), trigger: "Collection Launch",     action: "Post immediately", template: "collection",  active: true  },
  { id: randomUUID(), trigger: "Flash Sale Started",    action: "Post immediately", template: "promotion",   active: false },
];

let queue: QueuedTweet[] = [];

let templates: ContentTemplate[] = [
  { id: randomUUID(), name: "New Arrival",       body: "✨ Now available: {product_name} — crafted for the discerning few. Shop now. #LuxeBoutique #NewArrival",         usageCount: 12 },
  { id: randomUUID(), name: "Collection Launch", body: "Introducing The {collection_name} Collection. Where precision meets quiet luxury. Available now. #LuxeBoutique", usageCount: 5  },
  { id: randomUUID(), name: "Sale Announcement", body: "Limited time: {discount}% off select pieces. Because effortless style shouldn't be out of reach. #LuxeBoutique",usageCount: 3  },
];

let scheduler: Scheduler = {
  id: randomUUID(),
  schedulerOn: false,
  dropFrequency: "Daily Digest (6 PM)",
  imageStyle: "Product Photo",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTwCreds() { return credentials["twitter"] ?? {}; }

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

router.get("/twitter/hashtags", (_req, res) => { res.json(hashtags); });

router.post("/twitter/hashtags", (req, res) => {
  const { tag } = req.body as { tag: string };
  const ht: Hashtag = { id: randomUUID(), tag };
  hashtags = [...hashtags, ht];
  res.status(201).json(ht);
});

router.delete("/twitter/hashtags/:id", (req, res) => {
  hashtags = hashtags.filter((h) => h.id !== req.params.id);
  res.json({ ok: true });
});

// ── Auto-rule Routes ──────────────────────────────────────────────────────────

router.get("/twitter/rules", (_req, res) => { res.json(rules); });

router.post("/twitter/rules", (req, res) => {
  const { trigger, action, template, active } = req.body as AutoRule;
  const rule: AutoRule = { id: randomUUID(), trigger, action, template: template ?? "default", active: active ?? true };
  rules = [...rules, rule];
  res.status(201).json(rule);
});

router.put("/twitter/rules/:id", (req, res) => {
  const { id } = req.params;
  const { active } = req.body as { active: boolean };
  rules = rules.map((r) => (r.id === id ? { ...r, active } : r));
  res.json(rules.find((r) => r.id === id));
});

// ── Queue Routes ──────────────────────────────────────────────────────────────

router.get("/twitter/queue", (_req, res) => { res.json(queue); });

router.post("/twitter/queue", (req, res) => {
  const { text, scheduledFor, status, imageStyle } = req.body as QueuedTweet;
  const tweet: QueuedTweet = { id: randomUUID(), text, scheduledFor: scheduledFor ?? "", status: status ?? "Queued", imageStyle: imageStyle ?? "None" };
  queue = [tweet, ...queue];
  res.status(201).json(tweet);
});

router.put("/twitter/queue/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  queue = queue.map((t) => (t.id === id ? { ...t, status } : t));
  res.json(queue.find((t) => t.id === id));
});

router.delete("/twitter/queue/:id", (req, res) => {
  queue = queue.filter((t) => t.id !== req.params.id);
  res.json({ ok: true });
});

// ── Template Routes ───────────────────────────────────────────────────────────

router.get("/twitter/templates", (_req, res) => { res.json(templates); });

router.post("/twitter/templates", (req, res) => {
  const { name, body } = req.body as { name: string; body: string };
  const tpl: ContentTemplate = { id: randomUUID(), name, body, usageCount: 0 };
  templates = [tpl, ...templates];
  res.status(201).json(tpl);
});

router.put("/twitter/templates/:id/use", (req, res) => {
  const { id } = req.params;
  templates = templates.map((t) => (t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t));
  res.json(templates.find((t) => t.id === id));
});

// ── Scheduler Routes ──────────────────────────────────────────────────────────

router.get("/twitter/scheduler", (_req, res) => { res.json(scheduler); });

router.put("/twitter/scheduler", (req, res) => {
  scheduler = { ...scheduler, ...req.body };
  res.json(scheduler);
});

// ── Live: Twitter/X Me ────────────────────────────────────────────────────────

router.get("/twitter/me", async (_req, res) => {
  const creds = getTwCreds();
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
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Live: Publish Tweet ───────────────────────────────────────────────────────

router.post("/twitter/posts/publish", async (req, res) => {
  const creds = getTwCreds();
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
    const queued: QueuedTweet = {
      id: randomUUID(), text,
      scheduledFor: new Date().toISOString(),
      status: "Published", imageStyle: "None",
    };
    queue = [queued, ...queue];
    res.json({ tweet: (data["data"] as Record<string, unknown>), queued });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Verify credentials ────────────────────────────────────────────────────────

router.get("/twitter/verify", async (_req, res) => {
  const creds = getTwCreds();
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
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
