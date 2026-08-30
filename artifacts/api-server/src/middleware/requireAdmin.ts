import { type Request, type Response, type NextFunction } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";

export const SESSION_COOKIE = "luxe_session";

function sessionDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type UserRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      adminUser?: StoredUser;
    }
  }
}

function toStoredUser(user: typeof usersTable.$inferSelect): StoredUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
  };
}

export async function getSessionUser(req: Request): Promise<StoredUser | null> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return null;
  const rows = await db
    .select({ user: usersTable, session: sessionsTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.token, sessionDigest(token)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (new Date() > row.session.expiresAt) return null;
  return toStoredUser(row.user);
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return res.status(401).json({ error: "Authentication required." });

  const rows = await db
    .select({ user: usersTable, expiresAt: sessionsTable.expiresAt })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.token, sessionDigest(token)))
    .limit(1);

  const row = rows[0];
  if (!row) return res.status(401).json({ error: "Session expired — please log in again." });
  if (new Date() > row.expiresAt) return res.status(401).json({ error: "Session expired — please log in again." });

  const role = row.user.role as UserRole;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Admin access required." });
  }
  req.adminUser = toStoredUser(row.user);
  return next();
}

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return res.status(401).json({ error: "Authentication required." });

  const rows = await db
    .select({ user: usersTable, expiresAt: sessionsTable.expiresAt })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.token, sessionDigest(token)))
    .limit(1);

  const row = rows[0];
  if (!row) return res.status(401).json({ error: "Session expired — please log in again." });
  if (new Date() > row.expiresAt) return res.status(401).json({ error: "Session expired — please log in again." });

  if (row.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Super admin access required." });
  }
  req.adminUser = toStoredUser(row.user);
  return next();
}
