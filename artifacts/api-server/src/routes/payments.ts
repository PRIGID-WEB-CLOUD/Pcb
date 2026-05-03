import { Router } from "express";
import { getSession } from "../lib/auth";

const router = Router();

router.post("/initialize", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { amount, callbackUrl, provider = "paystack" } = req.body;
    const value = Math.round(Number(amount) * 100);
    const flutterwaveSecret = process.env.FLUTTERWAVE_SECRET_KEY;
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

    if (provider === "flutterwave") {
      if (!flutterwaveSecret) {
        return res.status(200).json({
          status: "success",
          data: {
            link: callbackUrl || "/",
            tx_ref: "demo_fw_" + Date.now(),
          },
        });
      }

      const response = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${flutterwaveSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: `tx_${Date.now()}`,
          amount: Number(amount),
          currency: "USD",
          redirect_url: callbackUrl,
          customer: { email: user.email, name: user.name ?? user.email },
          meta: { userId: user.id },
          customization: {
            title: "LUXE BOUTIQUE",
            description: "Secure checkout",
          },
        }),
      });

      return res.json(await response.json());
    }

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

    return res.json(await response.json());
  } catch {
    return res.status(500).json({ error: "Payment initialization failed" });
  }
});

router.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;
    const { provider = "paystack" } = req.query;
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    const FLUTTERWAVE_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;

    if (provider === "flutterwave") {
      if (!FLUTTERWAVE_SECRET) {
        return res.json({ status: "success", data: { status: "successful" } });
      }
      const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET}` },
      });
      return res.json(await response.json());
    }

    if (!PAYSTACK_SECRET) {
      return res.json({ status: true, data: { status: "success" } });
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    return res.json(await response.json());
  } catch {
    return res.status(500).json({ error: "Payment verification failed" });
  }
});

export default router;
