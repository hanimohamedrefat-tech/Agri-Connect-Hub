import { Router, type IRouter } from "express";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/notifications", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const limit = parseInt(String(req.query.limit ?? "20"), 10);
  const offset = parseInt(String(req.query.offset ?? "0"), 10);

  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, req.userId!))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit).offset(offset);

  const enriched = await Promise.all(notifications.map(async n => {
    let actor = null;
    if (n.actorId) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, n.actorId));
      if (user) {
        actor = {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          bio: user.bio,
          avatar: user.avatar,
          coverPhoto: user.coverPhoto,
          specialty: user.specialty,
          location: user.location,
          website: user.website,
          isVerified: user.isVerified,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          isFollowing: false,
          createdAt: user.createdAt.toISOString(),
        };
      }
    }
    return {
      id: n.id,
      userId: n.userId,
      type: n.type,
      actor,
      postId: n.postId ?? null,
      isRead: n.isRead,
      message: n.message,
      createdAt: n.createdAt.toISOString(),
    };
  }));

  res.json(enriched);
});

router.get("/notifications/summary", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const [cnt] = await db.select({ count: sql<number>`count(*)::int` }).from(notificationsTable)
    .where(eq(notificationsTable.userId, req.userId!));
  
  const unread = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, req.userId!));
  const unreadCount = unread.filter(n => !n.isRead).length;
  
  res.json({ unreadCount });
});

router.post("/notifications/read-all", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, req.userId!));
  res.json({ message: "All notifications marked as read" });
});

export default router;
