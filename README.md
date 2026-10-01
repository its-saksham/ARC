# ARC V1

A mobile-first personal development PWA for a free five-person beta. Email codes unlock one-time onboarding, three daily quests, XP/levels/ranks, streaks, an accessible attribute radar, and a profile. There are no payments, leaderboards, social features, guest accounts, or generated quests.

## Local setup

Use Node **22.12+** (the implementation was verified with 22.23.3) and npm. Dependencies are pinned and `package-lock.json` is committed.

```sh
npm ci
cp .env.example .env
```

For a full local Supabase backend, start Docker Desktop, then:

```sh
npx supabase start
npx supabase db reset --local
npx supabase status
```

Set `.env` to the local API URL and **publishable key** shown by `supabase status` (a legacy anon key also works). Never use a service-role key in frontend variables. The local email inbox is available at the Inbucket/Mailpit URL reported by the CLI. Enter the six-digit code from the email in ARC.

```sh
npm run dev
```

Without these variables, the app displays a setup state rather than pretending to have a working backend:

| Variable                        | Purpose                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Your ARC project's API URL                                                                                                |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser-safe publishable/anon key                                                                                         |
| `ARC_TEST_DATABASE_URL`         | Server-side integration test URL for a **new, disposable, empty localhost PostgreSQL database**; never a `VITE_` variable |

`.env` files are ignored. Use normal local authentication tools and environment variables for credentials; do not put secrets in git or chat.

## Hosted Supabase setup

No hosted ARC project has been linked or modified. The connected organization reported a free plan and a new-project quote of $0/month during inspection. Its two existing projects are unrelated and were left untouched. Confirm the current plan, free-project availability, and intended organization before creating a dedicated **ARC** project. A free quote does not bypass organization limits.

1. Create an ARC-only project, ideally near your beta users. Keep the Data API exposed schemas limited to `public` (and the default `graphql_public` if needed); **never expose `private`**.
2. Authenticate and link using the normal CLI flow:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_ARC_PROJECT_REF
   npx supabase db push --dry-run
   npx supabase db push
   ```

   Enter the database password through the CLI prompt or a local `SUPABASE_DB_PASSWORD` environment variable. `db push` applies both schema and catalog migrations; the catalog does not depend on an extra seed command. Review the dry run to ensure it names only ARC.

3. Enable the email provider and email confirmations. Set the OTP length to 6, minimum send interval to 60 seconds, and an appropriate short expiry (the local config uses 3600 seconds).
4. Set both **Magic Link** and **Confirm Signup** email templates to the content in `supabase/templates/otp.html`, including `{{ .Token }}`. Email OTP uses these templates; `signInWithOtp` would otherwise send a link. Configure the Site URL for the deployed ARC origin. See [Supabase's email OTP documentation](https://supabase.com/docs/guides/auth/auth-email-passwordless).
5. Configure an SMTP service you already have, or obtain approval before paying for one. Supabase's default mail service is restricted; do not assume it can deliver to all five beta users. See [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
6. Set your hosting environment to the ARC API URL and browser-safe publishable key. Verify sign-in with an actual beta email, then onboarding and a quest completion. Check database advisors and keep anonymous sign-ins disabled.

Only the first five authenticated users to finish onboarding are admitted; concurrent onboarding is serialized. Retrying onboarding returns the existing profile without altering focus, timezone, or catalog version. Focus and timezone are intentionally fixed during V1.

## Daily assignment and progression

The canonical attribute order is Strength, Intelligence, Vitality, Charisma, Perception. Focus maps discipline → Perception, health → Vitality, capabilities → Intelligence. The authored catalog in `src/domain/catalog.ts` contains five practical quests per attribute, with instructions, effort, XP, focus tags, repeatability, quest version, and catalog version.

Every local day receives exactly three distinct quest IDs: focus, weakest, then balance. Focus and weakest may be the same attribute. Balance excludes the distinct focus/weakest attributes. Weakest XP and exclusion history come **only from local dates before the assignment date**, so completion cannot reshuffle today. Profiles pin a catalog version.

SHA-256 is applied to UTF-8 strings, sorted by lowercase hexadecimal digest ascending:

```text
Candidate: userId|localDate|catalogVersion|slot|questId|questVersion
Weakest tie: userId|localDate|catalogVersion|weakest|attribute
Balance attribute: userId|localDate|catalogVersion|balance|attribute
```

Slots are `focus`, `weakest`, `balance`; dates are ISO `YYYY-MM-DD`; UUID strings are lowercase. Hash ties use canonical attribute order or quest ID (ASCII/C ordering), then quest version. Nonrepeatable quest IDs completed on any of the previous seven local dates are excluded. If an attribute pool is exhausted, relax **only** that exclusion and retain the distinct-ID rule. The five-per-attribute catalog guarantees enough choices. SQL and TypeScript parity tests cover normal history and exhausted pools.

Light/standard/deep quests award 10/15/25 XP. Level is `floor(totalXP / 200) + 1`. Rank thresholds are E 0, D 1500, C 4500, B 9000, A 18000, S 36000. Radar score is `min(100, 20 + floor(2.5 * sqrt(attributeXP)))`. Numerical values accompany the radar graphic.

An active day has at least one distinct assigned completion; all three make a perfect day. The streak counts consecutive active local dates. If today is inactive, yesterday's streak stays alive until today ends. A missing whole local date resets it. Server time and the saved IANA timezone determine the authoritative date.

## Database security and catalog updates

Migrations create `profiles`, `quests`, append-only `quest_completions`, and minimal allowlisted `analytics_events`. A private request-key table preserves aliases when a duplicate completion uses a new idempotency key. RLS limits reads to the user and active/pinned catalog. Authenticated clients have no direct write grants for these tables.

The exposed RPCs are `save_onboarding`, `get_daily_quests`, `get_today`, `complete_quest`, and `track_event`. Public wrappers are security invokers. Privileged implementations live in unexposed `private` with empty `search_path`, fully qualified table references, and explicit execution grants. Internal identity/date helpers cannot be called by authenticated users. The implementation derives identity from `auth.uid()` and checks that the auth user still exists.

`complete_quest` takes quest ID/version, a UUID idempotency key, and an expected local date from the last Today snapshot. The expected date is a precondition only: the server still calculates the authoritative date using server time and the saved timezone. It locks per user, verifies assignment, and derives attribute/reward from the immutable catalog. A new key from an earlier date is rejected so an uncommitted request cannot silently credit a later day. Existing keys are resolved before this date guard; retries return the original completion plus a fresh authoritative Today snapshot, even after midnight. Reusing a key for another quest/version fails, and unique constraints prevent duplicate rewards. Snapshot reads use the same user lock to keep totals and completion counts consistent.

Published catalog versions are sealed against additional rows, updates, and deletions. A new release must be a **new catalog version**, with its own migration and publication marker; do not edit version 1 after deployment. Existing users remain pinned. Catalog SQL is generated with `npx tsx scripts/generate-catalog.ts` during initial development; this generator intentionally targets V1 and must not rewrite an already deployed migration. New versions need new migrations created with `supabase migration new`.

## PWA and recovery

The manifest supplies standard and maskable PNG icons. The production service worker precaches the app shell and hashed static assets. API/auth responses are never cached. User-scoped localStorage contains one read-only snapshot and at most one pending completion request with its idempotency key. There is no offline database or offline write queue. Completion requires connectivity.

Completion is optimistic in memory and then reconciled with the server. A failed/lost response preserves the request, including its originating local date. Reload or reconnection retries with the same key; explicit Retry and Dismiss controls are available. Dismiss removes only the local request and does not undo an award. A rejected old-day request requires dismissal and a fresh action on today's assignment. Background reads pause while a request is pending; outstanding reads are cancelled before reconciliation and ambiguous failures refresh the authoritative snapshot. Logout clears the user's snapshot, pending request, and query cache. In-flight requests are cancelled immediately on auth changes and completion callbacks ignore an unmounted account. Onboarding also offers sign out so a rejected or incorrect account can be switched.

An update-available prompt activates the waiting service worker on demand and reloads into the new shell. Pending completion data survives updates. Service workers run only in production builds on HTTPS or localhost. To inspect a build:

```sh
npm run build
npm run preview
```

## Verification

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm audit --audit-level=low
```

