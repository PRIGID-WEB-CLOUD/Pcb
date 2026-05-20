import { Router } from "express";
import { db } from "@workspace/db";
import { teamMembers } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../lib/auth";
import { requireRole } from "../lib/rbac";
import { sendTeamInvite } from "../lib/email";
import crypto from "crypto";

const router = Router();

// GET /api/team/accept?token=...  — validate invite token (public, no auth)
router.get("/accept", async (req, res) => {
  try {
    const { token } = req.query as { token?: string };
    if (!token) return res.status(400).json({ error: "Token is required" });

    const [member] = await db.select({
      id:              teamMembers.id,
      email:           teamMembers.email,
      name:            teamMembers.name,
      role:            teamMembers.role,
      status:          teamMembers.status,
      invitedBy:       teamMembers.invitedBy,
      inviteExpiresAt: teamMembers.inviteExpiresAt,
    }).from(teamMembers).where(eq(teamMembers.inviteToken, token)).limit(1);

    if (!member) return res.status(404).json({ error: "Invite link is invalid or has already been used." });
    if (member.status === "active") return res.status(409).json({ error: "already_accepted", email: member.email });
    if (member.inviteExpiresAt && new Date(member.inviteExpiresAt) < new Date()) {
      return res.status(410).json({ error: "This invite link has expired. Ask your admin to resend it." });
    }

    res.json({
      email:     member.email,
      name:      member.name,
      role:      member.role,
      invitedBy: member.invitedBy,
    });
  } catch (e) {
    console.error("[team/accept GET]", e);
    res.status(500).json({ error: "Failed to validate invite" });
  }
});

// POST /api/team/accept  — redeem invite token (public, no auth)
router.post("/accept", async (req, res) => {
  try {
    const { token, name } = req.body as { token: string; name?: string };
    if (!token) return res.status(400).json({ error: "Token is required" });

    const [member] = await db.select().from(teamMembers)
      .where(eq(teamMembers.inviteToken, token)).limit(1);

    if (!member) return res.status(404).json({ error: "Invite link is invalid or has already been used." });
    if (member.status === "active") return res.status(409).json({ error: "already_accepted" });
    if (member.inviteExpiresAt && new Date(member.inviteExpiresAt) < new Date()) {
      return res.status(410).json({ error: "This invite link has expired. Ask your admin to resend it." });
    }

    const updates: Record<string, unknown> = {
      status:          "active",
      inviteToken:     null,
      inviteExpiresAt: null,
      updatedAt:       new Date(),
    };
    if (name?.trim()) updates.name = name.trim();

    await db.update(teamMembers).set(updates).where(eq(teamMembers.id, member.id));

    res.json({ ok: true, email: member.email, role: member.role });
  } catch (e) {
    console.error("[team/accept POST]", e);
    res.status(500).json({ error: "Failed to accept invite" });
  }
});

// GET /api/team
router.get("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const members = await db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt));
    res.json(members);
  } catch { res.status(500).json({ error: "Failed to fetch team members" }); }
});

// POST /api/team/invite  — requires Admin role or higher
router.post("/invite", requireRole("Admin"), async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
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

// PUT /api/team/:id  — requires Admin role or higher
router.put("/:id", requireRole("Admin"), async (req, res) => {
  try {
    const user = await getSession(req);
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

// DELETE /api/team/:id  — requires Owner role
router.delete("/:id", requireRole("Owner"), async (req, res) => {
  try {
    const user = await getSession(req);
    await db.delete(teamMembers).where(eq(teamMembers.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to remove member" }); }
});

// POST /api/team/:id/resend  — requires Admin role or higher
router.post("/:id/resend", requireRole("Admin"), async (req, res) => {
  try {
    const user = await getSession(req);
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
