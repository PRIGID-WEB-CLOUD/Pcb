import { Router } from "express";
import { db } from "@workspace/db";
import { coupons } from "@workspace/db/schema";
import { eq, desc, ilike } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const all = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    res.json(all);
  } catch { res.status(500).json({ error: "Failed to fetch coupons" }); }
});

router.post("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { code, description, discountType, discountValue, minOrderAmount, maxUses, active, expiresAt } = req.body;
    if (!code || !discountType || discountValue == null) {
      return res.status(400).json({ error: "code, discountType and discountValue are required" });
    }

    const [created] = await db.insert(coupons).values({
      code: code.trim().toUpperCase(),
      description: description ?? "",
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount ?? 0),
      maxUses: maxUses ? Number(maxUses) : null,
      active: active !== false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();

    res.json(created);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "A coupon with that code already exists" });
    res.status(500).json({ error: "Failed to create coupon" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { code, description, discountType, discountValue, minOrderAmount, maxUses, active, expiresAt } = req.body;
    const updates: Partial<typeof coupons.$inferInsert> = { updatedAt: new Date() };
    if (code !== undefined) updates.code = code.trim().toUpperCase();
    if (description !== undefined) updates.description = description;
    if (discountType !== undefined) updates.discountType = discountType;
    if (discountValue !== undefined) updates.discountValue = Number(discountValue);
    if (minOrderAmount !== undefined) updates.minOrderAmount = Number(minOrderAmount);
    if (maxUses !== undefined) updates.maxUses = maxUses ? Number(maxUses) : null;
    if (active !== undefined) updates.active = Boolean(active);
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const [updated] = await db.update(coupons).set(updates).where(eq(coupons.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Coupon not found" });
    res.json(updated);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "A coupon with that code already exists" });
    res.status(500).json({ error: "Failed to update coupon" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(coupons).where(eq(coupons.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to delete coupon" }); }
});

router.post("/validate", async (req, res) => {
  try {
    const { code, orderTotal, orderAmount } = req.body;
    const amount = orderTotal ?? orderAmount;
    if (!code) return res.status(400).json({ error: "code is required" });

    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code.trim().toUpperCase()));
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    if (!coupon.active) return res.status(400).json({ error: "This coupon is inactive" });
    if (coupon.expiresAt && new Date() > coupon.expiresAt) return res.status(400).json({ error: "This coupon has expired" });
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ error: "This coupon has reached its usage limit" });
    if (amount != null && Number(amount) < coupon.minOrderAmount) {
      return res.status(400).json({ error: `Minimum order of ${coupon.minOrderAmount} required`, minOrderAmount: coupon.minOrderAmount });
    }

    const numAmount = Number(amount ?? 0);
    const rawDiscount = coupon.discountType === "PERCENTAGE"
      ? (numAmount * coupon.discountValue) / 100
      : coupon.discountValue;
    const discount = Math.min(rawDiscount, numAmount > 0 ? numAmount : rawDiscount);

    res.json({
      valid:    true,
      code:     coupon.code,
      type:     coupon.discountType,
      value:    coupon.discountValue,
      discount,
      minOrderAmount: coupon.minOrderAmount,
      description: coupon.description,
    });
  } catch { res.status(500).json({ error: "Failed to validate coupon" }); }
});

router.post("/redeem", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "code is required" });
    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code.trim().toUpperCase()));
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    await db.update(coupons)
      .set({ usedCount: coupon.usedCount + 1, updatedAt: new Date() })
      .where(eq(coupons.id, coupon.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to redeem coupon" }); }
});

export default router;
