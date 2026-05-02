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
      routes/          # auth, products, categories, cart, wishlist, orders, reviews, newsletter, payments, seed
      lib/             # auth session helper, logger
lib/
  db/                  # Drizzle schema + DB client (PostgreSQL)
    src/schema/index.ts  # All tables: users, products, categories, cart, wishlist, orders, reviews, newsletter, sessions
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

## Key Commands

- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server (rebuilds on start)
- `pnpm --filter @workspace/luxe-boutique run dev` — run frontend dev server
- `curl -X POST http://localhost:8080/api/seed` — seed database with sample data

## Admin Routes (/admin/*)

All admin routes use `AdminLayout` (no store Header/Footer) with a fixed sidebar and sticky topbar.

- `/admin` — Executive Dashboard (metrics, sales chart, top collections, recent transactions)
- `/admin/catalog` — Product Catalog (table, filters, stock status, pagination)
- `/admin/products/edit` — Product Editor (12-col grid: info, media gallery, variants, SEO sidebar)
- `/admin/orders` — Order Management (tabbed filter, order table, status badges)
- `/admin/customers` — Customer Manager (metrics, searchable table, grayscale avatar effect)
- `/admin/analytics` — Market Performance (revenue chart, donut, top products, monthly reports)
- `/admin/channels` — Omnichannel Hub (channel cards, integration health) — uses "channels" sidebar
- `/admin/channels/facebook` — Meta & Facebook (catalog sync, connection status, ad performance)
- `/admin/channels/whatsapp` — WhatsApp API Console (API config, message stats, journeys)
- `/admin/channels/twitter` — X Social Settings (scheduler, hashtags, tweet preview)
- `/admin/channels/analytics` — Social Analytics (reach, engagement, channel breakdown, heatmap)

Admin Design System: Noto Serif headings, Manrope body, emerald #006c49 accent, black primary, #f8f9ff surface.

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

## API Endpoints

- `GET/POST /api/products` — List all or create product
- `GET /api/products/:id` — Product with reviews
- `GET/POST /api/categories` — Categories
- `GET/POST /api/cart` — Cart
- `PATCH/DELETE /api/cart/:productId` — Update/remove cart item
- `GET/POST /api/wishlist` — Wishlist
- `DELETE /api/wishlist/:productId` — Remove from wishlist
- `GET/POST /api/orders` — Orders
- `POST /api/reviews` — Submit review
- `POST /api/newsletter` — Newsletter subscribe
- `POST /api/payments/initialize` — Paystack payment init
- `GET /api/payments/verify/:reference` — Payment verify
- `POST /api/auth/login` — Login (sets httpOnly cookie)
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current user
- `POST /api/auth/register` — Register
- `POST /api/seed` — Seed DB (dev only)
