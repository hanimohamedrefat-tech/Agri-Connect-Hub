import { Router, type IRouter } from "express";
import { db, usersTable, followsTable, notificationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { getUserWithCounts } from "./users";

const router: IRouter = Router();

router.post("/follows/:username", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { username } = req.params;
  const [target] = await db.select().from(usersTable).where(eq(usersTable.username, username as string));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (target.id === req.userId) {
    res.status(400).json({ error: "Cannot follow yourself" });
    return;
  }

  const [existing] = await db.select().from(followsTable).where(and(eq(followsTable.followerId, req.userId!), eq(followsTable.followingId, target.id)));

  if (existing) {
    await db.delete(followsTable).where(eq(followsTable.id, existing.id));
    const [cnt] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, target.id));
    res.json({ following: false, followersCount: cnt?.count ?? 0 });
  } else {
    await db.insert(followsTable).values({ followerId: req.userId!, followingId: target.id });
    await db.insert(notificationsTable).values({
      userId: target.id,
      actorId: req.userId!,
      type: "follow",
      message: "بدأ يتابعك",
    });
    const [cnt] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, target.id));
    res.json({ following: true, followersCount: cnt?.count ?? 0 });
  }
});

export default router;
