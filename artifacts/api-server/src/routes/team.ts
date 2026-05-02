import { Router } from "express";
import { db } from "@workspace/db";
import { teamMembers } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../lib/auth";
import { sendTeamInvite } from "../lib/email";
import crypto from "crypto";

const router = Router();

// GET /api/team
router.get("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const members = await db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt));
    res.json(members);
  } catch { res.status(500).json({ error: "Failed to fetch team members" }); }
});

// POST /api/team/invite
router.post("/invite", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { email, name, role } = req.body as { email: string; name?: string; role: string };
    if (!email || !role) return res.status(400).json({ error: "Email and role are required" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [member] = await db.insert(teamMembers).values({
      email,
      name: name ?? null,
      role,
      status: "pending",
      invitedBy: user.email,
      inviteToken: token,
      inviteExpiresAt: expiresAt,
    }).returning();

    const inviteLink = `/admin/accept-invite?token=${token}`;
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const { dev } = await sendTeamInvite(email, {
        invitedBy: user.name ?? user.email,
        role,
        name: name ?? null,
        inviteLink,
        expiryDays: 7,
      });
      emailSent = !dev;
    } catch (mailErr) {
      emailError = mailErr instanceof Error ? mailErr.message : String(mailErr);
      console.error("[team/invite] SMTP error:", emailError);
    }

    res.json({ ...member, inviteLink, emailSent, emailError });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    console.error("[team/invite] error:", msg);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return res.status(409).json({ error: "A team member with this email already exists" });
    }
    res.status(500).json({ error: "Failed to send invite" });
  }
});

// PUT /api/team/:id
router.put("/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { role, status, name } = req.body as { role?: string; status?: string; name?: string };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (role)   updates.role   = role;
    if (status) updates.status = status;
    if (name !== undefined) updates.name = name;

    const [updated] = await db.update(teamMembers)
      .set(updates)
      .where(eq(teamMembers.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Member not found" });
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to update member" }); }
});

// DELETE /api/team/:id
router.delete("/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(teamMembers).where(eq(teamMembers.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to remove member" }); }
});

// POST /api/team/:id/resend
router.post("/:id/resend", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [updated] = await db.update(teamMembers)
      .set({ inviteToken: token, inviteExpiresAt: expiresAt, status: "pending", updatedAt: new Date() })
      .where(eq(teamMembers.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Member not found" });

    const inviteLink = `/admin/accept-invite?token=${token}`;
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const { dev } = await sendTeamInvite(updated.email, {
        invitedBy: user.name ?? user.email,
        role: updated.role,
        name: updated.name,
        inviteLink,
        expiryDays: 7,
      });
      emailSent = !dev;
    } catch (mailErr) {
      emailError = mailErr instanceof Error ? mailErr.message : String(mailErr);
      console.error("[team/resend] SMTP error:", emailError);
    }

    res.json({ ...updated, inviteLink, emailSent, emailError });
  } catch (e) {
    console.error("[team/resend] error:", e instanceof Error ? e.message : e);
    res.status(500).json({ error: "Failed to resend invite" });
  }
});

export default router;
