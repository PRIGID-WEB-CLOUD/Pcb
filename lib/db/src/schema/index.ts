import { pgTable, text, timestamp, integer, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersTable = pgTable("users", {
  id:                  text("id").primaryKey(),
  name:                text("name").notNull(),
  email:               text("email").notNull().unique(),
  role:                text("role").notNull().default("CUSTOMER"),
  passwordHash:        text("password_hash").notNull().default(""),
  passwordResetToken:  text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const users = usersTable;

// ── Admin OTP codes ────────────────────────────────────────────────────────────

export const adminOtpCodesTable = pgTable("admin_otp_codes", {
  id:        text("id").primaryKey(),
  email:     text("email").notNull(),
  code:      text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used:      boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminOtpCodes = adminOtpCodesTable;

// ── Sessions ──────────────────────────────────────────────────────────────────

export const sessionsTable = pgTable("sessions", {
  token:     text("token").primaryKey(),
  userId:    text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Session = typeof sessionsTable.$inferSelect;

// ── Categories ────────────────────────────────────────────────────────────────

export const categoriesTable = pgTable("categories", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull(),
  slug:        text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export type Category = typeof categoriesTable.$inferSelect;

// ── Products ──────────────────────────────────────────────────────────────────

export const productsTable = pgTable("products", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  price:         integer("price").notNull().default(0),
  categoryId:    text("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  stock:         integer("stock").notNull().default(0),
  trackQuantity: boolean("track_quantity").notNull().default(true),
  status:        text("status").notNull().default("ACTIVE"),
  imageUrl:      text("image_url"),
  description:   text("description").notNull().default(""),
  tags:          text("tags"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

export type Product = typeof productsTable.$inferSelect;

// ── Orders ────────────────────────────────────────────────────────────────────

export type OrderItem = { name: string; qty: number; price: number };

export const ordersTable = pgTable("orders", {
  id:            text("id").primaryKey(),
  customerId:    text("customer_id"),
  customerEmail: text("customer_email").notNull(),
  customerName:  text("customer_name").notNull(),
  status:        text("status").notNull().default("PENDING"),
  total:         real("total").notNull().default(0),
  items:         jsonb("items").notNull().$type<OrderItem[]>().default([]),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

export type Order = typeof ordersTable.$inferSelect;

// ── Push Tokens ───────────────────────────────────────────────────────────────

export const userPushTokensTable = pgTable("user_push_tokens", {
  userId:    text("user_id").primaryKey(),
  token:     text("token").notNull(),
  platform:  text("platform").notNull().default("unknown"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserPushTokenSchema = createInsertSchema(userPushTokensTable).omit({ updatedAt: true });
export type InsertUserPushToken = z.infer<typeof insertUserPushTokenSchema>;
export type UserPushToken = typeof userPushTokensTable.$inferSelect;

// ── Channel Credentials ───────────────────────────────────────────────────────

export const channelCredentialsTable = pgTable("channel_credentials", {
  channel:   text("channel").primaryKey(),
  data:      jsonb("data").notNull().$type<Record<string, string>>().default({}),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ChannelCredential = typeof channelCredentialsTable.$inferSelect;
