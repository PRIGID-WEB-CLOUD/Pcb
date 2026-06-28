import { Router } from "express";
import { db } from "@workspace/db";
import { jobRuns } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

async function adminOnly(req: any, res: any): Promise<boolean> {
  const user = await getSession(req);
  if (!user || user.role !== "ADMIN") { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

router.get("/jobs/runs", async (req, res) => {
  try {
    if (!await adminOnly(req, res)) return;
    const runs = await db.select().from(jobRuns).orderBy(desc(jobRuns.startedAt)).limit(200);
    res.json(runs);
  } catch {
    res.status(500).json({ error: "Failed to fetch job runs" });
  }
});

export default router;
