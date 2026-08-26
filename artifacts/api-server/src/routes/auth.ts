import { Router, type Request, type Response } from "express";
import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "crypto";
import { db, usersTable, sessionsTable, adminOtpCodesTable, authRateLimitsTable } from "@workspace/db";
import { eq, or, and, gt, lt, gte, count, sql } from "drizzle-orm";
import { SESSION_COOKIE, getSessionUser, requireAdmin } from "../middleware/requireAdmin";
import { validate } from "../middleware/validate";
import { z } from "zod";
import bcrypt from "bcryptjs";

const router = Router();
const PASSWORD_SCHEMA = z.string().min(8).max(128);
const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z.object({ password: PASSWORD_SCHEMA });
const devAuthBypassEnabled = process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_BYPASS === "true";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function authSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for authentication security.");
  return secret;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function otpDigest(email: string, otp: string) {
  return createHmac("sha256", authSecret()).update(`${email}:${otp}`).digest("hex");
}

function safeCompare(left: string, right: string) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const [entry] = await db.select().from(authRateLimitsTable)
    .where(eq(authRateLimitsTable.key, key)).limit(1);
  if (!entry || now.getTime() - entry.windowStart.getTime() >= windowMs) {
    await db.insert(authRateLimitsTable).values({ key, windowStart: now, count: 1 })
      .onConflictDoUpdate({ target: authRateLimitsTable.key, set: { windowStart: now, count: 1 } });
    return false;
  }
  if (entry.count >= limit) {
    await db.update(authRateLimitsTable).set({ count: entry.count + 1 })
      .where(eq(authRateLimitsTable.key, key));
    return true;
  }
  await db.update(authRateLimitsTable).set({ count: entry.count + 1 })
    .where(eq(authRateLimitsTable.key, key));
  return false;
}

async function setSession(res: Response, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
  await db.insert(sessionsTable).values({ token, userId, expiresAt });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

async function clearSession(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (token) await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}

const registerSchema = z.object({ name: z.string().trim().min(1).max(120), email: emailSchema, password: PASSWORD_SCHEMA });
router.get("/auth/me", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  return res.json(user);
});

router.post("/auth/register", validate(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length) return res.status(409).json({ error: "Email already registered." });
  const user = { id: randomUUID(), name, email, role: "CUSTOMER", passwordHash: await bcrypt.hash(password, 10) };
  await db.insert(usersTable).values(user);
  await setSession(res, user.id);
  const { passwordHash: _, ...safe } = user;
  return res.status(201).json(safe);
});

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
router.post("/auth/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: "Invalid email or password." });
  await setSession(res, user.id);
  const { passwordHash: _, ...safe } = user;
  return res.json(safe);
});

router.post("/auth/logout", async (req, res) => { await clearSession(req, res); return res.json({ ok: true }); });
router.post("/auth/logout-all", requireAdmin, async (req, res) => {
  await db.delete(sessionsTable).where(eq(sessionsTable.userId, req.adminUser!.id));
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return res.json({ ok: true });
});

router.get("/auth/admin/exists", async (_req, res) => {
  const rows = await db.select({ id: usersTable.id }).from(usersTable)
    .where(or(eq(usersTable.role, "ADMIN"), eq(usersTable.role, "SUPER_ADMIN"))).limit(1);
  return res.json({ exists: rows.length > 0 });
});

const bootstrapSchema = z.object({ name: z.string().trim().min(1).max(120), email: emailSchema });
router.post("/auth/admin/bootstrap", validate(bootstrapSchema), async (req, res) => {
  const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  const providedSecret = req.get("x-admin-bootstrap-secret");
  if (!configuredSecret || !providedSecret || !safeCompare(digest(providedSecret), digest(configuredSecret))) {
    return res.status(403).json({ error: "A valid admin bootstrap secret is required." });
  }
  const existing = await db.select({ id: usersTable.id }).from(usersTable)
    .where(or(eq(usersTable.role, "ADMIN"), eq(usersTable.role, "SUPER_ADMIN"))).limit(1);
  if (existing.length) return res.status(409).json({ error: "Admin already exists." });
  const { name, email } = req.body;
  const user = { id: randomUUID(), name, email, role: "SUPER_ADMIN", passwordHash: "" };
  await db.insert(usersTable).values(user);
  await setSession(res, user.id);
  const { passwordHash: _, ...safe } = user;
  return res.status(201).json(safe);
});

