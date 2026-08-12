import { Router } from "express";
import { db } from "@workspace/db";
import { appSettings } from "@workspace/db/schema";
import { getSession } from "../lib/auth";
import { getSettings, upsertSettings, getSmtpConfig, getCloudinaryConfig, MASK, SENSITIVE } from "../lib/settings";
import nodemailer from "nodemailer";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const raw = await getSettings();

    const masked: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      masked[k] = SENSITIVE.has(k) ? MASK : v;
    }

    const smtp      = await getSmtpConfig();
    const cloudinary = await getCloudinaryConfig();

    res.json({
      settings: masked,
      status: {
        smtpConfigured:      !!(smtp.host && smtp.user && smtp.pass),
        cloudinaryConfigured: !!(cloudinary.cloudName && cloudinary.apiKey && cloudinary.apiSecret),
      },
    });
  } catch (e) { res.status(500).json({ error: "Internal server error" }); }
});

router.put("/", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const updates: Record<string, string> = req.body;
    if (typeof updates !== "object") return res.status(400).json({ error: "Invalid body" });

    await upsertSettings(updates);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.post("/test/email", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const smtp = await getSmtpConfig();
    if (!smtp.host || !smtp.user || !smtp.pass)
      return res.status(400).json({ error: "SMTP is not configured. Save your credentials first." });

    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    await transport.sendMail({
      from: smtp.from ?? `Luxe Boutique <${smtp.user}>`,
      to: session.email,
      subject: "✓ Luxe Boutique — Email connection test",
      html: `<div style="font-family:sans-serif;padding:32px;max-width:480px;margin:auto;">
        <h2 style="color:#006c49;">Connection successful!</h2>
        <p>Your SMTP credentials are working correctly. Campaigns and notifications will be delivered.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
        <p style="color:#999;font-size:12px;">Sent from Luxe Boutique admin settings · ${new Date().toUTCString()}</p>
      </div>`,
    });

    res.json({ success: true, sentTo: session.email });
  } catch (e: any) {
    res.status(500).json({ error: `SMTP test failed: ${e.message}` });
  }
});

router.post("/test/cloudinary", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const cfg = await getCloudinaryConfig();
    if (!cfg.cloudName || !cfg.apiKey || !cfg.apiSecret)
      return res.status(400).json({ error: "Cloudinary is not configured. Save your credentials first." });

    const creds = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString("base64");
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cfg.cloudName}/resources/image?max_results=1`,
      { headers: { Authorization: `Basic ${creds}` } }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as any;
      return res.status(400).json({ error: err?.error?.message || "Invalid Cloudinary credentials" });
    }

    res.json({ success: true, cloudName: cfg.cloudName });
  } catch (e: any) {
    res.status(500).json({ error: `Cloudinary test failed: ${e.message}` });
  }
});

export default router;
