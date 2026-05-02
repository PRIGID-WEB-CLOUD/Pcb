import { db } from "@workspace/db";
import { sessions, users } from "@workspace/db/schema";
import { eq, gt } from "drizzle-orm";
import type { Request } from "express";

export async function getSession(req: Request) {
  const token = req.cookies?.session_token;
  if (!token) return null;

  const result = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);

  if (!result.length) return null;
  const { session, user } = result[0];
  if (session.expiresAt < new Date()) return null;
  return user;
}
