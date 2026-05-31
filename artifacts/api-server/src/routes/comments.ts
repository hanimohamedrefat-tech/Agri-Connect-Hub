import { Router, type IRouter } from "express";
import { db, commentsTable, commentLikesTable, postsTable, notificationsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { authMiddleware, optionalAuth, type AuthRequest } from "../middlewares/auth";
import { getUserWithCounts } from "./users";
import { emitToUser } from "../lib/socket";

const router: IRouter = Router();

router.get("/posts/:postId/comments", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const postId = parseInt(req.params.postId as string, 10);
  const comments = await db.select().from(commentsTable).where(eq(commentsTable.postId, postId)).orderBy(desc(commentsTable.createdAt));

  const enriched = await Promise.all(comments.map(async c => {
    const author = await getUserWithCounts(c.authorId, req.userId);
    const [likeCnt] = await db.select({ count: sql<number>`count(*)::int` }).from(commentLikesTable).where(eq(commentLikesTable.commentId, c.id));
    let isLiked = false;
    if (req.userId) {
      const [lk] = await db.select().from(commentLikesTable).where(and(eq(commentLikesTable.commentId, c.id), eq(commentLikesTable.userId, req.userId)));
      isLiked = !!lk;
    }
    return {
      id: c.id,
      postId: c.postId,
      authorId: c.authorId,
      author,
      content: c.content,
      likesCount: likeCnt?.count ?? 0,
      isLiked,
      createdAt: c.createdAt.toISOString(),
    };
  }));

  res.json(enriched);
});

router.post("/posts/:postId/comments", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const postId = parseInt(req.params.postId as string, 10);
  const { content } = req.body;
  if (!content) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const [comment] = await db.insert(commentsTable).values({
    postId,
    authorId: req.userId!,
    content,
  }).returning();

  if (post.authorId !== req.userId) {
    const [notif] = await db.insert(notificationsTable).values({
      userId: post.authorId,
      actorId: req.userId!,
      type: "comment",
      postId,
      message: "علق على منشورك",
    }).returning();
    emitToUser(post.authorId, "new:notification", notif);
  }

  const author = await getUserWithCounts(comment.authorId, req.userId);
  res.status(201).json({
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    author,
    content: comment.content,
    likesCount: 0,
    isLiked: false,
    createdAt: comment.createdAt.toISOString(),
  });
});

router.post("/comments/:commentId/like", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const commentId = parseInt(req.params.commentId as string, 10);
  const [existing] = await db.select().from(commentLikesTable).where(and(eq(commentLikesTable.commentId, commentId), eq(commentLikesTable.userId, req.userId!)));

  if (existing) {
    await db.delete(commentLikesTable).where(eq(commentLikesTable.id, existing.id));
  } else {
    await db.insert(commentLikesTable).values({ commentId, userId: req.userId! });
  }

  const [cnt] = await db.select({ count: sql<number>`count(*)::int` }).from(commentLikesTable).where(eq(commentLikesTable.commentId, commentId));
  res.json({ liked: !existing, likesCount: cnt?.count ?? 0 });
});

export default router;
