# LUXE BOUTIQUE — Workspace

## Overview

A full-featured luxury e-commerce app (LUXE BOUTIQUE) ported from Next.js/Prisma to a Vite + React + Express pnpm monorepo.

## Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: Vite + React + TypeScript + TailwindCSS v4 + Wouter (routing) + Motion/React (animations)
- **Backend**: Express 5 + TypeScript (api-server artifact)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Custom session-based auth (bcryptjs + httpOnly cookies + sessions table)
- **Validation**: Zod (zod/v4), drizzle-zod
- **Build**: esbuild (API), Vite (frontend)
- **Fonts**: Inter (sans) + Playfair Display (serif) + Noto Serif + Manrope + Material Symbols Outlined (admin) from Google Fonts

## Architecture

```
artifacts/
  luxe-boutique/       # Vite + React frontend (port from Next.js)
    src/
      pages/           # All route pages (Home, Products, Cart, Checkout, Blog, etc.)
      components/      # Header, Footer, ProductCard, CookieBanner, NewsletterForm, AccountSidebar
      pages/admin/     # Admin UI: AdminLayout (sidebar), Dashboard, Catalog, ProductEditor, Orders, Customers, Analytics, ChannelHub, Facebook, WhatsApp, Twitter, SocialAnalytics
      contexts/        # AuthContext (custom auth), CurrencyContext (geo-based currency)
  api-server/          # Express API server
    src/
      routes/          # auth, products, categories, cart, wishlist, orders, reviews, newsletter, payments, seed,
                       # channels, facebook, whatsapp, twitter (channel routes — all admin-only)
      lib/             # auth session helper, logger
lib/
  db/                  # Drizzle schema + DB client (PostgreSQL)
    src/schema/index.ts  # All tables — see DB Schema section below
```

## Key Features

- **Auth**: Register, login, logout via `/api/auth/*` with httpOnly session cookies
- **Products**: Full catalog with category filtering, search, product detail + reviews
- **Cart**: Session-authenticated cart (add, update qty, remove)
- **Wishlist**: Save/remove products to wishlist
- **Orders**: Order history per user, admin can view all
- **Blog**: Editorial journal with curated posts
- **Newsletter**: Email subscription endpoint
- **Payments**: Paystack integration (falls back gracefully if no key configured)
- **Currency**: Auto-detects user location via ipapi.co and converts prices
- **Seed**: POST /api/seed to populate DB with sample categories and products
- **Channels**: All 4 channel admin pages (Hub, Facebook, WhatsApp, Twitter) are fully wired to PostgreSQL — auto-seed on first GET if DB is empty

## Key Commands

- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server (rebuilds on start)
- `pnpm --filter @workspace/luxe-boutique run dev` — run frontend dev server
- `curl -X POST http://localhost:8080/api/seed` — seed database with sample data

## DB Schema

Core tables: `users`, `sessions`, `categories`, `products`, `reviews`, `carts`, `cartItems`, `wishlists`, `wishlistItems`, `orders`, `orderItems`, `newsletter`

Channel tables (auto-seeded with defaults on first GET):
- `channelConfigs` — status/latency per channel (facebook, commerce, whatsapp, twitter)
- `channelEventLogs` — event log entries
- `channelWebhooks` — webhook endpoint configs
- `facebookConnections` — facebook/instagram/pixel/messenger toggles
- `facebookCatalogSettings` — category filter + price range (single row)
- `facebookPixelEvents` — pixel event mappings (storeEvent → fbEvent)
- `facebookAudiences` — custom audiences
- `whatsappTemplates` — message templates (submitted to Meta for approval)
- `whatsappJourneys` — automated journey on/off state
- `whatsappOptinSettings` — keyword opt-in/out + double optin (single row)
- `twitterHashtags` — hashtag bank
- `twitterAutoRules` — auto-post rules (trigger → action)
- `twitterTweetQueue` — scheduled & sent tweets
- `twitterContentTemplates` — reusable tweet skeletons
- `twitterSchedulerSettings` — scheduler on/off + drop frequency + image style (single row)

