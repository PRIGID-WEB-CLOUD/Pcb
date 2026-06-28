import { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { SESSION_COOKIE, sessions, users, type StoredUser, requireAdmin } from "../middleware/requireAdmin";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

const otpStore = new Map<string, { code: string; email: string; expiresAt: number }>();

function simpleHash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return String(h >>> 0);
}

export function getSessionUser(req: Request): StoredUser | null {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return null;
  const userId = sessions.get(token);
  if (!userId) return null;
  return users.find((u) => u.id === userId) ?? null;
}

function setSession(res: Response, userId: string) {
  const token = randomUUID();
  sessions.set(token, userId);
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
  return token;
}

function clearSession(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (token) sessions.delete(token);
  res.clearCookie(SESSION_COOKIE);
}

// ── Standard auth ─────────────────────────────────────────────────────────────

router.get("/auth/me", (req, res) => {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  const { passwordHash: _, ...safe } = user;
  res.json(safe);
});

router.post("/auth/register", (req, res) => {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
  if (!name || !email || !password) return res.status(400).json({ error: "name, email, and password are required." });
  if (users.find((u) => u.email === email)) return res.status(409).json({ error: "Email already registered." });
  const user: StoredUser = { id: randomUUID(), name, email, role: "CUSTOMER", passwordHash: simpleHash(password) };
  users.push(user);
  setSession(res, user.id);
  const { passwordHash: _, ...safe } = user;
  res.status(201).json(safe);
});

router.post("/auth/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: "email and password are required." });
  const user = users.find((u) => u.email === email && u.passwordHash === simpleHash(password));
  if (!user) return res.status(401).json({ error: "Invalid email or password." });
  setSession(res, user.id);
  const { passwordHash: _, ...safe } = user;
  res.json(safe);
});

router.post("/auth/logout", (req, res) => {
  clearSession(req, res);
  res.json({ ok: true });
});

// ── Admin OTP auth ────────────────────────────────────────────────────────────

router.get("/auth/admin/exists", (_req, res) => {
  const exists = users.some((u) => u.role === "ADMIN");
  res.json({ exists });
});

router.post("/auth/admin/bootstrap", (req, res) => {
  if (users.some((u) => u.role === "ADMIN")) {
    return res.status(409).json({ error: "Admin already exists." });
  }
  const { name, email } = req.body as { name?: string; email?: string };
  if (!name || !email) return res.status(400).json({ error: "name and email are required." });
  const user: StoredUser = { id: randomUUID(), name, email, role: "ADMIN", passwordHash: "" };
  users.push(user);
  setSession(res, user.id);
  const { passwordHash: _, ...safe } = user;
  res.status(201).json(safe);
});

router.post("/auth/admin/request-otp", (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "email is required." });
  const admin = users.find((u) => u.email === email && u.role === "ADMIN");
  if (!admin) return res.status(404).json({ error: "No admin account found for this email. Bootstrap an admin first." });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(email, { code, email, expiresAt: Date.now() + 10 * 60 * 1000 });
  const isDev = process.env["NODE_ENV"] !== "production";
  res.json({ ok: true, ...(isDev ? { devCode: code } : {}) });
});

router.post("/auth/admin/verify-otp", (req, res) => {
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
  const admin = users.find((u) => u.email === email && u.role === "ADMIN");
  if (!admin) return res.status(404).json({ error: "Admin not found." });
  setSession(res, admin.id);
  const { passwordHash: _, ...safe } = admin;
  res.json(safe);
});

// ── Password reset ─────────────────────────────────────────────────────────────

const resetTokens = new Map<string, { userId: string; expiresAt: number }>();

router.post("/auth/forgot-password", (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "email is required." });
  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.json({ ok: true, message: "If that email is registered, a reset link will be sent." });
  }
  const token = randomUUID();
  resetTokens.set(token, { userId: user.id, expiresAt: Date.now() + 60 * 60 * 1000 });
  const isDev = process.env["NODE_ENV"] !== "production";
  res.json({ ok: true, message: "If that email is registered, a reset link will be sent.", ...(isDev ? { devToken: token } : {}) });
});

router.post("/auth/reset-password", (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) return res.status(400).json({ error: "token and password are required." });
  const stored = resetTokens.get(token);
  if (!stored) return res.status(400).json({ error: "Invalid or expired reset token." });
  if (Date.now() > stored.expiresAt) {
    resetTokens.delete(token);
    return res.status(400).json({ error: "Reset token expired. Request a new one." });
  }
  resetTokens.delete(token);
  const idx = users.findIndex((u) => u.id === stored.userId);
  if (idx === -1) return res.status(404).json({ error: "User not found." });
  users[idx]!.passwordHash = simpleHash(password);
  res.json({ ok: true, message: "Password reset successfully." });
});

// ── Google OAuth stub ──────────────────────────────────────────────────────────

router.get("/auth/google", (_req, res) => {
  res.redirect("/?auth_error=google_not_configured");
});

// ── Admin-only: export requireAdmin for protected routes ──────────────────────
export { requireAdmin };
export default router;
