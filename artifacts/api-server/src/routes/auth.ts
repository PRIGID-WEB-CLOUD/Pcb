import { Router } from "express";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "@workspace/db";
import { users, sessions, adminOtpCodes } from "@workspace/db/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import { getSession } from "../lib/auth";
import { sendAdminOtp, sendCustomerResetEmail } from "../lib/email";

const router = Router();

// ── Passport / Google OAuth setup ────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL ?? "/api/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email from Google"));

          const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

          if (existing) {
            if (!existing.oauthProvider) {
              await db.update(users).set({ oauthProvider: "google", oauthId: profile.id, avatarUrl: profile.photos?.[0]?.value }).where(eq(users.id, existing.id));
            }
            return done(null, existing);
          }

          const [created] = await db.insert(users).values({
            name:          profile.displayName ?? email.split("@")[0],
            email,
            oauthProvider: "google",
            oauthId:       profile.id,
            avatarUrl:     profile.photos?.[0]?.value,
          }).returning();

          return done(null, created);
        } catch (err) {
          return done(err as Error);
        }
      },
    ),
  );
}

async function createSession(res: import("express").Response, userId: string) {
  const token     = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId, token, expiresAt });
  res.cookie("session_token", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires:  expiresAt,
  });
  return token;
}

// ── Existing routes ───────────────────────────────────────────────────────────
router.get("/me", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing credentials" });

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !user.password) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    await createSession(res, user.id);
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch { res.status(500).json({ error: "Login failed" }); }
});

router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies?.session_token;
    if (token) await db.delete(sessions).where(eq(sessions.token, token));
    res.clearCookie("session_token");
    res.json({ message: "Logged out" });
  } catch { res.status(500).json({ error: "Logout failed" }); }
});

router.put("/me", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { name, currentPassword, newPassword } = req.body;
    const updates: Record<string, string> = {};
    if (name) updates.name = name;
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: "Current password is required" });
      if (!user.password)    return res.status(400).json({ error: "OAuth accounts cannot set a password here" });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ error: "Current password is incorrect" });
      updates.password = await bcrypt.hash(newPassword, 10);
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update" });
    await db.update(users).set(updates).where(eq(users.id, user.id));
    const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch { res.status(500).json({ error: "Update failed" }); }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Missing required fields" });
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) return res.status(400).json({ error: "User already exists" });
    const hashed = await bcrypt.hash(password, 10);
    await db.insert(users).values({ name, email, password: hashed });
    res.json({ message: "User registered successfully" });
  } catch { res.status(500).json({ error: "Registration failed" }); }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return res.json({ success: true });

    const token   = crypto.randomUUID();
    const expiry  = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.update(users)
      .set({ passwordResetToken: token, passwordResetExpiry: expiry, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    const base      = process.env.FRONTEND_URL || `https://${process.env.REPLIT_DEV_DOMAIN ?? ""}`;
    const resetLink = `${base.replace(/\/$/, "")}/reset-password?token=${token}`;
    await sendCustomerResetEmail(email, resetLink, user.name);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to send password reset email" }); }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Token and new password are required" });
    if (password.length < 6)  return res.status(400).json({ error: "Password must be at least 6 characters" });

    const [user] = await db.select().from(users)
      .where(eq(users.passwordResetToken, token))
      .limit(1);

    if (!user) return res.status(400).json({ error: "Invalid or expired reset link" });
    if (!user.passwordResetExpiry || new Date(user.passwordResetExpiry) < new Date()) {
      return res.status(400).json({ error: "Reset link has expired. Please request a new one." });
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.update(users)
      .set({ password: hashed, passwordResetToken: null, passwordResetExpiry: null, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to reset password" }); }
});

// ── Google OAuth ─────────────────────────────────────────────────────────────
router.get("/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
  }
  passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
});

router.get("/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { session: false }, async (err: Error | null, user: typeof users.$inferSelect | false) => {
      if (err || !user) {
        const frontendBase = process.env.FRONTEND_URL ?? "";
        return res.redirect(`${frontendBase}/login?error=oauth_failed`);
      }
      try {
        await createSession(res, user.id);
        const frontendBase = process.env.FRONTEND_URL ?? "";
        res.redirect(`${frontendBase}/`);
      } catch {
        res.redirect(`${(process.env.FRONTEND_URL ?? "")}/login?error=session_failed`);
      }
    })(req, res, next);
  },
);

// ── Admin OTP ─────────────────────────────────────────────────────────────────

// Bootstrap: create the very first admin account (only works when no admin exists)
router.post("/admin/bootstrap", async (req, res) => {
  try {
    const [existingAdmin] = await db.select().from(users)
      .where(eq(users.role, "ADMIN")).limit(1);
    if (existingAdmin) return res.status(403).json({ error: "Admin account already configured." });

    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and email are required" });

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      await db.update(users).set({ role: "ADMIN" }).where(eq(users.id, existing.id));
    } else {
      await db.insert(users).values({ name, email, role: "ADMIN" });
    }
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Bootstrap failed" }); }
});

router.post("/admin/request-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    // Always return same response to prevent email enumeration
    if (!user || user.role !== "ADMIN") {
      return res.json({ success: true, dev: false });
    }

    // Invalidate previous unused codes for this email
    await db.update(adminOtpCodes)
      .set({ used: true })
      .where(and(eq(adminOtpCodes.email, email), eq(adminOtpCodes.used, false)));

    // Clean up expired records to keep table tidy
    await db.delete(adminOtpCodes).where(lt(adminOtpCodes.expiresAt, new Date()));

    const code      = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(adminOtpCodes).values({ email, code, expiresAt });

    let dev = false;
    try {
      const result = await sendAdminOtp(email, code, user.name);
      dev = result.dev;
    } catch (emailErr) {
      // SMTP send failed — log it and fall back to console so admin isn't locked out
      console.error("[OTP] Email send failed, falling back to console:", emailErr);
      console.log(`\n${"=".repeat(50)}`);
      console.log(`  ADMIN OTP CODE (SMTP error — fallback)`);
      console.log(`  To:   ${email}`);
      console.log(`  Code: ${code}`);
      console.log(`${"=".repeat(50)}\n`);
      dev = true;
    }
    // When SMTP is not configured or failed (dev=true), always return the code so admin isn't locked out
    res.json({ success: true, dev, ...(dev ? { devCode: code } : {}) });
  } catch (err) {
    console.error("[OTP] request-otp error:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

router.post("/admin/verify-otp", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: "Email and code are required" });

    const [otp] = await db.select().from(adminOtpCodes)
      .where(and(
        eq(adminOtpCodes.email, email),
        eq(adminOtpCodes.code, code),
        eq(adminOtpCodes.used, false),
        gt(adminOtpCodes.expiresAt, new Date()),
      ))
      .limit(1);

    if (!otp) return res.status(401).json({ error: "Invalid or expired code. Please request a new one." });

    await db.update(adminOtpCodes).set({ used: true }).where(eq(adminOtpCodes.id, otp.id));

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Access denied." });

    await createSession(res, user.id);
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch { res.status(500).json({ error: "Verification failed" }); }
});

export default router;
