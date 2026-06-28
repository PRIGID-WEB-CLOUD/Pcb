import { db } from "@workspace/db";
import { channelCredentials } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

export async function getCred(channel: string, keyName: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(channelCredentials)
    .where(and(eq(channelCredentials.channel, channel), eq(channelCredentials.keyName, keyName)))
    .limit(1);
  return row?.value || null;
}

export async function getCredMap(channel: string, keys: string[]): Promise<Record<string, string>> {
  const rows = await db
    .select()
    .from(channelCredentials)
    .where(eq(channelCredentials.channel, channel));
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (keys.includes(row.keyName)) map[row.keyName] = row.value;
  }
  return map;
}

export function missingCreds(creds: Record<string, string>, keys: string[]): string[] {
  return keys.filter((k) => !creds[k]);
}
