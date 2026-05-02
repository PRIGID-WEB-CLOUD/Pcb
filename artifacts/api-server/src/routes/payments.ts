import { Router } from "express";
import { getSession } from "../lib/auth";

const router = Router();

router.post("/initialize", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { amount, callbackUrl } = req.body;
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

    if (!PAYSTACK_SECRET) {
      return res.status(200).json({
        status: true,
        data: { authorization_url: callbackUrl || "/", reference: "demo_" + Date.now() }
      });
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amount * 100),
        callback_url: callbackUrl,
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch { res.status(500).json({ error: "Payment initialization failed" }); }
});

router.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

    if (!PAYSTACK_SECRET) {
      return res.json({ status: true, data: { status: "success" } });
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const data = await response.json();
    res.json(data);
  } catch { res.status(500).json({ error: "Payment verification failed" }); }
});

export default router;
