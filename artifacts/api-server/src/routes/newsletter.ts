import { Router } from "express";
import { randomUUID } from "crypto";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

// ── In-memory store ──────────────────────────────────────────────────────────

interface Subscriber { id: string; email: string; name: string | null; subscribedAt: string; active: boolean; }
interface Campaign   { id: string; subject: string; previewText: string; body: string; status: "draft" | "sent"; sentAt: string | null; sentCount: number; openRate: number; createdAt: string; }

let subscribers: Subscriber[] = [
  { id: randomUUID(), email: "audrey@example.com",   name: "Audrey Chen",    subscribedAt: new Date(Date.now() - 86400000 * 30).toISOString(), active: true },
  { id: randomUUID(), email: "marcus@example.com",   name: "Marcus Webb",    subscribedAt: new Date(Date.now() - 86400000 * 20).toISOString(), active: true },
  { id: randomUUID(), email: "isabelle@example.com", name: "Isabelle Morel", subscribedAt: new Date(Date.now() - 86400000 * 15).toISOString(), active: true },
  { id: randomUUID(), email: "james@example.com",    name: "James Harlow",   subscribedAt: new Date(Date.now() - 86400000 * 5).toISOString(),  active: true },
];

let campaigns: Campaign[] = [
  { id: randomUUID(), subject: "The Autumn Edit — New Arrivals", previewText: "Discover what's new this season.", body: "Dear atelier member,\n\nThis autumn's collection has arrived…", status: "sent", sentAt: new Date(Date.now() - 86400000 * 14).toISOString(), sentCount: 3820, openRate: 41.2, createdAt: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: randomUUID(), subject: "Members-Only: Early Access Event",previewText: "You're invited — enter before anyone else.", body: "As a valued member…",                                  status: "sent", sentAt: new Date(Date.now() - 86400000 * 7).toISOString(),  sentCount: 3820, openRate: 55.8, createdAt: new Date(Date.now() - 86400000 * 8).toISOString()  },
];

// ── Subscribers ───────────────────────────────────────────────────────────────

router.get("/newsletter", requireAdmin, (_req, res) => {
  return res.json(subscribers);
});

router.post("/newsletter", (req, res) => {
  const { email, name } = req.body as { email?: string; name?: string };
  if (!email || !email.includes("@")) return res.status(400).json({ error: "A valid email is required." });
  if (subscribers.find((s) => s.email === email)) return res.json({ ok: true, alreadySubscribed: true });
  const sub: Subscriber = { id: randomUUID(), email, name: name ?? null, subscribedAt: new Date().toISOString(), active: true };
  subscribers = [...subscribers, sub];
  return res.status(201).json({ ok: true, subscriber: sub });
});

router.delete("/newsletter/:id", requireAdmin, (req, res) => {
  subscribers = subscribers.filter((s) => s.id !== (req.params.id as string));
  return res.json({ ok: true });
});

router.get("/newsletter/export", requireAdmin, (_req, res) => {
  const rows = ["email,name,subscribedAt", ...subscribers.filter((s) => s.active).map((s) => `${s.email},${s.name ?? ""},${s.subscribedAt}`)].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="subscribers-${Date.now()}.csv"`);
  return res.send(rows);
});

// ── Campaigns ─────────────────────────────────────────────────────────────────

router.get("/newsletter/campaigns", requireAdmin, (_req, res) => {
  return res.json(campaigns);
});

router.post("/newsletter/send", requireAdmin, (req, res) => {
  const { subject, previewText, body } = req.body as { subject?: string; previewText?: string; body?: string };
  if (!subject || !body) return res.status(400).json({ error: "subject and body are required." });
  const campaign: Campaign = { id: randomUUID(), subject, previewText: previewText ?? "", body, status: "sent", sentAt: new Date().toISOString(), sentCount: subscribers.filter((s) => s.active).length, openRate: 0, createdAt: new Date().toISOString() };
  campaigns = [campaign, ...campaigns];
  return res.status(201).json(campaign);
});

router.put("/newsletter/campaigns/:id", requireAdmin, (req, res) => {
  const idx = campaigns.findIndex((c) => c.id === (req.params.id as string));
  if (idx === -1) return res.status(404).json({ error: "Campaign not found" });
  campaigns[idx] = { ...campaigns[idx], ...req.body };
  return res.json(campaigns[idx]);
});

router.delete("/newsletter/campaigns/:id", requireAdmin, (req, res) => {
  campaigns = campaigns.filter((c) => c.id !== (req.params.id as string));
  return res.json({ ok: true });
});

router.post("/newsletter/campaigns/:id/resend", requireAdmin, (req, res) => {
  const campaign = campaigns.find((c) => c.id === (req.params.id as string));
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  const resent: Campaign = { ...campaign, id: randomUUID(), status: "sent", sentAt: new Date().toISOString(), sentCount: subscribers.filter((s) => s.active).length, createdAt: new Date().toISOString() };
  campaigns = [resent, ...campaigns];
  return res.status(201).json(resent);
});

export default router;