## Admin Routes (/admin/*)

All admin routes use `AdminLayout` (no store Header/Footer) with a fixed sidebar and sticky topbar.

- `/admin` — Executive Dashboard (metrics, sales chart, top collections, recent transactions)
- `/admin/catalog` — Product Catalog (table, filters, stock status, pagination)
- `/admin/products/edit` — Product Editor (12-col grid: info, media gallery, variants, SEO sidebar)
- `/admin/orders` — Order Management (tabbed filter, order table, status badges)
- `/admin/customers` — Customer Manager (metrics, searchable table, grayscale avatar effect)
- `/admin/analytics` — Market Performance (revenue chart, donut, top products, monthly reports)
- `/admin/channels` — Omnichannel Hub — **DB-backed**: channel cards, sync, test, pause, event log, webhooks
- `/admin/channels/facebook` — Meta Commerce — **DB-backed**: connection toggles, catalog rules, pixel events, custom audiences, ad performance
- `/admin/channels/whatsapp` — WhatsApp API Console — **DB-backed**: templates CRUD, journey toggles, opt-in settings
- `/admin/channels/twitter` — X Social — **DB-backed**: hashtag bank, tweet queue, auto-post rules, content templates, scheduler settings
- `/admin/channels/analytics` — Social Analytics (reach, engagement, channel breakdown, heatmap)

Admin Design System: Noto Serif headings, Manrope body, emerald #006c49 accent, black primary, #f8f9ff surface.

## Channel API Endpoints (all admin-only, `user.role === "ADMIN"`)

### /api/channels
- `GET /configs` — all 4 channel statuses
- `PUT /configs/:channelId/status` — toggle CONNECTED / PAUSED / DISCONNECTED
- `POST /configs/:channelId/sync` — trigger sync, updates lastSync + latency
- `POST /configs/sync-all` — sync all channels
- `POST /configs/:channelId/test` — ping test, records pass/fail in event log
- `GET /events` — event log (last 50)
- `DELETE /events` — clear event log
- `GET /webhooks` — webhook list
- `PUT /webhooks/:webhookId` — toggle webhook active state

### /api/facebook
- `GET/PUT /connections/:key` — toggle facebook/instagram/pixel/messenger
- `GET/PUT /catalog` — catalog settings (categories JSON, price range)
- `GET /pixel-events`, `PUT /pixel-events/:id` — pixel event toggle
- `GET /audiences`, `POST /audiences`, `PUT /audiences/:id`, `DELETE /audiences/:id`

### /api/whatsapp
- `GET /templates`, `POST /templates`, `DELETE /templates/:id`
- `GET /journeys`, `PUT /journeys/:journeyId` — toggle journey active
- `GET /optin`, `PUT /optin` — opt-in/out keywords + double optin

### /api/twitter
- `GET /hashtags`, `POST /hashtags`, `DELETE /hashtags/:id`
- `GET /rules`, `POST /rules`, `PUT /rules/:id` — auto-post rules
- `GET /queue`, `POST /queue`, `PUT /queue/:id`, `DELETE /queue/:id`
- `GET /templates`, `POST /templates`, `PUT /templates/:id/use`
- `GET /scheduler`, `PUT /scheduler`

## Routing (Wouter)

- `/` — Home (hero, featured collections, products grid, editorial section)
- `/products` — All products with category filter
- `/products/:id` — Product detail with reviews
- `/cart` — Shopping bag
- `/checkout` — Secure checkout (Paystack)
- `/blog` — Editorial journal
- `/search` — Search results
- `/contact` — Contact & office info
- `/sustainability` — Brand sustainability page
- `/privacy` — Privacy policy
- `/terms` — Terms of service
- `/shipping-returns` — Shipping info
- `/login`, `/register` — Auth
- `/account` — Account dashboard (protected)
- `/account/orders` — Order history
- `/account/wishlist` — Wishlist
