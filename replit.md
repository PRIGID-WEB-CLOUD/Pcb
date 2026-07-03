# Luxe Boutique

A full-stack luxury e-commerce platform — multi-surface monorepo with a customer web storefront, React Native mobile app, dedicated admin portal, and a shared Express API powering them all.

> See [PORTFOLIO.md](./PORTFOLIO.md) for a feature-by-feature portfolio overview.

---

## Apps at a glance

| App | Package | Port | Purpose |
|-----|---------|------|---------|
| API Server | `@workspace/api-server` | 3001 | Express 5 REST + SSE backend |
| Web Storefront | `@workspace/luxe-boutique` | 22805 | Customer-facing React/Vite shop |
| Admin Portal | `@workspace/luxe-boutique-admin` | 5000 | Management dashboard (role-gated) |
| Mobile App | `@workspace/luxe-boutique-mobile` | 3002 | Expo / React Native storefront |
| Mockup Sandbox | `@workspace/mockup-sandbox` | 8082 | Isolated UI component previewer |

---

## Run & Operate

```bash
# Start individual apps (each has its own workflow in Replit)
pnpm --filter @workspace/api-server run dev          # API (port 3001)
PORT=5000 pnpm --filter @workspace/luxe-boutique-admin run dev   # Admin (port 5000)
pnpm --filter @workspace/luxe-boutique run dev       # Storefront
PORT=3002 pnpm --filter @workspace/luxe-boutique-mobile run dev  # Mobile (Expo)

# Monorepo-wide commands
pnpm run typecheck          # Full TypeScript check across all packages
pnpm run build              # Typecheck + build all packages
pnpm --filter @workspace/api-spec run codegen        # Regenerate API hooks & Zod schemas
pnpm --filter @workspace/db run push                 # Push DB schema (dev only)
```

Required env: `DATABASE_URL` — PostgreSQL connection string (auto-provided by Replit DB integration).

---

## Stack

- **Runtime**: Node.js 24, TypeScript 5.9, pnpm workspaces
- **API**: Express 5, Pino logging, SSE (Server-Sent Events)
- **DB**: PostgreSQL + Drizzle ORM + `drizzle-zod`
- **Validation**: Zod v4
- **Frontend**: React 19, Vite 7, Tailwind CSS 4, Wouter (routing), TanStack Query
- **Mobile**: Expo SDK 52, React Native, Expo Notifications
- **API codegen**: Orval (OpenAPI → TanStack Query hooks + Zod schemas)
- **Build**: esbuild (CJS bundle for API)

---

## Where things live

| What | Path |
|------|------|
| DB schema (source of truth) | `lib/db/src/schema/index.ts` |
| OpenAPI spec (source of truth) | `lib/api-spec/openapi.yaml` |
| Generated React query hooks | `lib/api-client-react/` |
| Generated Zod schemas | `lib/api-zod/` |
| API route registration | `artifacts/api-server/src/routes/index.ts` |
| SSE event bus | `artifacts/api-server/src/lib/eventBus.ts` |
| Admin layout + notifications | `artifacts/luxe-boutique-admin/src/pages/admin/AdminLayout.tsx` |
| Channel credential store | `artifacts/api-server/src/routes/channels.ts` |
| Facebook catalog sync | `artifacts/api-server/src/routes/facebook.ts` |
| Low-stock alert API | `artifacts/api-server/src/routes/low-stock.ts` |
| Admin auth guard | `artifacts/luxe-boutique-admin/src/lib/AuthContext.tsx` |

---

## Architecture decisions

- **Two separate Vite apps, no cross-links**: The storefront (`luxe-boutique`) and admin portal (`luxe-boutique-admin`) are fully independent apps with separate auth. Admin links were deliberately removed from the storefront.
- **SSE for real-time admin events**: Order arrivals, order status updates, and low-stock alerts all flow to the admin via a single `/api/events` SSE stream rather than polling or WebSockets — lightweight and proxy-friendly.
- **In-memory credential store for channels**: Channel API credentials (Facebook, Twitter, WhatsApp) are stored in a DB-backed in-memory object to keep handler code synchronous. Do NOT make credential reads async.
- **Orval codegen over hand-written hooks**: All API client code is generated from the OpenAPI spec. Run `codegen` after any spec change — never edit generated files directly.
- **Low-stock threshold in memory**: The alert threshold defaults to 5, is adjusted via `PUT /api/admin/low-stock/settings`, and resets `lastAlertedIds` on change so newly-threshold-crossing products surface immediately.

---

## Product

**Customer Storefront**
Browse and search a curated luxury catalog; add to cart or wishlist; multi-step checkout with coupon codes (`LUXE20`); account dashboard with order history; blog and editorial content.

**Admin Portal**
Real-time order management with SSE notifications; product catalog CRUD; customer directory; analytics dashboards; social channel hub (Facebook catalog sync, Twitter, WhatsApp); Eprolo dropshipping integration; low-stock alerts in the notifications panel.

**Mobile App**
Full shopping experience on iOS/Android via Expo; push notifications for order updates; haptic feedback; native navigation.

---

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

---

## Gotchas

- **Port conflicts on restart**: Vite apps (admin, storefront) can fail on restart if the old process hasn't released the port yet. Restart the workflow a second time if you see `Port X is already in use`.
- **Credential store is synchronous**: `channels.ts` uses a plain in-memory object backed by DB on startup. Never make credential reads async — route handlers depend on synchronous access.
- **Run codegen after spec changes**: `pnpm --filter @workspace/api-spec run codegen` must run before building if `openapi.yaml` was modified.
- **Admin login is OTP-only**: No passwords. Use `admin@luxeboutique.com` → receive 6-digit OTP → enter it. OTP expires in 10 minutes.
- **Low-stock SSE fires only for newly detected items**: `lastAlertedIds` tracks which products were already surfaced. Only net-new low-stock products trigger an SSE push.

---

## Pointers

- [PORTFOLIO.md](./PORTFOLIO.md) — full feature/page inventory for portfolio or handoff
- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
