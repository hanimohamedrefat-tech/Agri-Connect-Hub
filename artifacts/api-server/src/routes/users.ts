import { Router, type IRouter } from "express";
import { db, usersTable, followsTable } from "@workspace/db";
import { eq, ilike, and, or, sql } from "drizzle-orm";
import { authMiddleware, optionalAuth, type AuthRequest } from "../middlewares/auth";
import { sanitizeUser } from "./auth";

const router: IRouter = Router();

async function getUserWithCounts(userId: number, currentUserId?: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;

  const [followerCount] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, userId));
  const [followingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followerId, userId));

  let isFollowing = false;
  if (currentUserId && currentUserId !== userId) {
    const [f] = await db.select().from(followsTable).where(and(eq(followsTable.followerId, currentUserId), eq(followsTable.followingId, userId)));
    isFollowing = !!f;
  }

  return sanitizeUser(user, currentUserId, {
    followersCount: followerCount?.count ?? 0,
    followingCount: followingCount?.count ?? 0,
    isFollowing,
  });
}

router.get("/users", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const { search, specialty } = req.query as { search?: string; specialty?: string };
  const limit = parseInt(String(req.query.limit ?? "20"), 10);
  const offset = parseInt(String(req.query.offset ?? "0"), 10);

  let query = db.select().from(usersTable);
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(usersTable.displayName, `%${search}%`),
        ilike(usersTable.username, `%${search}%`)
      )!
    );
  }
  if (specialty) conditions.push(eq(usersTable.specialty, specialty));

  const users = conditions.length
    ? await db.select().from(usersTable).where(and(...conditions)).limit(limit).offset(offset)
    : await db.select().from(usersTable).limit(limit).offset(offset);

  const result = await Promise.all(users.map(u => getUserWithCounts(u.id, req.userId)));
  res.json(result.filter(Boolean));
});

router.get("/users/suggestions", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const currentUserId = req.userId;
  const users = await db.select().from(usersTable).limit(5);
  const filtered = currentUserId ? users.filter(u => u.id !== currentUserId) : users;
  const result = await Promise.all(filtered.slice(0, 4).map(u => getUserWithCounts(u.id, currentUserId)));
  res.json(result.filter(Boolean));
});

router.get("/users/:username", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const { username } = req.params;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username as string));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const result = await getUserWithCounts(user.id, req.userId);
  res.json(result);
});

router.patch("/users/:username/update", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { username } = req.params;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username as string));
  if (!user || user.id !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { displayName, bio, specialty, location, website, avatar, coverPhoto, interests } = req.body;
  const updateData: Partial<typeof usersTable.$inferSelect> = {};
  if (displayName != null) updateData.displayName = displayName;
  if (bio != null) updateData.bio = bio;
  if (specialty != null) updateData.specialty = specialty;
  if (location != null) updateData.location = location;
  if (website != null) updateData.website = website;
  if (avatar != null) updateData.avatar = avatar;
  if (coverPhoto != null) updateData.coverPhoto = coverPhoto;
  if (Array.isArray(interests)) updateData.interests = interests;

  const [updated] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, user.id)).returning();
  const result = await getUserWithCounts(updated.id, req.userId);
  res.json(result);
});

router.get("/users/:username/followers", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const { username } = req.params;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username as string));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const followers = await db.select({ userId: followsTable.followerId }).from(followsTable).where(eq(followsTable.followingId, user.id));
  const result = await Promise.all(followers.map(f => getUserWithCounts(f.userId, req.userId)));
  res.json(result.filter(Boolean));
});

router.get("/users/:username/following", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const { username } = req.params;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username as string));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const following = await db.select({ userId: followsTable.followingId }).from(followsTable).where(eq(followsTable.followerId, user.id));
  const result = await Promise.all(following.map(f => getUserWithCounts(f.userId, req.userId)));
  res.json(result.filter(Boolean));
});

export { getUserWithCounts };
export default router;
