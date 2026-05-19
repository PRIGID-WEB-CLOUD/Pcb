import { createHmac } from "crypto";

const API_BASE = "https://api.twitter.com/2";

function pct(s: string): string {
  return encodeURIComponent(s)
    .replace(/!/g, "%21").replace(/'/g, "%27")
    .replace(/\(/g, "%28").replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function buildOAuth1Header(
  method: string,
  baseUrl: string,
  queryParams: Record<string, string>,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: Buffer.from(Math.random().toString() + Date.now()).toString("base64").replace(/[^a-zA-Z0-9]/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const all = { ...queryParams, ...oauth };
  const paramStr = Object.keys(all)
    .sort()
    .map((k) => `${pct(k)}=${pct(all[k])}`)
    .join("&");

  const base = `${method.toUpperCase()}&${pct(baseUrl)}&${pct(paramStr)}`;
  const key = `${pct(consumerSecret)}&${pct(accessTokenSecret)}`;
  const sig = createHmac("sha1", key).update(base).digest("base64");
  oauth.oauth_signature = sig;

  return "OAuth " + Object.keys(oauth)
    .sort()
    .map((k) => `${pct(k)}="${pct(oauth[k])}"`)
    .join(", ");
}

export interface TwitterCreds {
  api_key: string;
  api_secret: string;
  access_token: string;
  access_token_secret: string;
  bearer_token?: string;
}

export async function postTweet(creds: TwitterCreds, text: string, replyToId?: string) {
  const url = `${API_BASE}/tweets`;
  const body: Record<string, unknown> = { text };
  if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };

  const auth = buildOAuth1Header("POST", url, {}, creds.api_key, creds.api_secret, creds.access_token, creds.access_token_secret);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    const detail = (data as any)?.detail ?? (data as any)?.title ?? JSON.stringify(data);
    throw new Error(detail);
  }
  return data;
}

export async function deleteTweet(creds: TwitterCreds, tweetId: string) {
  const url = `${API_BASE}/tweets/${tweetId}`;
  const auth = buildOAuth1Header("DELETE", url, {}, creds.api_key, creds.api_secret, creds.access_token, creds.access_token_secret);
  const res = await fetch(url, { method: "DELETE", headers: { Authorization: auth } });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data as any)?.detail ?? "Failed to delete tweet");
  return data;
}

export async function getMyUser(creds: TwitterCreds) {
  const baseUrl = `${API_BASE}/users/me`;
  const q = { "user.fields": "name,username,profile_image_url,public_metrics,description" };
  const auth = buildOAuth1Header("GET", baseUrl, q, creds.api_key, creds.api_secret, creds.access_token, creds.access_token_secret);
  const res = await fetch(`${baseUrl}?${new URLSearchParams(q)}`, { headers: { Authorization: auth } });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data as any)?.detail ?? "Failed to fetch user");
  return data;
}

export async function getUserTimeline(creds: TwitterCreds, userId: string, maxResults = 10) {
  const baseUrl = `${API_BASE}/users/${userId}/tweets`;
  const q: Record<string, string> = {
    "tweet.fields": "public_metrics,created_at",
    "expansions": "attachments.media_keys",
    max_results: String(Math.min(Math.max(maxResults, 5), 100)),
  };
  const auth = buildOAuth1Header("GET", baseUrl, q, creds.api_key, creds.api_secret, creds.access_token, creds.access_token_secret);
  const res = await fetch(`${baseUrl}?${new URLSearchParams(q)}`, { headers: { Authorization: auth } });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data as any)?.detail ?? "Failed to fetch timeline");
  return data;
}

export async function getTweetMetrics(creds: TwitterCreds, tweetId: string) {
  const baseUrl = `${API_BASE}/tweets/${tweetId}`;
  const q = { "tweet.fields": "public_metrics,created_at,text,author_id" };
  const auth = buildOAuth1Header("GET", baseUrl, q, creds.api_key, creds.api_secret, creds.access_token, creds.access_token_secret);
  const res = await fetch(`${baseUrl}?${new URLSearchParams(q)}`, { headers: { Authorization: auth } });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data as any)?.detail ?? "Failed to fetch tweet");
  return data;
}

export async function replyToTweet(creds: TwitterCreds, tweetId: string, text: string) {
  return postTweet(creds, text, tweetId);
}

export async function verifyCredentials(creds: TwitterCreds): Promise<{ ok: boolean; user?: unknown; error?: string }> {
  try {
    const data = await getMyUser(creds);
    return { ok: true, user: (data as any).data };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
