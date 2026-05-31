import { Router, type IRouter } from "express";
import { db, usersTable, postsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { optionalAuth, type AuthRequest } from "../middlewares/auth";
import { enrichPost } from "./posts";

const router: IRouter = Router();

router.get("/users/:username/posts", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const { username } = req.params;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username as string));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const posts = await db.select().from(postsTable).where(eq(postsTable.authorId, user.id)).orderBy(desc(postsTable.createdAt));
  const enriched = await Promise.all(posts.map(p => enrichPost(p, req.userId)));
  res.json(enriched);
});

export default router;
