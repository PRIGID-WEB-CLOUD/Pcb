import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userPushTokensTable = pgTable("user_push_tokens", {
  userId: text("user_id").primaryKey(),
  token: text("token").notNull(),
  platform: text("platform").notNull().default("unknown"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserPushTokenSchema = createInsertSchema(userPushTokensTable).omit({ updatedAt: true });
export type InsertUserPushToken = z.infer<typeof insertUserPushTokenSchema>;
export type UserPushToken = typeof userPushTokensTable.$inferSelect;
