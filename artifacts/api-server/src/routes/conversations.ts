import { Router, type IRouter } from "express";
import { db, conversationsTable, conversationParticipantsTable, messagesTable, usersTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { emitToConversation, emitToUser } from "../lib/socket";

const router: IRouter = Router();

async function getConversationWithDetails(convId: number, currentUserId: number) {
  const participants = await db.select({ userId: conversationParticipantsTable.userId })
    .from(conversationParticipantsTable).where(eq(conversationParticipantsTable.conversationId, convId));

  const participantUsers = await Promise.all(participants.map(async p => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, p.userId));
    if (!user) return null;
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
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      isFollowing: false,
      createdAt: user.createdAt.toISOString(),
    };
  }));

  const [lastMsg] = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(desc(messagesTable.createdAt)).limit(1);

  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId));
  return {
    id: convId,
    participants: participantUsers.filter(Boolean),
    lastMessage: lastMsg ? { id: lastMsg.id, content: lastMsg.content, createdAt: lastMsg.createdAt.toISOString() } : null,
    unreadCount: 0,
    createdAt: conv?.createdAt.toISOString() ?? new Date().toISOString(),
  };
}

router.get("/conversations", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const myConvs = await db.select({ conversationId: conversationParticipantsTable.conversationId })
    .from(conversationParticipantsTable).where(eq(conversationParticipantsTable.userId, req.userId!));

  const results = await Promise.all(myConvs.map(c => getConversationWithDetails(c.conversationId, req.userId!)));
  res.json(results.filter(Boolean));
});

router.post("/conversations", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { participantId } = req.body;
  if (!participantId) {
    res.status(400).json({ error: "participantId is required" });
    return;
  }

  const myConvs = await db.select({ conversationId: conversationParticipantsTable.conversationId })
    .from(conversationParticipantsTable).where(eq(conversationParticipantsTable.userId, req.userId!));
  
  const myConvIds = myConvs.map(c => c.conversationId);
  
  if (myConvIds.length > 0) {
    const theirConvs = await db.select({ conversationId: conversationParticipantsTable.conversationId })
      .from(conversationParticipantsTable)
      .where(and(
        eq(conversationParticipantsTable.userId, participantId),
        inArray(conversationParticipantsTable.conversationId, myConvIds)
      ));
    
    if (theirConvs.length > 0) {
      const existing = await getConversationWithDetails(theirConvs[0].conversationId, req.userId!);
      res.status(201).json(existing);
      return;
    }
  }

  const [conv] = await db.insert(conversationsTable).values({}).returning();
  await db.insert(conversationParticipantsTable).values([
    { conversationId: conv.id, userId: req.userId! },
    { conversationId: conv.id, userId: participantId },
  ]);

  const result = await getConversationWithDetails(conv.id, req.userId!);
  res.status(201).json(result);
});

router.get("/conversations/:conversationId/messages", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const conversationId = parseInt(req.params.conversationId as string, 10);

  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(desc(messagesTable.createdAt)).limit(50);

  const enriched = await Promise.all(messages.reverse().map(async m => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, m.senderId));
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      sender: user ? {
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
      } : null,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    };
  }));

  res.json(enriched);
});

router.post("/conversations/:conversationId/messages", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const conversationId = parseInt(req.params.conversationId as string, 10);
  const { content } = req.body;
  if (!content) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  const [msg] = await db.insert(messagesTable).values({
    conversationId,
    senderId: req.userId!,
    content,
  }).returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId));

  const participants = await db.select({ userId: conversationParticipantsTable.userId })
    .from(conversationParticipantsTable).where(eq(conversationParticipantsTable.conversationId, conversationId));
  const otherParticipant = participants.find(p => p.userId !== req.userId);
  if (otherParticipant) {
    emitToUser(otherParticipant.userId, "new:message_notification", { conversationId });
  }

  const msgPayload = {
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    sender: user ? {
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
    } : null,
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
  };

  emitToConversation(conversationId, "new:message", msgPayload);

  res.status(201).json({
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    sender: user ? {
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
    } : null,
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
  });
});

export default router;
