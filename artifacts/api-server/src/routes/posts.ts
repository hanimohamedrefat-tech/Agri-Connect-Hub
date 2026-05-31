import { Router, type IRouter } from "express";
import { db, postsTable, postLikesTable, bookmarksTable, usersTable, followsTable, notificationsTable } from "@workspace/db";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { authMiddleware, optionalAuth, type AuthRequest } from "../middlewares/auth";
import { getUserWithCounts } from "./users";
import { emitToUser } from "../lib/socket";

const router: IRouter = Router();

async function enrichPost(post: typeof postsTable.$inferSelect, currentUserId?: number) {
  const author = await getUserWithCounts(post.authorId, currentUserId);
  const [likeCnt] = await db.select({ count: sql<number>`count(*)::int` }).from(postLikesTable).where(eq(postLikesTable.postId, post.id));
  const [commentCnt] = await db.select({ count: sql<number>`count(*)::int` }).from(commentsImport).where(eq(commentsImport.postId, post.id));
  const [repostCnt] = await db.select({ count: sql<number>`count(*)::int` }).from(postsTable).where(and(eq(postsTable.isRepost, true), eq(postsTable.originalPostId, post.id)));

  let isLiked = false;
  let isBookmarked = false;
  if (currentUserId) {
    const [lk] = await db.select().from(postLikesTable).where(and(eq(postLikesTable.postId, post.id), eq(postLikesTable.userId, currentUserId)));
    const [bk] = await db.select().from(bookmarksTable).where(and(eq(bookmarksTable.postId, post.id), eq(bookmarksTable.userId, currentUserId)));
    isLiked = !!lk;
    isBookmarked = !!bk;
  }

  const hashtags = extractHashtags(post.content);

  return {
    id: post.id,
    content: post.content,
    images: post.images ?? [],
    authorId: post.authorId,
    author,
    likesCount: likeCnt?.count ?? 0,
    commentsCount: commentCnt?.count ?? 0,
    repostsCount: repostCnt?.count ?? 0,
    isLiked,
    isBookmarked,
    isRepost: post.isRepost,
    originalPost: null,
    hashtags,
    createdAt: post.createdAt.toISOString(),
  };
}

function extractHashtags(content: string): string[] {
  const matches = content.match(/#[\u0600-\u06FFa-zA-Z0-9_]+/g);
  return matches ? matches.map(h => h.slice(1)) : [];
}

import { commentsTable as commentsImport } from "@workspace/db";

router.get("/posts/feed", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const limit = parseInt(String(req.query.limit ?? "20"), 10);
  const offset = parseInt(String(req.query.offset ?? "0"), 10);

  let posts: typeof postsTable.$inferSelect[];
  if (req.userId) {
    const following = await db.select({ followingId: followsTable.followingId }).from(followsTable).where(eq(followsTable.followerId, req.userId));
    const followingIds = following.map(f => f.followingId);
    followingIds.push(req.userId);

    if (followingIds.length > 0) {
      posts = await db.select().from(postsTable).where(inArray(postsTable.authorId, followingIds)).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset);
    } else {
      posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset);
    }
  } else {
    posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset);
  }

  const enriched = await Promise.all(posts.map(p => enrichPost(p, req.userId)));
  res.json(enriched);
});

router.get("/posts/trending", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(10);
  const enriched = await Promise.all(posts.map(p => enrichPost(p, req.userId)));

  const hashtagCounts: Record<string, number> = {};
  enriched.forEach(p => {
    p.hashtags.forEach(h => {
      hashtagCounts[h] = (hashtagCounts[h] ?? 0) + 1;
    });
  });
  const hashtags = Object.entries(hashtagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag, count }));

  res.json({ hashtags, posts: enriched.slice(0, 5) });
});

router.get("/posts/bookmarks", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const bks = await db.select({ postId: bookmarksTable.postId }).from(bookmarksTable).where(eq(bookmarksTable.userId, req.userId!)).orderBy(desc(bookmarksTable.createdAt));
  const postIds = bks.map(b => b.postId);
  if (postIds.length === 0) {
    res.json([]);
    return;
  }
  const posts = await db.select().from(postsTable).where(inArray(postsTable.id, postIds));
  const enriched = await Promise.all(posts.map(p => enrichPost(p, req.userId)));
  res.json(enriched);
});

router.get("/posts", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const { hashtag } = req.query as { hashtag?: string };
  const limit = parseInt(String(req.query.limit ?? "20"), 10);
  const offset = parseInt(String(req.query.offset ?? "0"), 10);

  const posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset);
  let enriched = await Promise.all(posts.map(p => enrichPost(p, req.userId)));

  if (hashtag) {
    enriched = enriched.filter(p => p.hashtags.includes(hashtag));
  }

  res.json(enriched);
});

router.post("/posts", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { content, images } = req.body;
  if (!content) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  const [post] = await db.insert(postsTable).values({
    authorId: req.userId!,
    content,
    images: images || null,
  }).returning();

  const enriched = await enrichPost(post, req.userId);
  res.status(201).json(enriched);
});

router.get("/posts/:postId", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const postId = parseInt(req.params.postId as string, 10);
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const enriched = await enrichPost(post, req.userId);
  res.json(enriched);
});

router.delete("/posts/:postId", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const postId = parseInt(req.params.postId as string, 10);
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post || post.authorId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(postsTable).where(eq(postsTable.id, postId));
  res.json({ message: "Post deleted" });
});

router.post("/posts/:postId/like", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const postId = parseInt(req.params.postId as string, 10);
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const [existing] = await db.select().from(postLikesTable).where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, req.userId!)));

  if (existing) {
    await db.delete(postLikesTable).where(eq(postLikesTable.id, existing.id));
  } else {
    await db.insert(postLikesTable).values({ postId, userId: req.userId! });
    if (post.authorId !== req.userId) {
      const [notif] = await db.insert(notificationsTable).values({
        userId: post.authorId,
        actorId: req.userId!,
        type: "like",
        postId,
        message: "أعجب بمنشورك",
      }).returning();
      emitToUser(post.authorId, "new:notification", notif);
    }
  }

  const [cnt] = await db.select({ count: sql<number>`count(*)::int` }).from(postLikesTable).where(eq(postLikesTable.postId, postId));
  res.json({ liked: !existing, likesCount: cnt?.count ?? 0 });
});

router.post("/posts/:postId/bookmark", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const postId = parseInt(req.params.postId as string, 10);
  const [existing] = await db.select().from(bookmarksTable).where(and(eq(bookmarksTable.postId, postId), eq(bookmarksTable.userId, req.userId!)));

  if (existing) {
    await db.delete(bookmarksTable).where(eq(bookmarksTable.id, existing.id));
    res.json({ message: "Bookmark removed" });
  } else {
    await db.insert(bookmarksTable).values({ postId, userId: req.userId! });
    res.json({ message: "Bookmarked" });
  }
});

router.post("/posts/:postId/repost", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const postId = parseInt(req.params.postId as string, 10);
  const [original] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!original) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const [repost] = await db.insert(postsTable).values({
    authorId: req.userId!,
    content: original.content,
    images: original.images,
    isRepost: true,
    originalPostId: postId,
  }).returning();

  if (original.authorId !== req.userId) {
    const [notif] = await db.insert(notificationsTable).values({
      userId: original.authorId,
      actorId: req.userId!,
      type: "repost",
      postId,
      message: "أعاد نشر منشورك",
    }).returning();
    emitToUser(original.authorId, "new:notification", notif);
  }

  const enriched = await enrichPost(repost, req.userId);
  res.status(201).json(enriched);
});

export { enrichPost };
export default router;
