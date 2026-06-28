import { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { SESSION_COOKIE, getSessionUser, requireAdmin } from "../middleware/requireAdmin";
import { validate } from "../middleware/validate";
import { z } from "zod";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

const otpStore   = new Map<string, { code: string; expiresAt: number }>();
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();

function simpleHash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return String(h >>> 0);
}

async function setSession(res: Response, userId: string) {
  const token     = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ token, userId, expiresAt });
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
  return token;
}

async function clearSession(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (token) await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  res.clearCookie(SESSION_COOKIE);
}

// ── Standard auth ─────────────────────────────────────────────────────────────

router.get("/auth/me", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  const { passwordHash: _, ...safe } = user;
  res.json(safe);
});

const registerSchema = z.object({
  name:     z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(6),
});

router.post("/auth/register", validate(registerSchema), async (req, res) => {
  const { name, email, password } = req.body as { name: string; email: string; password: string };
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length) return res.status(409).json({ error: "Email already registered." });
  const user = { id: randomUUID(), name, email, role: "CUSTOMER", passwordHash: simpleHash(password) };
  await db.insert(usersTable).values(user);
  await setSession(res, user.id);
  const { passwordHash: _, ...safe } = user;
  res.status(201).json(safe);
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

router.post("/auth/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const user = rows[0];
  if (!user || user.passwordHash !== simpleHash(password)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  await setSession(res, user.id);
  const { passwordHash: _, ...safe } = user;
  res.json(safe);
});

router.post("/auth/logout", async (req, res) => {
  await clearSession(req, res);
  res.json({ ok: true });
});

// ── Admin OTP auth ────────────────────────────────────────────────────────────

router.get("/auth/admin/exists", async (_req, res) => {
  const rows = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.role, "ADMIN"), eq(usersTable.role, "SUPER_ADMIN")))
    .limit(1);
  res.json({ exists: rows.length > 0 });
});

const bootstrapSchema = z.object({
  name:  z.string().min(1),
  email: z.string().email(),
});

router.post("/auth/admin/bootstrap", validate(bootstrapSchema), async (req, res) => {
  const existing = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.role, "ADMIN"), eq(usersTable.role, "SUPER_ADMIN")))
    .limit(1);
  if (existing.length) return res.status(409).json({ error: "Admin already exists." });
  const { name, email } = req.body as { name: string; email: string };
  const user = { id: randomUUID(), name, email, role: "SUPER_ADMIN", passwordHash: "" };
  await db.insert(usersTable).values(user);
  await setSession(res, user.id);
  const { passwordHash: _, ...safe } = user;
  res.status(201).json(safe);
});

router.post("/auth/admin/request-otp", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "email is required." });
  const rows = await db.select().from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  const admin = rows[0];
  if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")) {
    return res.status(404).json({ error: "No admin account found for this email." });
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  const isDev = process.env["NODE_ENV"] !== "production";
  res.json({ ok: true, ...(isDev ? { devCode: code } : {}) });
});

router.post("/auth/admin/verify-otp", async (req, res) => {
  const body = req.body as { email?: string; otp?: string; code?: string };
  const { email } = body;
  const otp = body.otp ?? body.code;
  if (!email || !otp) return res.status(400).json({ error: "email and otp are required." });
  const stored = otpStore.get(email);
  if (!stored || stored.code !== otp) return res.status(401).json({ error: "Invalid or expired code." });
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return res.status(401).json({ error: "Code expired. Request a new one." });
  }
  otpStore.delete(email);
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const admin = rows[0];
  if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")) {
    return res.status(404).json({ error: "Admin not found." });
  }
  await setSession(res, admin.id);
  const { passwordHash: _, ...safe } = admin;
  res.json(safe);
});

// ── Password reset ─────────────────────────────────────────────────────────────

router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "email is required." });
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const user = rows[0];
  const ok = { ok: true, message: "If that email is registered, a reset link will be sent." };
  if (!user) return res.json(ok);
  const token = randomUUID();
  resetTokens.set(token, { userId: user.id, expiresAt: Date.now() + 60 * 60 * 1000 });
  const isDev = process.env["NODE_ENV"] !== "production";
  res.json({ ...ok, ...(isDev ? { devToken: token } : {}) });
});

router.post("/auth/reset-password", async (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) return res.status(400).json({ error: "token and password are required." });
  const stored = resetTokens.get(token);
  if (!stored) return res.status(400).json({ error: "Invalid or expired reset token." });
  if (Date.now() > stored.expiresAt) {
    resetTokens.delete(token);
    return res.status(400).json({ error: "Reset token expired. Request a new one." });
  }
  resetTokens.delete(token);
  await db.update(usersTable)
    .set({ passwordHash: simpleHash(password) })
    .where(eq(usersTable.id, stored.userId));
  res.json({ ok: true, message: "Password reset successfully." });
});

// ── Google OAuth stub ──────────────────────────────────────────────────────────

router.get("/auth/google", (_req, res) => {
  res.redirect("/?auth_error=google_not_configured");
});

export { requireAdmin, getSessionUser };
export default router;
