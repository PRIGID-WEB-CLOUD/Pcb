import { Router } from "express";
import { createHash, randomBytes } from "crypto";
import { db } from "@workspace/db";
import { apiKeys } from "@workspace/db/schema";
import { eq, isNull, isNotNull } from "drizzle-orm";
import { getSession } from "../lib/auth";

const router = Router();

// GET /api/apikeys
router.get("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const rows = await db
      .select({
        id:         apiKeys.id,
        name:       apiKeys.name,
        keyPrefix:  apiKeys.keyPrefix,
        createdBy:  apiKeys.createdBy,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt:  apiKeys.expiresAt,
        revokedAt:  apiKeys.revokedAt,
        createdAt:  apiKeys.createdAt,
      })
      .from(apiKeys)
      .orderBy(apiKeys.createdAt);

    res.json(rows);
  } catch (e) {
    console.error("[apikeys/list]", e);
    res.status(500).json({ error: "Failed to list API keys" });
  }
});

// POST /api/apikeys  — create a new key, returns the raw key ONCE
router.post("/", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { name, expiresAt } = req.body as { name?: string; expiresAt?: string };
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });

    const rawKey   = `lxb_${randomBytes(24).toString("hex")}`;
    const keyHash  = createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(0, 12);

    const [row] = await db.insert(apiKeys).values({
      name:      name.trim(),
      keyPrefix,
      keyHash,
      createdBy: user.email,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning({
      id:        apiKeys.id,
      name:      apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdBy: apiKeys.createdBy,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    });

    res.json({ ...row, rawKey });
  } catch (e) {
    console.error("[apikeys/create]", e);
    res.status(500).json({ error: "Failed to create API key" });
  }
});

// DELETE /api/apikeys/:id  — revoke (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const [updated] = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeys.id, req.params.id))
      .returning({ id: apiKeys.id });

    if (!updated) return res.status(404).json({ error: "Key not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error("[apikeys/revoke]", e);
    res.status(500).json({ error: "Failed to revoke key" });
  }
});

// DELETE /api/apikeys/:id/permanent  — hard delete
router.delete("/:id/permanent", async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user || user.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    await db.delete(apiKeys).where(eq(apiKeys.id, req.params.id));
    res.json({ ok: true });
  } catch (e) {
    console.error("[apikeys/delete]", e);
    res.status(500).json({ error: "Failed to delete key" });
  }
});

export default router;
