import { Router, type Request, type Response } from "express";
import { randomBytes, randomUUID } from "crypto";
import { db, usersTable, sessionsTable, adminOtpCodesTable } from "@workspace/db";
import { eq, or, and, gt, lt } from "drizzle-orm";
import { SESSION_COOKIE, getSessionUser, requireAdmin } from "../middleware/requireAdmin";
import { validate } from "../middleware/validate";
import { z } from "zod";
import bcrypt from "bcryptjs";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setSession(res: Response, userId: string) {
  const token     = randomBytes(32).toString("base64url");
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
  return res.json(safe);
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
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: randomUUID(), name, email, role: "CUSTOMER", passwordHash: hashedPassword };
  await db.insert(usersTable).values(user);
  await setSession(res, user.id);
  const { passwordHash: _, ...safe } = user;
  return res.status(201).json(safe);
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

router.post("/auth/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  await setSession(res, user.id);
  const { passwordHash: _, ...safe } = user;
  return res.json(safe);
});

router.post("/auth/logout", async (req, res) => {
  await clearSession(req, res);
  return res.json({ ok: true });
});

// ── Admin OTP auth ────────────────────────────────────────────────────────────

router.get("/auth/admin/exists", async (_req, res) => {
  const rows = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.role, "ADMIN"), eq(usersTable.role, "SUPER_ADMIN")))
    .limit(1);
  return res.json({ exists: rows.length > 0 });
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
  return res.status(201).json(safe);
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
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Invalidate previous codes
  await db.update(adminOtpCodesTable)
    .set({ used: true })
    .where(and(eq(adminOtpCodesTable.email, email), eq(adminOtpCodesTable.used, false)));

  // Clean up expired records to keep table tidy
  await db.delete(adminOtpCodesTable).where(lt(adminOtpCodesTable.expiresAt, new Date()));

  // Insert new OTP code
  await db.insert(adminOtpCodesTable).values({
    id: randomUUID(),
    email,
    code,
    expiresAt,
    used: false,
  });

  const isDev = process.env["NODE_ENV"] !== "production";
  return res.json({ ok: true, ...(isDev ? { devCode: code } : {}) });
});

router.post("/auth/admin/verify-otp", async (req, res) => {
  const body = req.body as { email?: string; otp?: string; code?: string };
  const { email } = body;
  const otp = body.otp ?? body.code;
  if (!email || !otp) return res.status(400).json({ error: "email and otp are required." });

  // Query database
  const [stored] = await db.select().from(adminOtpCodesTable)
    .where(and(
      eq(adminOtpCodesTable.email, email),
      eq(adminOtpCodesTable.code, String(otp).trim()),
      eq(adminOtpCodesTable.used, false),
      gt(adminOtpCodesTable.expiresAt, new Date())
    ))
    .limit(1);

  if (!stored) return res.status(401).json({ error: "Invalid or expired code." });

  // Mark code as used
  await db.update(adminOtpCodesTable)
    .set({ used: true })
    .where(eq(adminOtpCodesTable.id, stored.id));

  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const admin = rows[0];
  if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")) {
    return res.status(404).json({ error: "Admin not found." });
  }
  await setSession(res, admin.id);
  const { passwordHash: _, ...safe } = admin;
  return res.json(safe);
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
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.update(usersTable)
    .set({ passwordResetToken: token, passwordResetExpiry: expiresAt })
    .where(eq(usersTable.id, user.id));

  const isDev = process.env["NODE_ENV"] !== "production";
  return res.json({ ...ok, ...(isDev ? { devToken: token } : {}) });
});

router.post("/auth/reset-password", async (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) return res.status(400).json({ error: "token and password are required." });

  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.passwordResetToken, token))
    .limit(1);

  if (!user) return res.status(400).json({ error: "Invalid or expired reset token." });
  if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
    return res.status(400).json({ error: "Reset token expired. Request a new one." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await db.update(usersTable)
    .set({ passwordHash: hashedPassword, passwordResetToken: null, passwordResetExpiry: null })
    .where(eq(usersTable.id, user.id));
  return res.json({ ok: true, message: "Password reset successfully." });
});

// ── Google OAuth stub ──────────────────────────────────────────────────────────

router.get("/auth/google", (_req, res) => {
  res.redirect("/?auth_error=google_not_configured");
});

export { requireAdmin, getSessionUser };
export default router;
