# Luxe Boutique — App Portfolio

> Full README & developer docs: [replit.md](./replit.md)

A production-grade luxury e-commerce platform built as a TypeScript monorepo. Four surfaces — web storefront, admin portal, mobile app, and REST API — share a single PostgreSQL database and a real-time SSE event bus.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Web Storefront](#2-web-storefront)
3. [Admin Portal](#3-admin-portal)
4. [Mobile App](#4-mobile-app)
5. [API Server](#5-api-server)
6. [Real-Time System](#6-real-time-system)
7. [Integrations & Channels](#7-integrations--channels)
8. [Dropshipping (Eprolo)](#8-dropshipping-eprolo)
9. [Tech Stack Summary](#9-tech-stack-summary)

---

## 1. Platform Overview

| Surface | Tech | Port |
|---------|------|------|
| Web Storefront | React 19 + Vite 7 + Tailwind CSS 4 | 22805 |
| Admin Portal | React 19 + Vite 7 + Tailwind CSS 4 | 5000 |
| Mobile App | Expo SDK 52 + React Native | 3002 |
| API Server | Express 5 + Drizzle ORM + PostgreSQL | 3001 |

All surfaces talk exclusively to the API server. The admin portal and storefront are fully isolated — no shared routes or cross-links.

---

## 2. Web Storefront

A premium, editorial shopping experience with a dark-accented luxury aesthetic.

### Pages

| Route | Description |
|-------|-------------|
| `/` | Hero landing with featured collections, editorial banners |
| `/products` | Full catalog with category filters, search, sorting |
| `/products/:slug` | Product detail — images, variants, size guide, reviews |
| `/cart` | Persistent cart with coupon code support (`LUXE20`) |
| `/checkout` | Multi-step: address → shipping → payment → confirmation |
| `/account` | Dashboard: profile, order history, wishlist, addresses |
| `/wishlist` | Saved products with move-to-cart |
| `/blog` | Editorial articles and brand stories |
| `/blog/:slug` | Full article reader |
| `/search` | Full-text product search |
| `/pages/privacy-policy` | Legal static page |
| `/pages/terms` | Legal static page |
| `/pages/returns` | Returns policy static page |

### Features

- **Shopping cart** — add, update quantity, remove; persisted per session
- **Coupon codes** — validated server-side; `LUXE20` applies 20% discount
- **Wishlist** — authenticated; synced with account dashboard
- **Product reviews** — star ratings + comments; displayed on product pages
- **Newsletter signup** — email capture with server-side subscription storage
- **Category & variant support** — products have size/colour variants with per-variant stock
- **Responsive design** — mobile-first layout with hamburger nav

---

## 3. Admin Portal

A standalone role-gated management dashboard — accessible only to users with `ADMIN` role via OTP-based passwordless login.

### Pages

| Route | Description |
|-------|-------------|
| `/` (login) | OTP sign-in — email → 6-digit code |
| `/dashboard` | KPI cards, revenue chart, recent activity feed |
| `/catalog` | Full product CRUD — create, edit, publish, archive |
| `/orders` | Order list with status filters, detail view, status updates |
| `/customers` | Customer directory, profiles, order history |
| `/analytics` | Sales trends, conversion metrics, top products |
| `/channels` | Channel Hub — manage social/API integrations |
| `/channels/facebook` | Facebook catalog sync, page connection |
| `/channels/twitter` | Twitter/X API configuration |
| `/channels/whatsapp` | WhatsApp Business API setup |
| `/blog` | Blog post list with editor access |
| `/blog/new` | Rich blog post editor |
| `/blog/:id/edit` | Edit existing post |
| `/team` | Team member management |
| `/settings` | Store-wide settings |

### Real-Time Notifications Panel

The bell icon in the top bar opens a live notification feed:

- **Order alerts** — new orders with "Action needed" badges for pending/processing states
- **Low-stock alerts** — products at or below the configured threshold (default: 5 units), surfaced instantly via SSE. Shows "Critical" (0 stock) vs "Low" badges, with a "Check now" button for an on-demand scan
- **SSE live indicator** — green dot shows connection status
- Badge count combines unread orders + unseen low-stock events

### Security

- OTP login — no passwords; codes expire in 10 minutes
- Route guard — all `/dashboard/*` routes redirect to login if unauthenticated
- Role check — only `ADMIN`-role users receive a valid session
- Fully isolated from the customer storefront

---

## 4. Mobile App

An Expo / React Native application delivering the full shopping experience on iOS and Android.

### Navigation Structure

```
Tab Navigator
├── Home      — featured products, editorial banners
├── Shop      — full catalog with search + filters
├── Cart      — cart management
└── Account   — profile, orders, wishlist

Stack Screens
├── Product Detail   — images, variants, reviews, add-to-cart
├── Checkout         — address → payment → confirmation
├── Order Detail     — tracking status
├── Blog             — article list + reader
└── Wishlist         — saved items
```

### Native Features

- **Push notifications** — Expo Notifications; token stored server-side; order status updates pushed from API
- **Haptic feedback** — on add-to-cart, checkout confirmation, and error states
- **Deep linking** — product and order URLs open directly in the app

---

## 5. API Server

Express 5 REST API — the single backend for all three frontends.

### Route Groups

| Prefix | File | Purpose |
|--------|------|---------|
| `/api/auth/*` | `auth.ts` | OTP login, session management |
| `/api/products/*` | `store.ts` | Product catalog reads |
| `/api/orders/*` | `ecommerce.ts` | Cart, checkout, order CRUD |
| `/api/admin/*` | `admin-stats.ts`, `low-stock.ts` | Admin KPIs, low-stock alerts |
| `/api/channels/*` | `channels.ts` | Channel credential store |
| `/api/facebook/*` | `facebook.ts` | Facebook Graph API proxy + catalog batch sync |
| `/api/twitter/*` | `twitter.ts` | Twitter API proxy |
| `/api/whatsapp/*` | `whatsapp.ts` | WhatsApp Business API proxy |
| `/api/eprolo/*` | `eprolo.ts` | Dropshipping catalog + order sync |
| `/api/newsletter/*` | `newsletter.ts` | Email subscription management |
| `/api/push-tokens/*` | `push-tokens.ts` | Expo push token storage |
| `/api/settings/*` | `settings.ts` | Store configuration |
| `/api/events` | `events.ts` | SSE stream for admin real-time events |

### Low-Stock Alert Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/admin/low-stock` | Current low-stock products + threshold |
| `POST` | `/api/admin/low-stock/check` | Trigger an immediate DB scan |
| `GET` | `/api/admin/low-stock/settings` | Read current threshold |
| `PUT` | `/api/admin/low-stock/settings` | Update threshold `{ threshold: number }` |

### Database Schema (Drizzle + PostgreSQL)

- `users` — customers and admins; `role` enum: `CUSTOMER | ADMIN`
- `products` — catalog with `trackQuantity`, `stock`, `status` fields
- `product_variants` — size/colour variants per product
- `orders` — order records with status lifecycle
- `order_items` — line items per order
- `reviews` — product reviews with rating
- `newsletter_subscribers` — email list
- `channel_credentials` — encrypted API keys per channel

---

## 6. Real-Time System

All live admin updates flow through a single SSE endpoint: `GET /api/events`.

### Event Types

| Event | Trigger | Payload |
|-------|---------|---------|
| `order_created` | New order placed | Full order object |
| `order_updated` | Status change | `{ id, status }` |
| `low_stock` | 5-min background scan finds new low-stock items | `{ products[], threshold }` |
| `heartbeat` | Every 30 seconds | — |

The `AdminLayout` component maintains a persistent `EventSource` connection, reconnecting automatically on drop. The bell badge increments in real time without any polling.

---

## 7. Integrations & Channels

### Facebook

- Connect a Facebook Page and Commerce Catalog via the Channel Hub
- **Catalog sync**: `POST /api/facebook/catalog/sync` — reads all active products from the DB and pushes them to Facebook in batches of 50 using the `/{catalogId}/items_batch` API
- Supports product title, description, price, image, URL, condition, availability, and brand fields

### Twitter / X

- API key + secret storage via the Channel Hub
- Proxy endpoints for posting and reading tweets from the admin portal

### WhatsApp Business

- Phone number ID + access token storage
- Message send proxy for customer support workflows

---

## 8. Dropshipping (Eprolo)

Full dropshipping integration via the Eprolo API.

| Feature | Description |
|---------|-------------|
| Catalog browse | Browse Eprolo supplier products from inside the admin |
| Import | Pull a supplier product into the store as a draft |
| Publish | Review and publish imported products to the live catalog |
| Inventory sync | Automatic stock level updates from supplier |
| Order sync | Forward customer orders to Eprolo for fulfillment |
| Webhook | Receive tracking/shipment updates from Eprolo |

---

## 9. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.9 (strict) |
| Runtime | Node.js 24 |
| Package manager | pnpm workspaces |
| API framework | Express 5 |
| Database | PostgreSQL via Replit integration |
| ORM | Drizzle ORM + drizzle-zod |
| Validation | Zod v4 |
| API contract | OpenAPI 3.1 spec → Orval codegen |
| Web framework | React 19 |
| Web build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Web routing | Wouter |
| Server state | TanStack Query |
| Mobile | Expo SDK 52 + React Native |
| Real-time | Server-Sent Events (SSE) |
| API build | esbuild (ESM bundle) |
| Logging | Pino |

---

> Full developer README: [replit.md](./replit.md)
