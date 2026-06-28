import { Router } from "express";
import { randomUUID } from "crypto";
import { addEvent, credentials } from "./channels";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();
router.use(requireAdmin);

// ── In-memory store ──────────────────────────────────────────────────────────

interface Template { id: string; name: string; category: string; body: string; status: string; language: string; sentCount: number; }
interface Journey  { id: string; journeyId: string; icon: string; title: string; description: string; active: boolean; sentCount: string; steps: number; convRate: string; }
interface OptinSettings { id: string; optinKeyword: string; optoutKeyword: string; doubleOptin: boolean; }

let templates: Template[] = [
  { id: randomUUID(), name: "order_confirmation",  category: "Utility",        body: "Hi {{1}}, your order {{2}} has been confirmed. Estimated delivery: {{3}}. Thank you for shopping with LUXE BOUTIQUE.",                          status: "Approved", language: "en", sentCount: 1240 },
  { id: randomUUID(), name: "shipping_update",     category: "Utility",        body: "Good news, {{1}}! Your order {{2}} is on its way. Track your delivery here: {{3}}",                                                            status: "Approved", language: "en", sentCount: 980  },
  { id: randomUUID(), name: "new_collection_drop", category: "Marketing",      body: "✨ {{1}}, the {{2}} Collection has arrived. Crafted for the discerning few — shop before it sells out: {{3}} #LuxeBoutique",                   status: "Approved", language: "en", sentCount: 3200 },
  { id: randomUUID(), name: "cart_abandoned",      category: "Marketing",      body: "Hi {{1}}, you left something special behind 🖤 Your cart is waiting: {{2}} — complete your order before stock runs out.",                     status: "Pending",  language: "en", sentCount: 0    },
  { id: randomUUID(), name: "otp_verification",    category: "Authentication", body: "Your LUXE BOUTIQUE verification code is {{1}}. Valid for 10 minutes. Do not share this code.",                                               status: "Approved", language: "en", sentCount: 450  },
];

let journeys: Journey[] = [
  { id: randomUUID(), journeyId: "welcome_series",      icon: "waving_hand",    title: "Welcome Series",          description: "Onboard new subscribers with 3 messages over 7 days.",                active: true,  sentCount: "12.4K", steps: 3, convRate: "18.2%" },
  { id: randomUUID(), journeyId: "order_lifecycle",     icon: "local_shipping", title: "Order Lifecycle",         description: "Confirm → ship → deliver → review, fully automated.",                active: true,  sentCount: "8.1K",  steps: 4, convRate: "94.1%" },
  { id: randomUUID(), journeyId: "cart_recovery",       icon: "shopping_cart",  title: "Cart Recovery",           description: "3-step abandoned cart recovery with personalised offer.",             active: false, sentCount: "2.3K",  steps: 3, convRate: "11.7%" },
  { id: randomUUID(), journeyId: "reengagement",        icon: "refresh",        title: "Re-engagement",          description: "Win-back customers inactive for 60+ days with an exclusive offer.",   active: false, sentCount: "4.7K",  steps: 2, convRate: "6.4%"  },
  { id: randomUUID(), journeyId: "vip_loyalty",         icon: "star",           title: "VIP Loyalty",             description: "Surprise and delight top spenders with early access and gifts.",     active: true,  sentCount: "890",   steps: 5, convRate: "32.1%" },
];

let optinSettings: OptinSettings = {
  id: randomUUID(),
  optinKeyword: "JOIN",
  optoutKeyword: "STOP",
  doubleOptin: true,
};

function getWaCreds() { return credentials["whatsapp"] ?? {}; }

// ── Routes ───────────────────────────────────────────────────────────────────

router.get("/whatsapp/templates", (_req, res) => {
  res.json(templates);
});

router.post("/whatsapp/templates", (req, res) => {
  const { name, category, body } = req.body as { name: string; category: string; body: string };
  const tpl: Template = { id: randomUUID(), name, category: category ?? "Marketing", body, status: "Pending", language: "en", sentCount: 0 };
  templates = [...templates, tpl];
  addEvent("whatsapp", `Template submitted: ${name}`, "Pending Meta approval (usually 24h).", "info");
  res.status(201).json(tpl);
});

router.delete("/whatsapp/templates/:id", (req, res) => {
  templates = templates.filter((t) => t.id !== req.params.id);
  res.json({ ok: true });
});

router.post("/whatsapp/templates/:id/submit", async (req, res) => {
  const { id } = req.params;
  const template = templates.find((t) => t.id === id);
  if (!template) return res.status(404).json({ error: "Template not found" });

  const creds = getWaCreds();
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
    templates = templates.map((t) => t.id === id ? { ...t, status: "Pending" } : t);
    addEvent("whatsapp", `Template "${template.name}" submitted to Meta`, "Awaiting approval.", "info");
    res.json({ ok: true, status: "Pending" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/whatsapp/journeys", (_req, res) => {
  res.json(journeys);
});

router.put("/whatsapp/journeys/:journeyId", (req, res) => {
  const { journeyId } = req.params;
  const { active } = req.body as { active: boolean };
  journeys = journeys.map((j) => j.journeyId === journeyId ? { ...j, active } : j);
  const j = journeys.find((j) => j.journeyId === journeyId);
  addEvent("whatsapp", `Journey "${j?.title}" ${active ? "activated" : "paused"}`, active ? "Journey is now live." : "Journey paused.", active ? "sync" : "warning");
  res.json(j);
});

router.get("/whatsapp/optin", (_req, res) => {
  res.json(optinSettings);
});

router.put("/whatsapp/optin", (req, res) => {
  optinSettings = { ...optinSettings, ...req.body };
  res.json(optinSettings);
});

// ── Live: WhatsApp Phone Info ─────────────────────────────────────────────────

router.get("/whatsapp/phone-info", async (_req, res) => {
  const creds = getWaCreds();
  const phoneNumberId = creds["phone_number_id"];
  const token = creds["system_access_token"];
  if (!phoneNumberId || !token) return res.status(400).json({ error: "Missing WhatsApp credentials — add Phone Number ID and System Access Token." });
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,quality_rating,status,verified_name`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json() as Record<string, unknown>;
    if (!r.ok || data["error"]) return res.status(400).json({ error: (data["error"] as Record<string, string>)?.message ?? `HTTP ${r.status}` });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Live: Send Message ────────────────────────────────────────────────────────

router.post("/whatsapp/messages/send", async (req, res) => {
  const creds = getWaCreds();
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
    res.json({ result: data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
