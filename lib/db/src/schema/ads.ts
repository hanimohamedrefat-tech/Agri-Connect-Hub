import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";

export const adsTable = pgTable("ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  imageUrl: text("image_url"),
  linkUrl: text("link_url").notNull(),
  sponsorName: text("sponsor_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Ad = typeof adsTable.$inferSelect;