const otpRequestSchema = z.object({ email: emailSchema });
router.post("/auth/admin/request-otp", validate(otpRequestSchema), async (req, res) => {
  const email = req.body.email as string;
  if (await isRateLimited(`otp:email:${email}`, 5, 15 * 60 * 1000) || await isRateLimited(`otp:ip:${req.ip}`, 20, 15 * 60 * 1000)) {
    return res.status(429).json({ error: "Too many OTP requests. Try again later." });
  }
  const [admin] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!admin || !["ADMIN", "SUPER_ADMIN"].includes(admin.role)) return res.status(404).json({ error: "No admin account found for this email." });
  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.update(adminOtpCodesTable).set({ used: true })
    .where(and(eq(adminOtpCodesTable.email, email), eq(adminOtpCodesTable.used, false)));
  await db.delete(adminOtpCodesTable).where(lt(adminOtpCodesTable.expiresAt, new Date()));
  await db.insert(adminOtpCodesTable).values({ id: randomUUID(), email, code: otpDigest(email, code), expiresAt, used: false, attempts: 0 });
  return res.json({ ok: true, ...(devAuthBypassEnabled ? { devCode: code } : {}) });
});

const otpVerifySchema = z.object({ email: emailSchema, otp: z.string().regex(/^\d{6}$/).optional(), code: z.string().regex(/^\d{6}$/).optional() })
  .refine((body) => Boolean(body.otp ?? body.code), { message: "otp is required", path: ["otp"] });
router.post("/auth/admin/verify-otp", validate(otpVerifySchema), async (req, res) => {
  const email = req.body.email as string;
  const otp = (req.body.otp ?? req.body.code) as string;
  if (await isRateLimited(`otp-verify:ip:${req.ip}`, 30, 15 * 60 * 1000)) return res.status(429).json({ error: "Too many verification attempts. Try again later." });
  const [stored] = await db.select().from(adminOtpCodesTable)
    .where(and(eq(adminOtpCodesTable.email, email), eq(adminOtpCodesTable.used, false), gt(adminOtpCodesTable.expiresAt, new Date()))).limit(1);
  if (!stored || (stored.lockedUntil && stored.lockedUntil > new Date())) return res.status(401).json({ error: "Invalid or expired code." });
  const valid = safeCompare(stored.code, otpDigest(email, otp));
  if (!valid) {
    const attempts = stored.attempts + 1;
    await db.update(adminOtpCodesTable).set({ attempts, ...(attempts >= 5 ? { used: true, lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } : {}) })
      .where(eq(adminOtpCodesTable.id, stored.id));
    return res.status(401).json({ error: attempts >= 5 ? "Too many failed attempts. Request a new code later." : "Invalid or expired code." });
  }
  await db.update(adminOtpCodesTable).set({ used: true }).where(eq(adminOtpCodesTable.id, stored.id));
  const [admin] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!admin || !["ADMIN", "SUPER_ADMIN"].includes(admin.role)) return res.status(404).json({ error: "Admin not found." });
  await setSession(res, admin.id);
  const { passwordHash: _, ...safe } = admin;
  return res.json(safe);
});

const forgotSchema = z.object({ email: emailSchema });
router.post("/auth/forgot-password", validate(forgotSchema), async (req, res) => {
  const email = req.body.email as string;
  const ok = { ok: true, message: "If that email is registered, a reset link will be sent." };
  if (await isRateLimited(`reset:email:${email}`, 5, 60 * 60 * 1000) || await isRateLimited(`reset:ip:${req.ip}`, 20, 60 * 60 * 1000)) return res.status(429).json({ error: "Too many reset requests. Try again later." });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) return res.json(ok);
  const token = randomBytes(32).toString("base64url");
  await db.update(usersTable).set({ passwordResetToken: digest(token), passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000) }).where(eq(usersTable.id, user.id));
  return res.json({ ...ok, ...(devAuthBypassEnabled ? { devToken: token } : {}) });
});

const resetSchema = z.object({ token: z.string().min(20).max(200), password: PASSWORD_SCHEMA });
router.post("/auth/reset-password", validate(resetSchema), async (req, res) => {
  const { token, password } = req.body;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.passwordResetToken, digest(token))).limit(1);
  if (!user) return res.status(400).json({ error: "Invalid or expired reset token." });
  if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) return res.status(400).json({ error: "Reset token expired. Request a new one." });
  await db.update(usersTable).set({ passwordHash: await bcrypt.hash(password, 10), passwordResetToken: null, passwordResetExpiry: null }).where(eq(usersTable.id, user.id));
  await db.delete(sessionsTable).where(eq(sessionsTable.userId, user.id));
  return res.json({ ok: true, message: "Password reset successfully." });
});

router.get("/auth/google", (_req, res) => res.redirect("/?auth_error=google_not_configured"));
export { requireAdmin, getSessionUser };
export default router;