import { Router } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch users" }); }
});

export default router;
