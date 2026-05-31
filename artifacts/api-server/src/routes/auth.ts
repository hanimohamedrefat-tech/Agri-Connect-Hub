import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, signToken, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const { username, email, password, displayName, specialty } = req.body;
  if (!username || !email || !password || !displayName) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }
  const existingUsername = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existingUsername.length > 0) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    username,
    email,
    passwordHash,
    displayName,
    specialty: specialty || null,
  }).returning();

  const token = signToken(user.id);
  logger.info({ userId: user.id }, "User registered");
  res.status(201).json({ user: sanitizeUser(user, user.id), token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Missing email or password" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken(user.id);
  logger.info({ userId: user.id }, "User logged in");
  res.json({ user: sanitizeUser(user, user.id), token });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(sanitizeUser(user, user.id));
});

export function sanitizeUser(user: typeof usersTable.$inferSelect, currentUserId?: number, extra?: Partial<{ followersCount: number; followingCount: number; postsCount: number; isFollowing: boolean }>) {
  return {
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
    followersCount: extra?.followersCount ?? 0,
    followingCount: extra?.followingCount ?? 0,
    postsCount: extra?.postsCount ?? 0,
    isFollowing: extra?.isFollowing ?? false,
    createdAt: user.createdAt.toISOString(),
  };
}

export default router;
