import { Router } from "express";
import { db } from "@workspace/db";
import { newsletter } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: "Valid email required" });

    const [existing] = await db.select().from(newsletter).where(eq(newsletter.email, email)).limit(1);
    if (existing) return res.status(400).json({ error: "Email is already subscribed" });

    await db.insert(newsletter).values({ email });
    res.json({ message: "Successfully subscribed to the newsletter!" });
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

export default router;
