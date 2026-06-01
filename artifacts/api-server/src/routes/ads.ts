import { Router, type IRouter } from "express";
import { db, adsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/ads/active", async (_req, res): Promise<void> => {
  try {
    const ads = await db.select().from(adsTable).where(eq(adsTable.isActive, true));
    if (ads.length === 0) {
      res.json(null);
      return;
    }
    const random = ads[Math.floor(Math.random() * ads.length)];
    res.json(random);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ads" });
  }
});

router.post("/ads", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { title, body, imageUrl, linkUrl, sponsorName } = req.body as {
      title: string;
      body: string;
      imageUrl?: string;
      linkUrl: string;
      sponsorName: string;
    };
    if (!title || !body || !linkUrl || !sponsorName) {
      res.status(400).json({ error: "title, body, linkUrl, sponsorName are required" });
      return;
    }
    const [ad] = await db.insert(adsTable).values({ title, body, imageUrl, linkUrl, sponsorName }).returning();
    res.status(201).json(ad);
  } catch (err) {
    res.status(500).json({ error: "Failed to create ad" });
  }
});

export default router;
