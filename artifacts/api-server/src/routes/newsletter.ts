import { Router } from "express";
import { db } from "@workspace/db";
import { newsletter, newsletterCampaigns } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../lib/auth";
import { sendCampaignEmail, isSmtpConfigured } from "../lib/email";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/\S+@\S+\.\S+/.test(email))
      return res.status(400).json({ error: "Valid email required" });
    const [existing] = await db.select().from(newsletter).where(eq(newsletter.email, email)).limit(1);
    if (existing) return res.status(400).json({ error: "Email is already subscribed" });
    await db.insert(newsletter).values({ email });
    res.json({ message: "Successfully subscribed to the newsletter!" });
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.get("/", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const rows = await db.select().from(newsletter).orderBy(desc(newsletter.createdAt));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());

    const thisMonth = rows.filter(r => new Date(r.createdAt) >= startOfMonth).length;
    const thisWeek  = rows.filter(r => new Date(r.createdAt) >= startOfWeek).length;

    const byMonth: Record<string, number> = {};
    rows.forEach(r => {
      const key = new Date(r.createdAt).toISOString().slice(0, 7);
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    const growth = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, count]) => ({ month, count }));

    res.json({
      subscribers: rows,
      total: rows.length,
      thisMonth,
      thisWeek,
      growth,
      smtpConfigured: await isSmtpConfigured(),
    });
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.get("/export", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const rows = await db.select().from(newsletter).orderBy(desc(newsletter.createdAt));
    const csv = ["Email,Subscribed At", ...rows.map(r => `${r.email},${r.createdAt}`)].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="newsletter-subscribers-${Date.now()}.csv"`);
    res.send(csv);
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.get("/campaigns", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const campaigns = await db.select().from(newsletterCampaigns).orderBy(desc(newsletterCampaigns.createdAt));
    res.json(campaigns);
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.post("/send", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { subject, body, saveAsDraft, scheduledFor } = req.body;
    if (!subject?.trim() || !body?.trim())
      return res.status(400).json({ error: "Subject and body are required" });

    if (saveAsDraft) {
      const [campaign] = await db.insert(newsletterCampaigns).values({
        subject: subject.trim(),
        body: body.trim(),
        recipientCount: 0,
        sentCount: 0,
        status: "DRAFT",
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      }).returning();
      return res.json({ message: "Draft saved", campaignId: campaign.id, status: "DRAFT" });
    }

    const subscribers = await db.select().from(newsletter).orderBy(desc(newsletter.createdAt));
    if (subscribers.length === 0)
      return res.status(400).json({ error: "No subscribers to send to" });

    const [campaign] = await db.insert(newsletterCampaigns).values({
      subject: subject.trim(),
      body: body.trim(),
      recipientCount: subscribers.length,
      sentCount: 0,
      status: "SENDING",
      sentAt: new Date(),
    }).returning();

    res.json({ message: "Campaign queued", campaignId: campaign.id, recipientCount: subscribers.length });

    let sentCount = 0;
    for (const sub of subscribers) {
      try {
        await sendCampaignEmail(sub.email, subject.trim(), body.trim());
        sentCount++;
      } catch (err) {
        console.error(`Failed to send to ${sub.email}:`, err);
      }
    }

    const finalStatus = sentCount === 0 ? "FAILED" : sentCount === subscribers.length ? "SENT" : "PARTIAL";
    await db.update(newsletterCampaigns)
      .set({ sentCount, status: finalStatus, updatedAt: new Date() })
      .where(eq(newsletterCampaigns.id, campaign.id));

  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.put("/campaigns/:id", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { subject, body, status, scheduledFor } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (subject?.trim()) updates.subject = subject.trim();
    if (body?.trim())    updates.body    = body.trim();
    if (status)          updates.status  = status;
    if (scheduledFor !== undefined) updates.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;

    const [updated] = await db.update(newsletterCampaigns)
      .set(updates)
      .where(eq(newsletterCampaigns.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Campaign not found" });
    res.json(updated);
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/campaigns/:id", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(newsletterCampaigns).where(eq(newsletterCampaigns.id, req.params.id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.post("/campaigns/:id/resend", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const [campaign] = await db.select().from(newsletterCampaigns)
      .where(eq(newsletterCampaigns.id, req.params.id))
      .limit(1);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const subscribers = await db.select().from(newsletter);
    if (subscribers.length === 0) return res.status(400).json({ error: "No subscribers to send to" });

    await db.update(newsletterCampaigns)
      .set({ status: "SENDING", recipientCount: subscribers.length, sentCount: 0, sentAt: new Date(), updatedAt: new Date() })
      .where(eq(newsletterCampaigns.id, campaign.id));

    res.json({ message: "Resend queued", campaignId: campaign.id, recipientCount: subscribers.length });

    let sentCount = 0;
    for (const sub of subscribers) {
      try {
        await sendCampaignEmail(sub.email, campaign.subject, campaign.body);
        sentCount++;
      } catch (err) {
        console.error(`Failed to resend to ${sub.email}:`, err);
      }
    }

    const finalStatus = sentCount === 0 ? "FAILED" : sentCount === subscribers.length ? "SENT" : "PARTIAL";
    await db.update(newsletterCampaigns)
      .set({ sentCount, status: finalStatus, updatedAt: new Date() })
      .where(eq(newsletterCampaigns.id, campaign.id));

  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(newsletter).where(eq(newsletter.id, req.params.id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

export default router;
