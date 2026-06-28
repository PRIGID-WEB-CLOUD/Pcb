const BASE = "https://graph.facebook.com/v20.0";

async function graphGet(path: string, accessToken: string) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}access_token=${encodeURIComponent(accessToken)}`);
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok || (data as any).error) {
    throw new Error((data as any).error?.message ?? `Meta API ${res.status}`);
  }
  return data;
}

async function graphPost(path: string, accessToken: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: accessToken }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok || (data as any).error) {
    throw new Error((data as any).error?.message ?? `Meta API ${res.status}`);
  }
  return data;
}

async function graphDelete(path: string, accessToken: string) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}access_token=${encodeURIComponent(accessToken)}`, {
    method: "DELETE",
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok || (data as any).error) {
    throw new Error((data as any).error?.message ?? `Meta API ${res.status}`);
  }
  return data;
}

// ── Facebook Page ─────────────────────────────────────────────────────────────

export async function getPageInfo(pageId: string, accessToken: string) {
  return graphGet(`/${pageId}?fields=id,name,fan_count,picture,category,about,link`, accessToken);
}

export async function getPagePosts(pageId: string, accessToken: string) {
  return graphGet(
    `/${pageId}/posts?fields=id,message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares`,
    accessToken
  );
}

export async function publishPagePost(pageId: string, accessToken: string, message: string, link?: string) {
  const body: Record<string, unknown> = { message };
  if (link) body.link = link;
  return graphPost(`/${pageId}/feed`, accessToken, body);
}

export async function deletePagePost(postId: string, accessToken: string) {
  return graphDelete(`/${postId}`, accessToken);
}

// ── Instagram Business ────────────────────────────────────────────────────────

export async function getInstagramAccountFromPage(pageId: string, accessToken: string) {
  return graphGet(`/${pageId}?fields=instagram_business_account{id,name,username,profile_picture_url,followers_count,media_count}`, accessToken);
}

export async function getInstagramMedia(igUserId: string, accessToken: string) {
  return graphGet(
    `/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink`,
    accessToken
  );
}

export async function getInstagramInsights(igUserId: string, accessToken: string) {
  return graphGet(
    `/${igUserId}/insights?metric=impressions,reach,profile_views,follower_count&period=day&since=${Math.floor(Date.now() / 1000) - 86400 * 30}&until=${Math.floor(Date.now() / 1000)}`,
    accessToken
  );
}

export async function createInstagramMediaContainer(
  igUserId: string,
  accessToken: string,
  payload: { image_url?: string; video_url?: string; caption?: string; media_type?: string }
) {
  return graphPost(`/${igUserId}/media`, accessToken, payload as Record<string, unknown>);
}

export async function publishInstagramMedia(igUserId: string, accessToken: string, creationId: string) {
  return graphPost(`/${igUserId}/media_publish`, accessToken, { creation_id: creationId });
}

// ── Meta Commerce Catalog ─────────────────────────────────────────────────────

export async function getCatalogInfo(catalogId: string, accessToken: string) {
  return graphGet(`/${catalogId}?fields=id,name,product_count`, accessToken);
}

export async function getCatalogProducts(catalogId: string, accessToken: string) {
  return graphGet(
    `/${catalogId}/products?fields=id,name,retailer_id,price,currency,availability,condition,image_url,url`,
    accessToken
  );
}

export async function batchUpdateCatalog(
  catalogId: string,
  accessToken: string,
  requests: Array<{ method: string; retailer_id: string; data: Record<string, unknown> }>
) {
  return graphPost(`/${catalogId}/items_batch`, accessToken, {
    item_type: "PRODUCT_ITEM",
    requests,
  });
}

// ── Meta Ads ──────────────────────────────────────────────────────────────────

export async function getAdAccountInsights(adAccountId: string, accessToken: string, datePreset = "last_30d") {
  return graphGet(
    `/act_${adAccountId}/insights?fields=impressions,clicks,spend,ctr,cpc,reach,frequency,actions&date_preset=${datePreset}`,
    accessToken
  );
}

export async function getCampaigns(adAccountId: string, accessToken: string) {
  return graphGet(
    `/act_${adAccountId}/campaigns?fields=id,name,status,objective,budget_remaining,daily_budget,insights{impressions,clicks,spend}&limit=25`,
    accessToken
  );
}

export async function getAdAccountInfo(adAccountId: string, accessToken: string) {
  return graphGet(`/act_${adAccountId}?fields=id,name,currency,account_status,amount_spent,balance`, accessToken);
}
