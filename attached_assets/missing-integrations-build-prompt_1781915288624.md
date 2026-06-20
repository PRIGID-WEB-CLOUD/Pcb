# Build Prompt — Complete the Missing Automation Engines (LUXE BOUTIQUE)

Paste this into Claude Code (or any coding agent) at the root of the `Pcb-main` repo.

---

## Context

This is a Next.js/Express + Drizzle/PostgreSQL e-commerce admin (`LUXE BOUTIQUE`). The Facebook, WhatsApp, and Twitter/X channel integrations have **real API clients** (`artifacts/api-server/src/lib/social/meta.ts`, `whatsapp.ts`, `twitter.ts`) and **real one-shot actions** (publish post, send message, sync catalog) already working. However, six features are currently just database read/write toggles with no engine behind them — they look functional in the UI but don't actually do anything automated. Build real implementations for all six, in the order listed (each builds on the last).

Do not change any existing working routes (`/posts/publish`, `/messages/send`, `/catalog/sync`, `/payments/initialize`, etc.) — only add new logic alongside them.

---

## 1. Background Job Runner (foundation — build this first)

Every other item below needs a recurring worker. Add a lightweight scheduler to the API server:

- Add `node-cron` to `artifacts/api-server/package.json`.
- Create `artifacts/api-server/src/jobs/` with one file per job (`twitterQueueRunner.ts`, `twitterAutoRules.ts`, `whatsappJourneys.ts`, `facebookAdsSync.ts`).
- Create `artifacts/api-server/src/jobs/index.ts` that registers all jobs with `cron.schedule(...)` and is called once from `src/index.ts` on server boot.
- Each job must: run on a sensible interval (queue runner every 1 min, others every 5–15 min), log start/end/error, and never throw unhandled — wrap in try/catch so one job failing doesn't kill the process.
- Add a `job_runs` table (`id`, `jobName`, `status`, `startedAt`, `finishedAt`, `error`) so the admin can later see job health. Expose `GET /api/admin/jobs/runs` for this.

---

## 2. Twitter Queue → Actually Posts on Schedule

Right now `twitter_tweet_queue` rows just sit there with a `scheduledFor` string and nothing reads them.

- In `artifacts/api-server/src/jobs/twitterQueueRunner.ts`: query `twitterTweetQueue` where `status = 'Queued'` and `scheduledFor <= now()`.
- For each match, call the existing `Twitter` client's tweet-posting method (same one used by `/posts/publish` in `routes/twitter.ts`) with the row's `text`.
- On success: update status to `"Posted"`, store the returned tweet ID in a new `postedTweetId` column.
- On failure: update status to `"Failed"`, store the error in a new `lastError` column, and don't retry more than 3 times (add `retryCount`).
- Update `AdminTwitterPage.tsx`'s Queue tab to show `Posted`/`Failed` states (it currently only renders `Queued`) and surface `lastError` on hover/click.

---

## 3. Twitter Auto-post Rules → Actually Trigger

`twitter_auto_rules` rows have a `trigger` (e.g. "new_arrival", "low_stock") and `action`, but nothing ever fires them.

- Decide the trigger set explicitly with these mappings to real store events already in the DB:
  - `new_arrival` → a new row inserted into the products table within the last job interval
  - `low_stock` → a product's stock quantity crosses below a threshold (e.g. 5)
  - `back_in_stock` → a product's stock goes from 0 to >0
- In `artifacts/api-server/src/jobs/twitterAutoRules.ts`: for each active rule, query for matching events since the rule's `lastFiredAt` (add this column to `twitter_auto_rules`).
- When a match is found: look up the rule's `template` in `twitterContentTemplates`, interpolate product name/price/image into the template body, and insert a row into `twitterTweetQueue` with `scheduledFor = now()` (item 2's runner will pick it up) rather than posting directly — this keeps one code path for actually publishing.
- Update `lastFiredAt` after firing so the same product event doesn't fire twice.
- Add a `firedCount` column and increment it, then surface it in `AdminTwitterPage.tsx`'s Rules tab so the admin can see the rule is actually doing something.

---

## 4. WhatsApp Journeys → Real Automation

`whatsapp_journeys` rows are just an on/off switch with cosmetic `sentCount`/`convRate` strings. There is no journey logic at all.

