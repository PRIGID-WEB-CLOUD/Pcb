import { type Request, type Response, type NextFunction } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const SESSION_COOKIE = "luxe_session";

export type UserRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
}

export async function getSessionUser(req: Request): Promise<StoredUser | null> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return null;
  const rows = await db
    .select({ user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.token, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (new Date() > new Date(row.user.createdAt)) {
    const sess = await db
      .select({ expiresAt: sessionsTable.expiresAt })
      .from(sessionsTable)
      .where(eq(sessionsTable.token, token))
      .limit(1);
    if (sess[0] && new Date() > sess[0].expiresAt) return null;
  }
  return {
    id:           row.user.id,
    name:         row.user.name,
    email:        row.user.email,
    role:         row.user.role as UserRole,
    passwordHash: row.user.passwordHash,
  };
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return res.status(401).json({ error: "Authentication required." });

  const rows = await db
    .select({ user: usersTable, expiresAt: sessionsTable.expiresAt })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.token, token))
    .limit(1);

  const row = rows[0];
  if (!row) return res.status(401).json({ error: "Session expired — please log in again." });
  if (new Date() > row.expiresAt) return res.status(401).json({ error: "Session expired — please log in again." });

  const role = row.user.role as UserRole;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Admin access required." });
  }
  return next();
}

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return res.status(401).json({ error: "Authentication required." });

  const rows = await db
    .select({ user: usersTable, expiresAt: sessionsTable.expiresAt })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.token, token))
    .limit(1);

  const row = rows[0];
  if (!row) return res.status(401).json({ error: "Session expired — please log in again." });
  if (new Date() > row.expiresAt) return res.status(401).json({ error: "Session expired — please log in again." });

  if (row.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Super admin access required." });
  }
  return next();
}
