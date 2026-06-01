import { Router, type IRouter } from "express";
import { db, storiesTable, storyViewsTable, usersTable, followsTable } from "@workspace/db";
import { eq, and, gt, inArray, sql } from "drizzle-orm";
import { authMiddleware, optionalAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function enrichStory(
  story: typeof storiesTable.$inferSelect,
  currentUserId?: number,
) {
  const [viewsCnt] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(storyViewsTable)
    .where(eq(storyViewsTable.storyId, story.id));

  let isViewed = false;
  if (currentUserId) {
    const [view] = await db
      .select()
      .from(storyViewsTable)
      .where(
        and(
          eq(storyViewsTable.storyId, story.id),
          eq(storyViewsTable.viewerId, currentUserId),
        ),
      );
    isViewed = !!view;
  }

  return {
    id: story.id,
    userId: story.userId,
    imageUrl: story.imageUrl,
    caption: story.caption ?? null,
    expiresAt: story.expiresAt.toISOString(),
    createdAt: story.createdAt.toISOString(),
    viewsCount: viewsCnt?.count ?? 0,
    isViewed,
  };
}

// GET /stories — active stories from people you follow + your own
router.get("/stories", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const now = new Date();

  let authorIds: number[] = [];

  if (req.userId) {
    const following = await db
      .select({ followingId: followsTable.followingId })
      .from(followsTable)
      .where(eq(followsTable.followerId, req.userId));
    authorIds = following.map(f => f.followingId);
    authorIds.push(req.userId);
  }

  const activeStories = authorIds.length > 0
    ? await db
        .select()
        .from(storiesTable)
        .where(and(inArray(storiesTable.userId, authorIds), gt(storiesTable.expiresAt, now)))
        .orderBy(storiesTable.createdAt)
    : await db
        .select()
        .from(storiesTable)
        .where(gt(storiesTable.expiresAt, now))
        .orderBy(storiesTable.createdAt);

  // Group by user
  const userIds = [...new Set(activeStories.map(s => s.userId))];
  if (userIds.length === 0) {
    res.json([]);
    return;
  }

  const users = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, userIds));

  const userMap = new Map(users.map(u => [u.id, u]));
  const enriched = await Promise.all(activeStories.map(s => enrichStory(s, req.userId)));

  // Group by userId, ordered: own first, then unseen, then seen
  const groups: Record<number, typeof enriched> = {};
  for (const s of enriched) {
    if (!groups[s.userId]) groups[s.userId] = [];
    groups[s.userId].push(s);
  }

  const result = Object.entries(groups).map(([uid, stories]) => {
    const user = userMap.get(Number(uid));
    const hasViewed = stories.every(s => s.isViewed);
    return {
      user: {
        id: user!.id,
        username: user!.username,
        displayName: user!.displayName,
        avatar: user!.avatar ?? null,
        specialty: user!.specialty ?? null,
      },
      stories,
      hasViewed,
    };
  });

  // Own stories first, then unseen, then seen
  result.sort((a, b) => {
    if (req.userId) {
      if (a.user.id === req.userId) return -1;
      if (b.user.id === req.userId) return 1;
    }
    if (a.hasViewed !== b.hasViewed) return a.hasViewed ? 1 : -1;
    return 0;
  });

  res.json(result);
});

// POST /stories — create a story
router.post("/stories", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { imageUrl, caption } = req.body as { imageUrl: string; caption?: string };

  if (!imageUrl) {
    res.status(400).json({ error: "imageUrl is required" });
    return;
  }

  const expiresAt = addHours(new Date(), 24);

  const [story] = await db
    .insert(storiesTable)
    .values({ userId: req.userId!, imageUrl, caption: caption ?? null, expiresAt })
    .returning();

  const enriched = await enrichStory(story, req.userId);
  res.status(201).json(enriched);
});

// POST /stories/:storyId/view — mark a story as viewed
router.post("/stories/:storyId/view", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const storyId = parseInt(req.params.storyId as string, 10);

  const [story] = await db.select().from(storiesTable).where(eq(storiesTable.id, storyId));
  if (!story) {
    res.status(404).json({ error: "Story not found" });
    return;
  }

  // Don't count self-views
  if (story.userId !== req.userId) {
    const [existing] = await db
      .select()
      .from(storyViewsTable)
      .where(and(eq(storyViewsTable.storyId, storyId), eq(storyViewsTable.viewerId, req.userId!)));

    if (!existing) {
      await db.insert(storyViewsTable).values({ storyId, viewerId: req.userId! });
    }
  }

  res.json({ message: "Viewed" });
});

// DELETE /stories/:storyId — delete own story
router.delete("/stories/:storyId", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const storyId = parseInt(req.params.storyId as string, 10);

  const [story] = await db.select().from(storiesTable).where(eq(storiesTable.id, storyId));
  if (!story || story.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(storiesTable).where(eq(storiesTable.id, storyId));
  res.json({ message: "Story deleted" });
});

export default router;
