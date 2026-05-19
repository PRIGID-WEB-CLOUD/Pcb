import { Router } from "express";
import { db } from "@workspace/db";
import {
  whatsappTemplates, whatsappJourneys, whatsappOptinSettings,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "../lib/auth";
import { getCredMap, missingCreds } from "../lib/social/credentials";
import * as WA from "../lib/social/whatsapp";

const router = Router();
const WA_CREDS = ["phone_number_id", "waba_id", "system_access_token"];

async function adminOnly(req: any, res: any): Promise<boolean> {
  const user = await getSession(req);
  if (!user || user.role !== "ADMIN") { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

// ── Connection Info ───────────────────────────────────────────────────────────

router.get("/phone-info", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("whatsapp", WA_CREDS);
    const missing = missingCreds(creds, ["phone_number_id", "system_access_token"]);
    if (missing.length) { res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing }); return; }
    const info = await WA.getPhoneNumberInfo(creds.phone_number_id, creds.system_access_token);
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch phone info" });
  }
});

router.get("/waba-info", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("whatsapp", WA_CREDS);
    const missing = missingCreds(creds, ["waba_id", "system_access_token"]);
    if (missing.length) { res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing }); return; }
    const info = await WA.getWabaInfo(creds.waba_id, creds.system_access_token);
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch WABA info" });
  }
});

// ── Send Messages ─────────────────────────────────────────────────────────────

router.post("/messages/send", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("whatsapp", WA_CREDS);
    const missing = missingCreds(creds, ["phone_number_id", "system_access_token"]);
    if (missing.length) { res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing }); return; }

    const { to, text } = req.body;
    if (!to || !text) { res.status(400).json({ error: "to and text are required" }); return; }

    const result = await WA.sendTextMessage(creds.phone_number_id, creds.system_access_token, to, text);
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to send message" });
  }
});

router.post("/messages/send-template", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("whatsapp", WA_CREDS);
    const missing = missingCreds(creds, ["phone_number_id", "system_access_token"]);
    if (missing.length) { res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing }); return; }

    const { to, templateName, languageCode = "en", components } = req.body;
    if (!to || !templateName) { res.status(400).json({ error: "to and templateName are required" }); return; }

    const result = await WA.sendTemplateMessage(
      creds.phone_number_id, creds.system_access_token,
      to, templateName, languageCode, components
    );
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to send template message" });
  }
});

// ── Templates ─────────────────────────────────────────────────────────────────

router.get("/templates", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    res.json(await db.select().from(whatsappTemplates));
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/templates", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const { name, category, body } = req.body;
    const [created] = await db.insert(whatsappTemplates)
      .values({ name: name.toLowerCase().replace(/\s+/g, "_"), category, body, status: "Pending" })
      .returning();
    res.json(created);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// POST /api/whatsapp/templates/:id/submit — submit template to Meta for approval
router.post("/templates/:id/submit", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("whatsapp", WA_CREDS);
    const missing = missingCreds(creds, ["waba_id", "system_access_token"]);
    if (missing.length) { res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing }); return; }

    const [template] = await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.id, req.params.id)).limit(1);
    if (!template) { res.status(404).json({ error: "Template not found" }); return; }

    const result = await WA.submitTemplateToMeta(
      creds.waba_id, creds.system_access_token,
      template.name, template.category, template.language, template.body
    );

    const [updated] = await db.update(whatsappTemplates)
      .set({ status: "Submitted" })
      .where(eq(whatsappTemplates.id, req.params.id))
      .returning();

    res.json({ template: updated, metaResult: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Template submission failed" });
  }
});

// GET /api/whatsapp/templates/meta — fetch templates from Meta
router.get("/templates/meta", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const creds = await getCredMap("whatsapp", WA_CREDS);
    const missing = missingCreds(creds, ["waba_id", "system_access_token"]);
    if (missing.length) { res.status(400).json({ error: `Missing credentials: ${missing.join(", ")}`, missing }); return; }
    const data = await WA.getWabaTemplates(creds.waba_id, creds.system_access_token);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch Meta templates" });
  }
});

router.delete("/templates/:id", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Journeys ──────────────────────────────────────────────────────────────────

router.get("/journeys", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    res.json(await db.select().from(whatsappJourneys));
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/journeys/:journeyId", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [updated] = await db.update(whatsappJourneys)
      .set({ active: req.body.active, updatedAt: new Date() })
      .where(eq(whatsappJourneys.journeyId, req.params.journeyId))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Opt-in Settings ───────────────────────────────────────────────────────────

router.get("/optin", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const [settings] = await db.select().from(whatsappOptinSettings).limit(1);
    res.json(settings);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/optin", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const { optinKeyword, optoutKeyword, doubleOptin } = req.body;
    const [existing] = await db.select().from(whatsappOptinSettings).limit(1);
    const [updated] = await db.update(whatsappOptinSettings)
      .set({ optinKeyword, optoutKeyword, doubleOptin, updatedAt: new Date() })
      .where(eq(whatsappOptinSettings.id, existing.id))
      .returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Webhook (receive messages from Meta) ──────────────────────────────────────

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "luxe_wa_verify";
  if (mode === "subscribe" && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: "Verification failed" });
  }
});

router.post("/webhook", (req, res) => {
  const body = req.body;
  if (body?.object === "whatsapp_business_account") {
    const entries: any[] = body.entry ?? [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const msgs: any[] = change.value?.messages ?? [];
        for (const msg of msgs) {
          console.log(`[WhatsApp Webhook] Message from ${msg.from}: ${msg.text?.body ?? "(non-text)"}`);
        }
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.status(404).send("Not found");
  }
});

export default router;
