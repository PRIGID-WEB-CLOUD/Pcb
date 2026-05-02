import { pgTable, text, real, integer, boolean, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const roleEnum = pgEnum("role", ["USER", "ADMIN"]);
export const orderStatusEnum = pgEnum("order_status", ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]);

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").default("USER").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  imageUrl: text("image_url"),
  categoryId: text("category_id").notNull().references(() => categories.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const carts = pgTable("carts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
});

export const cartItems = pgTable("cart_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  cartId: text("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
}, (t) => [uniqueIndex("cart_product_unique").on(t.cartId, t.productId)]);

export const wishlists = pgTable("wishlists", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
});

export const wishlistItems = pgTable("wishlist_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  wishlistId: text("wishlist_id").notNull().references(() => wishlists.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
}, (t) => [uniqueIndex("wishlist_product_unique").on(t.wishlistId, t.productId)]);

export const orders = pgTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  total: real("total").notNull(),
  status: orderStatusEnum("status").default("PENDING").notNull(),
  shippingAddress: text("shipping_address"),
  paystackRef: text("paystack_ref"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: real("price").notNull(),
});

export const newsletter = pgTable("newsletter", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Channel Hub ─────────────────────────────────────────────────────────────

export const channelConfigs = pgTable("channel_configs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  channelId: text("channel_id").notNull().unique(),
  status: text("status").notNull().default("CONNECTED"),
  lastSync: timestamp("last_sync"),
  latency: integer("latency").default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const channelEventLogs = pgTable("channel_event_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  channel: text("channel").notNull(),
  event: text("event").notNull(),
  detail: text("detail").notNull(),
  type: text("type").notNull().default("info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const channelWebhooks = pgTable("channel_webhooks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  webhookId: text("webhook_id").notNull().unique(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Facebook ─────────────────────────────────────────────────────────────────

export const facebookConnections = pgTable("facebook_connections", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  connectionKey: text("connection_key").notNull().unique(),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const facebookCatalogSettings = pgTable("facebook_catalog_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  includedCategories: text("included_categories").notNull().default('["Ready-to-Wear","Footwear","Accessories","Bags & Luggage","Jewellery","Outerwear","Swimwear"]'),
  minPrice: real("min_price").notNull().default(0),
  maxPrice: real("max_price").notNull().default(5000),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const facebookPixelEvents = pgTable("facebook_pixel_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeEvent: text("store_event").notNull().unique(),
  fbEvent: text("fb_event").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const facebookAudiences = pgTable("facebook_audiences", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  size: text("size").notNull().default("Building…"),
  type: text("type").notNull().default("Custom"),
  status: text("status").notNull().default("Building"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  category: text("category").notNull().default("Marketing"),
  body: text("body").notNull(),
  status: text("status").notNull().default("Pending"),
  language: text("language").notNull().default("en"),
  sentCount: integer("sent_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const whatsappJourneys = pgTable("whatsapp_journeys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  journeyId: text("journey_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  active: boolean("active").notNull().default(true),
  sentCount: text("sent_count").notNull().default("0"),
  steps: integer("steps").notNull().default(1),
  convRate: text("conv_rate").notNull().default("—"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const whatsappOptinSettings = pgTable("whatsapp_optin_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  optinKeyword: text("optin_keyword").notNull().default("JOIN"),
  optoutKeyword: text("optout_keyword").notNull().default("STOP"),
  doubleOptin: boolean("double_optin").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Twitter / X ─────────────────────────────────────────────────────────────

export const twitterHashtags = pgTable("twitter_hashtags", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tag: text("tag").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const twitterAutoRules = pgTable("twitter_auto_rules", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  trigger: text("trigger").notNull(),
  action: text("action").notNull(),
  template: text("template").notNull().default("new_arrival"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const twitterTweetQueue = pgTable("twitter_tweet_queue", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  text: text("text").notNull(),
  scheduledFor: text("scheduled_for").notNull(),
  status: text("status").notNull().default("Queued"),
  imageStyle: text("image_style").notNull().default("Single Product High-Res"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const twitterContentTemplates = pgTable("twitter_content_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  body: text("body").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const twitterSchedulerSettings = pgTable("twitter_scheduler_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  schedulerOn: boolean("scheduler_on").notNull().default(true),
  dropFrequency: text("drop_frequency").notNull().default("Real-time (Immediate)"),
  imageStyle: text("image_style").notNull().default("Single Product High-Res"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Zod / Type exports ───────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
