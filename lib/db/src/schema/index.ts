import { pgTable, text, real, integer, boolean, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const roleEnum = pgEnum("role", ["USER", "ADMIN"]);
export const orderStatusEnum = pgEnum("order_status", ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]);

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  password: text("password"),
  oauthProvider: text("oauth_provider"),
  oauthId: text("oauth_id"),
  avatarUrl: text("avatar_url"),
  role: roleEnum("role").default("USER").notNull(),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  parentId: text("parent_id"),
  slug: text("slug"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  compareAtPrice: real("compare_at_price"),
  imageUrl: text("image_url"),
  images: text("images"),
  categoryId: text("category_id").notNull().references(() => categories.id),
  status: text("status").notNull().default("ACTIVE"),
  tags: text("tags"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  trackQuantity: boolean("track_quantity").notNull().default(true),
  stock: integer("stock").notNull().default(100),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productVariants = pgTable("product_variants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: real("price").notNull(),
  sku: text("sku"),
  stock: integer("stock").notNull().default(0),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  discountAmount: real("discount_amount").default(0),
  couponCode: text("coupon_code"),
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

export const blogPosts = pgTable("blog_posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull().default(""),
  content: text("content").notNull().default(""),
  coverImage: text("cover_image"),
  category: text("category").notNull().default("Editorial"),
  author: text("author").notNull().default("Admin"),
  status: text("status").notNull().default("DRAFT"),
  tags: text("tags"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const newsletter = pgTable("newsletter", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mediaAssets = pgTable("media_assets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  publicId: text("public_id").notNull().unique(),
  url: text("url").notNull(),
  secureUrl: text("secure_url").notNull(),
  originalName: text("original_name").notNull(),
  format: text("format").notNull(),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes"),
  folder: text("folder").default("luxe-boutique"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const newsletterCampaigns = pgTable("newsletter_campaigns", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  status: text("status").notNull().default("DRAFT"),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminOtpCodes = pgTable("admin_otp_codes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
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
  lastFiredAt: timestamp("last_fired_at"),
  firedCount: integer("fired_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const twitterTweetQueue = pgTable("twitter_tweet_queue", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  text: text("text").notNull(),
  scheduledFor: text("scheduled_for").notNull(),
  status: text("status").notNull().default("Queued"),
  imageStyle: text("image_style").notNull().default("Single Product High-Res"),
  postedTweetId: text("posted_tweet_id"),
  lastError: text("last_error"),
  retryCount: integer("retry_count").notNull().default(0),
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

export const channelCredentials = pgTable("channel_credentials", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  channel:   text("channel").notNull(),
  keyName:   text("key_name").notNull(),
  value:     text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({ uniq: uniqueIndex("channel_cred_uniq").on(t.channel, t.keyName) }));

export const facebookPagePosts = pgTable("facebook_page_posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  caption: text("caption").notNull(),
  imageUrl: text("image_url"),
  link: text("link"),
  postType: text("post_type").notNull().default("Standard"),
  scheduledFor: text("scheduled_for"),
  status: text("status").notNull().default("Draft"),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  reach: integer("reach").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const facebookPostTemplates = pgTable("facebook_post_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  body: text("body").notNull(),
  postType: text("post_type").notNull().default("Standard"),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),
  name: text("name"),
  role: text("role").notNull().default("Editor"),
  status: text("status").notNull().default("pending"),
  invitedBy: text("invited_by"),
  inviteToken: text("invite_token"),
  inviteExpiresAt: timestamp("invite_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Provider Plugins ─────────────────────────────────────────────────────────

export const providerPlugins = pgTable("provider_plugins", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:         text("name").notNull().unique(),
  label:        text("label").notNull(),
  description:  text("description").notNull().default(""),
  logoUrl:      text("logo_url"),
  enabled:      boolean("enabled").notNull().default(false),
  connected:    boolean("connected").notNull().default(false),
  apiKey:       text("api_key"),
  apiSecret:    text("api_secret"),
  storeId:      text("store_id"),
  webhookUrl:   text("webhook_url"),
  settings:     text("settings"),
  lastSyncAt:   timestamp("last_sync_at"),
  lastError:    text("last_error"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const apiKeys = pgTable("api_keys", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:        text("name").notNull(),
  keyPrefix:   text("key_prefix").notNull(),
  keyHash:     text("key_hash").notNull(),
  createdBy:   text("created_by"),
  lastUsedAt:  timestamp("last_used_at"),
  expiresAt:   timestamp("expires_at"),
  revokedAt:   timestamp("revoked_at"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

// ─── Coupons ──────────────────────────────────────────────────────────────────

export const coupons = pgTable("coupons", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code:         text("code").notNull().unique(),
  description:  text("description").notNull().default(""),
  discountType: text("discount_type").notNull().default("PERCENTAGE"),
  discountValue: real("discount_value").notNull(),
  minOrderAmount: real("min_order_amount").notNull().default(0),
  maxUses:      integer("max_uses"),
  usedCount:    integer("used_count").notNull().default(0),
  active:       boolean("active").notNull().default(true),
  expiresAt:    timestamp("expires_at"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

// ─── Job Runs ─────────────────────────────────────────────────────────────────

export const jobRuns = pgTable("job_runs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobName: text("job_name").notNull(),
  status: text("status").notNull().default("running"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  error: text("error"),
});

// ─── WhatsApp Contacts (opt-in/out) ───────────────────────────────────────────

export const whatsappContacts = pgTable("whatsapp_contacts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  phone: text("phone").notNull().unique(),
  optedIn: boolean("opted_in").notNull().default(false),
  optedInAt: timestamp("opted_in_at"),
  optedOutAt: timestamp("opted_out_at"),
  pendingDoubleOptin: boolean("pending_double_optin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── WhatsApp Journey Engine ──────────────────────────────────────────────────

export const whatsappJourneySteps = pgTable("whatsapp_journey_steps", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  journeyId: text("journey_id").notNull(),
  stepOrder: integer("step_order").notNull(),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  templateName: text("template_name").notNull(),
});

export const whatsappJourneyRuns = pgTable("whatsapp_journey_runs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  journeyId: text("journey_id").notNull(),
  customerPhone: text("customer_phone").notNull(),
  userId: text("user_id"),
  currentStep: integer("current_step").notNull().default(0),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  nextStepDueAt: timestamp("next_step_due_at"),
  status: text("status").notNull().default("active"),
});

// ─── Facebook Ad Metrics ──────────────────────────────────────────────────────

export const facebookAdMetrics = pgTable("facebook_ad_metrics", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  date: text("date").notNull().unique(),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  spend: real("spend").notNull().default(0),
  reach: integer("reach").notNull().default(0),
  ctr: real("ctr").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Zod / Type exports ───────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
