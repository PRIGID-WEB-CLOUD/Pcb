import { Router } from "express";
import { db } from "@workspace/db";
import {
  whatsappTemplates, whatsappJourneys, whatsappOptinSettings,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

const DEFAULT_TEMPLATES = [
  { name: "order_confirmation", category: "Utility",     status: "Approved", sentCount: 8102, body: "Hi {{1}}, your order #{{2}} has been confirmed! Estimated delivery: {{3}}. Track at luxeboutique.com/track" },
  { name: "cart_recovery_1",    category: "Marketing",   status: "Approved", sentCount: 2841, body: "{{1}}, you left something behind ✨ Your cart is waiting — complete your order before it sells out: {{2}}" },
  { name: "vip_welcome",        category: "Marketing",   status: "Approved", sentCount: 142,  body: "Welcome to LUXE VIP, {{1}} 🖤 You now have exclusive early access to new collections and private sale events." },
  { name: "shipping_update",    category: "Utility",     status: "Approved", sentCount: 6218, body: "Your order is on the way! 📦 Track your parcel: {{1}}\nExpected delivery: {{2}}" },
  { name: "review_request",     category: "Marketing",   status: "Pending",  sentCount: 0,    body: "How did we do, {{1}}? Share your experience and get 10% off your next order." },
];

const DEFAULT_JOURNEYS = [
  { journeyId: "cart",     icon: "shopping_cart",  title: "Abandoned Cart",  description: "3-step recovery sequence triggered 30min after cart abandonment.", active: true,  sentCount: "2,841", steps: 3, convRate: "18.4%" },
  { journeyId: "shipping", icon: "local_shipping", title: "Order Tracking",  description: "Real-time shipping updates sent automatically at each milestone.",   active: true,  sentCount: "8,102", steps: 4, convRate: "—"     },
  { journeyId: "vip",      icon: "star",           title: "VIP Welcome",     description: "Exclusive welcome flow for customers spending over $2,000.",          active: false, sentCount: "142",   steps: 2, convRate: "34.0%" },
  { journeyId: "review",   icon: "rate_review",    title: "Review Request",  description: "Sent 5 days after delivery to collect product reviews.",              active: false, sentCount: "0",     steps: 1, convRate: "—"     },
];

async function seedIfEmpty() {
  const existing = await db.select().from(whatsappTemplates).limit(1);
  if (existing.length) return;
  await db.insert(whatsappTemplates).values(DEFAULT_TEMPLATES);
  await db.insert(whatsappJourneys).values(DEFAULT_JOURNEYS);
  await db.insert(whatsappOptinSettings).values([{}]);
}

// GET /api/whatsapp/templates
router.get("/templates", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await seedIfEmpty();
    res.json(await db.select().from(whatsappTemplates));
  } catch { res.status(500).json({ error: "Failed" }); }
});

// POST /api/whatsapp/templates
router.post("/templates", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { name, category, body } = req.body;
    const [created] = await db.insert(whatsappTemplates)
      .values({ name: name.toLowerCase().replace(/\s+/g, "_"), category, body, status: "Pending" })
      .returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// DELETE /api/whatsapp/templates/:id
router.delete("/templates/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// GET /api/whatsapp/journeys
router.get("/journeys", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await seedIfEmpty();
    res.json(await db.select().from(whatsappJourneys));
  } catch { res.status(500).json({ error: "Failed" }); }
});

// PUT /api/whatsapp/journeys/:journeyId
router.put("/journeys/:journeyId", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [updated] = await db.update(whatsappJourneys)
      .set({ active: req.body.active, updatedAt: new Date() })
      .where(eq(whatsappJourneys.journeyId, req.params.journeyId))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// GET /api/whatsapp/optin
router.get("/optin", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await seedIfEmpty();
    const [settings] = await db.select().from(whatsappOptinSettings).limit(1);
    res.json(settings);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// PUT /api/whatsapp/optin
router.put("/optin", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { optinKeyword, optoutKeyword, doubleOptin } = req.body;
    const [existing] = await db.select().from(whatsappOptinSettings).limit(1);
    const [updated] = await db.update(whatsappOptinSettings)
      .set({ optinKeyword, optoutKeyword, doubleOptin, updatedAt: new Date() })
      .where(eq(whatsappOptinSettings.id, existing.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
