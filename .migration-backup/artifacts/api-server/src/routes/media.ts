import { Router, Request, Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { db } from "@workspace/db";
import { mediaAssets } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../lib/auth";
import { getCloudinaryConfig } from "../lib/settings";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function configureCloudinary() {
  const cfg = await getCloudinaryConfig();
  if (!cfg.cloudName || !cfg.apiKey || !cfg.apiSecret) return false;
  cloudinary.config({ cloud_name: cfg.cloudName, api_key: cfg.apiKey, api_secret: cfg.apiSecret });
  return true;
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const cfg = await getCloudinaryConfig();
    const assets = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
    res.json({ assets, cloudinaryConfigured: !!(cfg.cloudName && cfg.apiKey && cfg.apiSecret) });
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.post("/upload", upload.array("files", 20), async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const ready = await configureCloudinary();
    if (!ready) return res.status(400).json({ error: "Cloudinary is not configured. Go to Settings → Media Storage." });

    const files = req.files as Express.Multer.File[];
    if (!files?.length) return res.status(400).json({ error: "No files uploaded" });

    const uploaded = [];
    for (const file of files) {
      const result: any = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "luxe-boutique", resource_type: "image", use_filename: true, unique_filename: true },
          (err, r) => { if (err) reject(err); else resolve(r); }
        );
        stream.end(file.buffer);
      });

      const [asset] = await db.insert(mediaAssets).values({
        publicId:     result.public_id,
        url:          result.url,
        secureUrl:    result.secure_url,
        originalName: file.originalname,
        format:       result.format,
        width:        result.width,
        height:       result.height,
        bytes:        result.bytes,
        folder:       result.folder ?? "luxe-boutique",
      }).returning();

      uploaded.push(asset);
    }

    res.json({ uploaded, count: uploaded.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Upload failed" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, req.params.id)).limit(1);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    const ready = await configureCloudinary();
    if (ready) {
      try { await cloudinary.uploader.destroy(asset.publicId); } catch { /* continue even if cloud delete fails */ }
    }

    await db.delete(mediaAssets).where(eq(mediaAssets.id, req.params.id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

export default router;