- Define journeys as concrete, triggerable flows tied to real store events (mirror the seeded journey titles in the DB — check `whatsappJourneys` seed data for the exact `journeyId`s in use, likely things like `abandoned_cart`, `order_confirmation`, `back_in_stock`).
- Add a `whatsapp_journey_steps` table: `id`, `journeyId` (FK), `stepOrder`, `delayMinutes`, `templateName` (FK to `whatsappTemplates.name`).
- Add a `whatsapp_journey_runs` table to track per-customer progress: `id`, `journeyId`, `customerPhone`, `currentStep`, `triggeredAt`, `nextStepDueAt`, `status` (`active`/`completed`/`stopped`).
- In `artifacts/api-server/src/jobs/whatsappJourneys.ts`:
  - For trigger events (e.g. cart created but no order within X minutes → `abandoned_cart`; order status changes to `confirmed` → `order_confirmation`), insert a new `whatsapp_journey_runs` row if the journey is `active`.
  - Every job tick, find runs where `nextStepDueAt <= now()`, send the step's template via the existing `Whatsapp` client (same one `/messages/send-template` uses), advance `currentStep`, recompute `nextStepDueAt` from the next step's `delayMinutes`, or mark `completed` if no steps remain.
- Respect `whatsapp_optin_settings` — never message a customer who has opted out (item 5 must ship alongside this).
- Replace the cosmetic `sentCount`/`convRate` text columns with real aggregates computed from `whatsapp_journey_runs` (count of runs reaching final step / total runs), exposed via the existing `GET /journeys` route.

---

## 5. WhatsApp Opt-in/Out → Actually Enforced

`whatsapp_optin_settings` stores keywords but nothing reads incoming messages against them.

- The webhook receiver already exists at `POST /api/whatsapp/webhook` in `routes/whatsapp.ts` — currently it likely just logs/acks. Extend it to:
  - Parse the inbound message text.
  - If it case-insensitively matches `optinKeyword`, upsert a `whatsapp_contacts` table (`phone`, `optedIn: true`, `optedInAt`). Create this table if it doesn't exist.
  - If it matches `optoutKeyword`, set `optedIn: false` and immediately stop any `whatsapp_journey_runs` for that phone (`status = 'stopped'`).
  - If `doubleOptin` is true, send a confirmation template asking the customer to reply again before flipping `optedIn` to true.
- Every outbound send (journeys, broadcasts, template sends) must check `whatsapp_contacts.optedIn` before sending and skip/log if false.

---

## 6. Facebook "Live Ad Data" Tab → Real or Honestly Removed

The Ads tab is labeled "Live data only" but is fabricated from local post engagement, and the real backend routes (`/ads/insights`, `/ads/campaigns`, `/ads/account`) are never called.

- In `artifacts/api-server/src/jobs/facebookAdsSync.ts`: every 15 min, for any store with `ad_account_id` saved in `channelCredentials`, call the existing `Meta` client's ad-insights method (the one backing `/ads/insights`).
- Store results in a new `facebook_ad_metrics` table: `id`, `date`, `impressions`, `clicks`, `spend`, `reach`, `ctr`.
- Update `AdminFacebookPage.tsx`'s Ads tab to `fetch("/api/facebook/ads/insights")` directly (it currently never calls this) and render the real stored metrics instead of deriving fake numbers from `publishedPosts`.
- If real ad spend data isn't available (no ad account connected), keep the existing "No Ad Account connected" empty state — don't show fabricated numbers as a fallback.

---

## Also fix while you're in there (smaller, can be done anytime)

- **Facebook Pixel tab**: currently just a DB toggle with no actual pixel firing. If genuinely out of scope, relabel the tab from implying live tracking to "Pixel Event Mapping (config only)" so it's not misleading — or wire actual client-side `fbq('track', ...)` calls on the storefront using the enabled mappings.
- **Facebook Audiences tab**: either call the real Meta Custom Audiences API (`POST /act_{id}/customaudiences`) when creating an audience, or relabel it clearly as a local naming/planning tool, not a live Meta audience.

---

## Acceptance checklist

- [ ] Twitter queued tweets post automatically at their scheduled time without manual action
- [ ] Twitter auto-rules generate real queued tweets when triggers fire, visible in Queue tab
- [ ] WhatsApp journeys actually send the right template at the right delay per customer
- [ ] Opting out via WhatsApp keyword stops all further messages to that number, verified by test
- [ ] Facebook Ads tab shows real numbers from Meta or a clear empty state — never fabricated numbers
- [ ] All new jobs visible/auditable via `GET /api/admin/jobs/runs`