For SQL integration tests, use a NEW empty PostgreSQL 17 database on localhost with pgcrypto available. These tests apply the migrations themselves, install a minimal `auth.users`/`auth.uid()` shim, use real authenticated Postgres roles, and refuse an existing application/auth database. They never reset existing data.

```sh
createdb arc_test
ARC_TEST_DATABASE_URL=postgresql://YOUR_LOCAL_ROLE@127.0.0.1:5432/arc_test npm run test:db
```

Use a fresh database name for each run. CI provisions a disposable PostgreSQL service. SQL checks exercise RLS, private helper isolation, reward forgery, concurrent requests, duplicate/alias idempotency, onboarding validation/retries, beta limits, timezone/progression, and SQL/TypeScript assignment parity including exclusion fallback.

Vitest/React Testing Library cover domain/date rules, storage isolation, cancellation, OTP errors/cooldown, onboarding validation, and pending-request recovery. Playwright tests the mobile sign-in/onboarding/quest/status/profile flow and lost-response/reload/offline behavior with **mocked Supabase HTTP responses**. Its PWA update test serves a real changed service worker. None of these prove hosted email delivery, hosted JWT validation, or hosted configuration. Those checks remain required after the dedicated project is configured.

## Deployment and handoff

Build command: `npm ci && npm run build`. Publish `dist` on an HTTPS static host. Configure SPA fallback to `index.html` while serving real assets/manifest/service worker normally; Netlify `_redirects` and Vercel config are provided. Serve `/sw.js` and `/index.html` with revalidation/no-cache; hashed assets may have immutable caching. Never deploy a build using the browser-test public key. Keep public Supabase variables in the host's environment.

The repository was empty. Local `main` contains the baseline commit and `feat/arc-v1` contains the implementation, allowing a real PR after both branches are published. Per the user's handoff, the user performs pushes:

```sh
git push -u origin main
git push -u origin feat/arc-v1
gh pr create --repo its-saksham/ARC --base main --head feat/arc-v1 --title "Build ARC V1 personal development PWA" --body-file docs/pr-description.md
```

The early push dry run returned HTTP 403 because Git authenticated as `SakshamDAZN`, which lacks write access to `its-saksham/ARC`. If needed, run `gh auth login --hostname github.com --git-protocol https --web` as the intended account, then `gh auth setup-git`. Connector authorization in ChatGPT does not supply Git CLI credentials. No PR has been merged.
