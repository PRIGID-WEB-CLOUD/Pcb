import { Router } from "express";
import { db } from "@workspace/db";
import { reviews, users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { productId, rating, comment } = req.body;
    if (!productId || !rating || !comment) return res.status(400).json({ error: "Missing required fields" });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be 1-5" });

    const [review] = await db.insert(reviews).values({
      productId, rating, comment, userId: user.id,
    }).returning();

    res.json({ ...review, user: { id: user.id, name: user.name } });
  } catch { res.status(500).json({ error: "Failed to submit review" }); }
});

export default router;
