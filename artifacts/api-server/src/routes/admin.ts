import { Router, type IRouter } from "express";
import { db, adsTable, usersTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

// ─── ADS ─────────────────────────────────────────────────────────────────────

// GET /admin/ads — list all ads
router.get("/admin/ads", authMiddleware, async (_req, res): Promise<void> => {
  try {
    const ads = await db.select().from(adsTable).orderBy(adsTable.createdAt);
    res.json(ads);
  } catch {
    res.status(500).json({ error: "Failed to fetch ads" });
  }
});

// POST /admin/ads — create ad
router.post("/admin/ads", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { title, body, imageUrl, linkUrl, sponsorName } = req.body as {
      title: string;
      body: string;
      imageUrl?: string;
      linkUrl: string;
      sponsorName: string;
    };
    if (!title || !body || !linkUrl || !sponsorName) {
      res.status(400).json({ error: "title, body, linkUrl, sponsorName required" });
      return;
    }
    const [ad] = await db.insert(adsTable).values({ title, body, imageUrl, linkUrl, sponsorName }).returning();
    res.status(201).json(ad);
  } catch {
    res.status(500).json({ error: "Failed to create ad" });
  }
});

// PATCH /admin/ads/:id — toggle isActive
router.patch("/admin/ads/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { isActive } = req.body as { isActive: boolean };
    const [ad] = await db
      .update(adsTable)
      .set({ isActive })
      .where(eq(adsTable.id, Number(req.params.id)))
      .returning();
    if (!ad) { res.status(404).json({ error: "Ad not found" }); return; }
    res.json(ad);
  } catch {
    res.status(500).json({ error: "Failed to update ad" });
  }
});

// DELETE /admin/ads/:id — delete ad
router.delete("/admin/ads/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    await db.delete(adsTable).where(eq(adsTable.id, Number(req.params.id)));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete ad" });
  }
});

// ─── USERS ────────────────────────────────────────────────────────────────────

// GET /admin/users?q=... — search users
router.get("/admin/users", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const q = (req.query.q as string | undefined)?.trim() ?? "";
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        email: usersTable.email,
        avatar: usersTable.avatar,
        specialty: usersTable.specialty,
        isVerified: usersTable.isVerified,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(
        q
          ? or(
              ilike(usersTable.username, `%${q}%`),
              ilike(usersTable.displayName, `%${q}%`),
              ilike(usersTable.email, `%${q}%`),
            )
          : undefined,
      )
      .limit(30)
      .orderBy(usersTable.createdAt);
    res.json(users);
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// PATCH /admin/users/:id/verify — grant or revoke verification
router.patch("/admin/users/:id/verify", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { isVerified } = req.body as { isVerified: boolean };
    const [user] = await db
      .update(usersTable)
      .set({ isVerified })
      .where(eq(usersTable.id, Number(req.params.id)))
      .returning({ id: usersTable.id, username: usersTable.username, isVerified: usersTable.isVerified });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to update user" });
  }
});

export default router;
