import { Router } from "express";
import { db } from "@workspace/db";
import {
  whatsappTemplates, whatsappJourneys, whatsappOptinSettings,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

// GET /api/whatsapp/templates
router.get("/templates", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
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
