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
    const campaigns = await db.select().from(newsletterCampaigns).orderBy(desc(newsletterCampaigns.sentAt));
    res.json(campaigns);
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.post("/send", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { subject, body } = req.body;
    if (!subject?.trim() || !body?.trim())
      return res.status(400).json({ error: "Subject and body are required" });

    const subscribers = await db.select().from(newsletter).orderBy(desc(newsletter.createdAt));
    if (subscribers.length === 0)
      return res.status(400).json({ error: "No subscribers to send to" });

    const [campaign] = await db.insert(newsletterCampaigns).values({
      subject: subject.trim(),
      body: body.trim(),
      recipientCount: subscribers.length,
      sentCount: 0,
      status: "SENDING",
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

    await db.update(newsletterCampaigns)
      .set({ sentCount, status: sentCount === subscribers.length ? "SENT" : "PARTIAL" })
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
