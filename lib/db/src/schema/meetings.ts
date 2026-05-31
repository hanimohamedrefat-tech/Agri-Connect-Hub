import { pgTable, serial, timestamp, integer, text, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const meetingsTable = pgTable("meetings", {
  id: serial("id").primaryKey(),
  hostId: integer("host_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  status: text("status").notNull().default("scheduled"),
  joinCode: text("join_code").notNull().unique(),
  maxParticipants: integer("max_participants").notNull().default(100),
  isRecording: boolean("is_recording").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const meetingParticipantsTable = pgTable("meeting_participants", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => meetingsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  leftAt: timestamp("left_at", { withTimezone: true }),
  isMuted: boolean("is_muted").notNull().default(false),
  isVideoOff: boolean("is_video_off").notNull().default(false),
});
