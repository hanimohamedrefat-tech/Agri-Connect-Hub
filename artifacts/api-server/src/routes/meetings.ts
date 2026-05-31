import { Router, type IRouter } from "express";
import { db, meetingsTable, meetingParticipantsTable, usersTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { authMiddleware, optionalAuth, type AuthRequest } from "../middlewares/auth";
import { getUserWithCounts } from "./users";

const router: IRouter = Router();

function generateJoinCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 9; i++) {
    if (i > 0 && i % 3 === 0) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function enrichMeeting(meeting: typeof meetingsTable.$inferSelect, currentUserId?: number) {
  const host = await getUserWithCounts(meeting.hostId, currentUserId);
  const participants = await db.select().from(meetingParticipantsTable).where(eq(meetingParticipantsTable.meetingId, meeting.id));

  return {
    id: meeting.id,
    hostId: meeting.hostId,
    host,
    title: meeting.title,
    description: meeting.description ?? null,
    scheduledAt: meeting.scheduledAt?.toISOString() ?? null,
    status: meeting.status,
    joinCode: meeting.joinCode,
    participantsCount: participants.filter(p => !p.leftAt).length,
    maxParticipants: meeting.maxParticipants,
    isRecording: meeting.isRecording,
    createdAt: meeting.createdAt.toISOString(),
  };
}

router.get("/meetings/upcoming", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const now = new Date();
  const meetings = await db.select().from(meetingsTable)
    .where(gte(meetingsTable.scheduledAt, now))
    .orderBy(meetingsTable.scheduledAt).limit(10);
  const enriched = await Promise.all(meetings.map(m => enrichMeeting(m, req.userId)));
  res.json(enriched);
});

router.get("/meetings", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const meetings = await db.select().from(meetingsTable)
    .where(eq(meetingsTable.hostId, req.userId!))
    .orderBy(desc(meetingsTable.createdAt));
  const enriched = await Promise.all(meetings.map(m => enrichMeeting(m, req.userId)));
  res.json(enriched);
});

router.post("/meetings", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { title, description, scheduledAt, maxParticipants } = req.body;
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const joinCode = generateJoinCode();
  const [meeting] = await db.insert(meetingsTable).values({
    hostId: req.userId!,
    title,
    description: description || null,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    joinCode,
    maxParticipants: maxParticipants || 100,
    status: scheduledAt ? "scheduled" : "live",
  }).returning();

  await db.insert(meetingParticipantsTable).values({
    meetingId: meeting.id,
    userId: req.userId!,
  });

  const enriched = await enrichMeeting(meeting, req.userId);
  res.status(201).json(enriched);
});

router.get("/meetings/:meetingId", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const meetingId = parseInt(req.params.meetingId as string, 10);
  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, meetingId));
  if (!meeting) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }
  const enriched = await enrichMeeting(meeting, req.userId);
  res.json(enriched);
});

router.patch("/meetings/:meetingId", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const meetingId = parseInt(req.params.meetingId as string, 10);
  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, meetingId));
  if (!meeting || meeting.hostId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { title, description, scheduledAt, maxParticipants } = req.body;
  const update: Partial<typeof meetingsTable.$inferSelect> = {};
  if (title != null) update.title = title;
  if (description != null) update.description = description;
  if (scheduledAt != null) update.scheduledAt = new Date(scheduledAt);
  if (maxParticipants != null) update.maxParticipants = maxParticipants;

  const [updated] = await db.update(meetingsTable).set(update).where(eq(meetingsTable.id, meetingId)).returning();
  const enriched = await enrichMeeting(updated, req.userId);
  res.json(enriched);
});

router.delete("/meetings/:meetingId", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const meetingId = parseInt(req.params.meetingId as string, 10);
  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, meetingId));
  if (!meeting || meeting.hostId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(meetingsTable).where(eq(meetingsTable.id, meetingId));
  res.json({ message: "Meeting cancelled" });
});

router.post("/meetings/join/:joinCode", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { joinCode } = req.params;
  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.joinCode, joinCode as string));
  if (!meeting) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  const [existing] = await db.select().from(meetingParticipantsTable)
    .where(and(eq(meetingParticipantsTable.meetingId, meeting.id), eq(meetingParticipantsTable.userId, req.userId!)));

  if (!existing) {
    await db.insert(meetingParticipantsTable).values({ meetingId: meeting.id, userId: req.userId! });
  } else if (existing.leftAt) {
    await db.update(meetingParticipantsTable).set({ leftAt: null }).where(eq(meetingParticipantsTable.id, existing.id));
  }

  const enriched = await enrichMeeting(meeting, req.userId);
  res.json(enriched);
});

router.get("/meetings/:meetingId/participants", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const meetingId = parseInt(req.params.meetingId as string, 10);
  const participants = await db.select().from(meetingParticipantsTable)
    .where(and(eq(meetingParticipantsTable.meetingId, meetingId)));

  const enriched = await Promise.all(participants.map(async p => {
    const user = await getUserWithCounts(p.userId, req.userId);
    return {
      id: p.id,
      meetingId: p.meetingId,
      userId: p.userId,
      user,
      joinedAt: p.joinedAt.toISOString(),
      leftAt: p.leftAt?.toISOString() ?? null,
      isMuted: p.isMuted,
      isVideoOff: p.isVideoOff,
    };
  }));

  res.json(enriched);
});

router.post("/meetings/:meetingId/start", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const meetingId = parseInt(req.params.meetingId as string, 10);
  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, meetingId));
  if (!meeting || meeting.hostId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [updated] = await db.update(meetingsTable).set({ status: "live" }).where(eq(meetingsTable.id, meetingId)).returning();
  const enriched = await enrichMeeting(updated, req.userId);
  res.json(enriched);
});

router.post("/meetings/:meetingId/end", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const meetingId = parseInt(req.params.meetingId as string, 10);
  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, meetingId));
  if (!meeting || meeting.hostId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const now = new Date();
  await db.update(meetingParticipantsTable).set({ leftAt: now }).where(eq(meetingParticipantsTable.meetingId, meetingId));
  const [updated] = await db.update(meetingsTable).set({ status: "ended" }).where(eq(meetingsTable.id, meetingId)).returning();
  const enriched = await enrichMeeting(updated, req.userId);
  res.json(enriched);
});

export default router;
