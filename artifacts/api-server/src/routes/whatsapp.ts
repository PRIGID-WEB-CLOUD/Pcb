import { Router } from "express";
import { randomUUID } from "crypto";
import { addEvent, getChannelCredentials } from "./channels";
import { requireAdmin } from "../middleware/requireAdmin";
import { db, whatsappTemplatesTable, whatsappJourneysTable, whatsappOptinSettingsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();
router.use(requireAdmin);

function getWaCreds() { return getChannelCredentials("whatsapp"); }

// ── Routes ───────────────────────────────────────────────────────────────────

router.get("/whatsapp/templates", async (_req, res) => {
  return res.json(await db.select().from(whatsappTemplatesTable).orderBy(desc(whatsappTemplatesTable.createdAt)));
});

router.post("/whatsapp/templates", async (req, res) => {
  const { name, category, body } = req.body as { name: string; category: string; body: string };
  const [tpl] = await db.insert(whatsappTemplatesTable).values({
    id: randomUUID(), name, category: category ?? "Marketing", body, status: "Pending", language: "en",
  }).returning();
  addEvent("whatsapp", `Template submitted: ${name}`, "Pending Meta approval (usually 24h).", "info");
  return res.status(201).json(tpl);
});

router.delete("/whatsapp/templates/:id", async (req, res) => {
  await db.delete(whatsappTemplatesTable).where(eq(whatsappTemplatesTable.id, req.params.id as string));
  return res.json({ ok: true });
});

router.post("/whatsapp/templates/:id/submit", async (req, res) => {
  const { id } = req.params;
  const [template] = await db.select().from(whatsappTemplatesTable)
    .where(eq(whatsappTemplatesTable.id, id as string)).limit(1);
  if (!template) return res.status(404).json({ error: "Template not found" });

  const creds = await getWaCreds();
  const wabaId = creds["waba_id"];
  const token = creds["system_access_token"];
  if (!wabaId || !token) return res.status(400).json({ error: "Missing WhatsApp WABA ID or System Access Token." });

  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: template.name,
        language: template.language,
        category: template.category.toUpperCase(),
        components: [{ type: "BODY", text: template.body }],
      }),
    });
    const data = await r.json() as Record<string, unknown>;
    if (!r.ok || data["error"]) return res.status(400).json({ error: (data["error"] as Record<string, string>)?.message ?? `HTTP ${r.status}` });
    await db.update(whatsappTemplatesTable).set({ status: "Pending" })
      .where(eq(whatsappTemplatesTable.id, id as string));
    addEvent("whatsapp", `Template "${template.name}" submitted to Meta`, "Awaiting approval.", "info");
    return res.json({ ok: true, status: "Pending" });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get("/whatsapp/journeys", async (_req, res) => {
  return res.json(await db.select().from(whatsappJourneysTable).orderBy(desc(whatsappJourneysTable.updatedAt)));
});

router.put("/whatsapp/journeys/:journeyId", async (req, res) => {
  const { journeyId } = req.params;
  const { active } = req.body as { active: boolean };
  const [j] = await db.update(whatsappJourneysTable)
    .set({ active: Boolean(active), updatedAt: new Date() })
    .where(eq(whatsappJourneysTable.journeyId, journeyId as string)).returning();
  if (!j) return res.status(404).json({ error: "Journey not found" });
  addEvent("whatsapp", `Journey "${j?.title}" ${active ? "activated" : "paused"}`, active ? "Journey is now live." : "Journey paused.", active ? "sync" : "warning");
  return res.json(j);
});

router.get("/whatsapp/optin", async (_req, res) => {
  const [settings] = await db.select().from(whatsappOptinSettingsTable)
    .where(eq(whatsappOptinSettingsTable.id, "default")).limit(1);
  return res.json(settings ?? { id: "default", optinKeyword: "JOIN", optoutKeyword: "STOP", doubleOptin: true });
});

router.put("/whatsapp/optin", async (req, res) => {
  const [settings] = await db.insert(whatsappOptinSettingsTable).values({
    id: "default",
    optinKeyword: String(req.body.optinKeyword ?? "JOIN"),
    optoutKeyword: String(req.body.optoutKeyword ?? "STOP"),
    doubleOptin: Boolean(req.body.doubleOptin ?? true),
  }).onConflictDoUpdate({
    target: whatsappOptinSettingsTable.id,
    set: {
      optinKeyword: String(req.body.optinKeyword ?? "JOIN"),
      optoutKeyword: String(req.body.optoutKeyword ?? "STOP"),
      doubleOptin: Boolean(req.body.doubleOptin ?? true),
      updatedAt: new Date(),
    },
  }).returning();
  return res.json(settings);
});

// ── Live: WhatsApp Phone Info ─────────────────────────────────────────────────

router.get("/whatsapp/phone-info", async (_req, res) => {
  const creds = await getWaCreds();
  const phoneNumberId = creds["phone_number_id"];
  const token = creds["system_access_token"];
  if (!phoneNumberId || !token) return res.status(400).json({ error: "Missing WhatsApp credentials — add Phone Number ID and System Access Token." });
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,quality_rating,status,verified_name`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json() as Record<string, unknown>;
    if (!r.ok || data["error"]) return res.status(400).json({ error: (data["error"] as Record<string, string>)?.message ?? `HTTP ${r.status}` });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── Live: Send Message ────────────────────────────────────────────────────────

router.post("/whatsapp/messages/send", async (req, res) => {
  const creds = await getWaCreds();
  const phoneNumberId = creds["phone_number_id"];
  const token = creds["system_access_token"];
  const { to, text } = req.body as { to: string; text: string };

  if (!phoneNumberId || !token) return res.status(400).json({ error: "Missing Phone Number ID or System Access Token." });
  if (!to || !text) return res.status(400).json({ error: "to and text are required." });

  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: text },
      }),
    });
    const data = await r.json() as Record<string, unknown>;
    if (!r.ok || data["error"]) return res.status(400).json({ error: (data["error"] as Record<string, string>)?.message ?? `HTTP ${r.status}` });
    addEvent("whatsapp", `Message sent to +${to}`, `"${text.slice(0, 50)}${text.length > 50 ? "…" : ""}"`, "sync");
    return res.json({ result: data });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
