import { db } from "@workspace/db";
import { appSettings } from "@workspace/db/schema";
import { inArray } from "drizzle-orm";

export const MASK = "●●●●●●●●●●●●";
export const SENSITIVE = new Set(["smtp_pass", "cloudinary_api_key", "cloudinary_api_secret"]);

export async function getSettings(keys?: string[]): Promise<Record<string, string>> {
  try {
    const rows = keys
      ? await db.select().from(appSettings).where(inArray(appSettings.key, keys))
      : await db.select().from(appSettings);
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  } catch { return {}; }
}

export async function getSetting(key: string): Promise<string | null> {
  const map = await getSettings([key]);
  return map[key] ?? null;
}

export async function upsertSettings(values: Record<string, string>): Promise<void> {
  const { eq } = await import("drizzle-orm");
  for (const [key, value] of Object.entries(values)) {
    if (!value || value === MASK) continue;
    await db
      .insert(appSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  }
}

export async function getSmtpConfig() {
  const map = await getSettings(["smtp_host", "smtp_user", "smtp_pass", "smtp_port", "smtp_from"]);
  return {
    host: map.smtp_host || process.env.SMTP_HOST || null,
    user: map.smtp_user || process.env.SMTP_USER || null,
    pass: map.smtp_pass || process.env.SMTP_PASS || null,
    port: parseInt(map.smtp_port || process.env.SMTP_PORT || "587"),
    from: map.smtp_from || process.env.SMTP_FROM || null,
  };
}

export async function getCloudinaryConfig() {
  const map = await getSettings(["cloudinary_cloud_name", "cloudinary_api_key", "cloudinary_api_secret", "cloudinary_upload_preset"]);
  return {
    cloudName:    map.cloudinary_cloud_name    || process.env.CLOUDINARY_CLOUD_NAME    || null,
    apiKey:       map.cloudinary_api_key       || process.env.CLOUDINARY_API_KEY       || null,
    apiSecret:    map.cloudinary_api_secret    || process.env.CLOUDINARY_API_SECRET    || null,
    uploadPreset: map.cloudinary_upload_preset || process.env.CLOUDINARY_UPLOAD_PRESET || null,
  };
}
