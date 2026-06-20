import { Router } from "express";
import { db } from "@workspace/db";
import { carts, cartItems, products, coupons } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "../lib/auth";
import { getPaymentConfig } from "../lib/settings";

const router = Router();

async function computeCartTotal(userId: string, couponCode?: string) {
  const [cart] = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
  if (!cart) return null;

  const items = await db
    .select({ quantity: cartItems.quantity, price: products.price })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cart.id));

  if (!items.length) return null;

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  let discount = 0;
  if (couponCode) {
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.code, couponCode.trim().toUpperCase()), eq(coupons.active, true)))
      .limit(1);

    if (coupon && subtotal >= coupon.minOrderAmount) {
      const notExpired = !coupon.expiresAt || coupon.expiresAt > new Date();
      const hasUses = !coupon.maxUses || coupon.usedCount < coupon.maxUses;
      if (notExpired && hasUses) {
        discount =
          coupon.discountType === "PERCENTAGE"
            ? subtotal * (coupon.discountValue / 100)
            : Math.min(coupon.discountValue, subtotal);
      }
    }
  }

  return { subtotal, discount, total: Math.max(0, subtotal - discount) };
}

router.post("/initialize", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { callbackUrl, provider = "paystack", couponCode } = req.body;
    const paymentConfig = await getPaymentConfig();

    const computed = await computeCartTotal(user.id, couponCode);
    if (!computed) return res.status(400).json({ error: "Cart is empty" });

    const numericAmount = computed.total;

    if (provider === "flutterwave") {
      if (!paymentConfig.flutterwaveSecretKey) {
        return res.status(400).json({ error: "Flutterwave is not configured" });
      }

      const response = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paymentConfig.flutterwaveSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: `tx_${Date.now()}`,
          amount: numericAmount,
          currency: "USD",
          redirect_url: callbackUrl,
          customer: { email: user.email, name: user.name ?? user.email },
          meta: { userId: user.id, provider: "flutterwave" },
          customization: { title: "LUXE BOUTIQUE", description: "Secure checkout" },
        }),
      });

      return res.json(await response.json());
    }

    if (!paymentConfig.paystackSecretKey) {
      return res.status(400).json({ error: "Paystack is not configured" });
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paymentConfig.paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(numericAmount * 100),
        callback_url: callbackUrl,
        metadata: { userId: user.id, provider: "paystack" },
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
    const paymentConfig = await getPaymentConfig();

    if (provider === "flutterwave") {
      if (!paymentConfig.flutterwaveSecretKey) {
        return res.status(400).json({ error: "Flutterwave is not configured" });
      }
      const response = await fetch(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${paymentConfig.flutterwaveSecretKey}` } },
      );
      return res.json(await response.json());
    }

    if (!paymentConfig.paystackSecretKey) {
      return res.status(400).json({ error: "Paystack is not configured" });
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${paymentConfig.paystackSecretKey}` },
    });
    return res.json(await response.json());
  } catch {
    return res.status(500).json({ error: "Payment verification failed" });
  }
});

export default router;
