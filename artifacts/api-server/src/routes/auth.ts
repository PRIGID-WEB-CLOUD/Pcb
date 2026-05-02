import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { users, sessions } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

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
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(sessions).values({ userId: user.id, token, expiresAt });

    res.cookie("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
    });

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

export default router;
