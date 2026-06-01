import { Router, type IRouter } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { objectStorageClient } from "../lib/objectStorage";
import { authMiddleware } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";

router.post("/upload", authMiddleware, upload.array("images", 4), async (req, res): Promise<void> => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: "No files uploaded" });
    return;
  }

  if (!BUCKET_ID) {
    res.status(500).json({ error: "Object storage not configured" });
    return;
  }

  try {
    const urls = await Promise.all(files.map(async (f) => {
      const ext = (f.originalname.split(".").pop() ?? "jpg").toLowerCase();
      const objectId = randomUUID();
      const objectName = `.private/uploads/${objectId}.${ext}`;
      const bucket = objectStorageClient.bucket(BUCKET_ID);
      const file = bucket.file(objectName);

      await file.save(f.buffer, {
        metadata: { contentType: f.mimetype },
        resumable: false,
      });

      return `/api/storage/objects/uploads/${objectId}.${ext}`;
    }));

    res.json({ urls });
  } catch (err) {
    logger.error({ err }, "Upload to GCS failed");
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
