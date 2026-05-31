import { Router, type IRouter } from "express";
import { db, usersTable, postsTable, postLikesTable, followsTable, commentsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const [[users], [posts], [likes], [comments], [follows]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(postsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(postLikesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(commentsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(followsTable),
  ]);

  const recentUsers = await db
    .select({
      id: usersTable.id,
      displayName: usersTable.displayName,
      username: usersTable.username,
      avatar: usersTable.avatar,
      specialty: usersTable.specialty,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(sql`${usersTable.createdAt} DESC`)
    .limit(5);

  const topPostsRaw = await db.execute(sql`
    SELECT p.id, p.content, p.created_at,
           u.display_name, u.username, u.avatar,
           COUNT(pl.id)::int AS likes_count
    FROM posts p
    JOIN users u ON u.id = p.author_id
    LEFT JOIN post_likes pl ON pl.post_id = p.id
    GROUP BY p.id, u.display_name, u.username, u.avatar
    ORDER BY likes_count DESC
    LIMIT 5
  `);

  res.json({
    totals: {
      users: users?.count ?? 0,
      posts: posts?.count ?? 0,
      likes: likes?.count ?? 0,
      comments: comments?.count ?? 0,
      follows: follows?.count ?? 0,
    },
    recentUsers,
    topPosts: topPostsRaw.rows,
  });
});

export default router;
