# ARC V1 implementation plan

The user supplied the approved specification and authorized autonomous implementation, verification, push, and PR creation. No design approval gate is needed.

Architecture: React routes and TanStack Query use authenticated Supabase RPCs. PostgreSQL owns rewards and dates; TypeScript mirrors deterministic assignment for parity tests. A versioned catalog supplies 25 authored quests. App-shell caching and user-scoped read-only snapshots support offline reading; one persisted idempotent request supports recovery.

1. Domain (`src/domain/*`): write progression/date/assignment tests, implement canonical attributes, catalog and SHA-256 assignment. Verify thresholds, timezone edges, seven-date exclusion and exhausted-pool fallback.
2. Database (`supabase/*`): implement private definer functions with public invoker wrappers, RLS, immutable catalogs and append-only completions. Verify against PostgreSQL: TS parity, authorization, concurrent completion, idempotency and onboarding retries.
3. Client (`src/features/*`, `src/lib/*`): implement OTP, onboarding, Today, quest detail, radar and profile. Test auth errors/cooldown, optimistic completion, durable retry and scoped logout cleanup.
4. PWA (`public/*`, `src/pwa.ts`): shell-only caching, install assets and explicit update prompt. Verify mobile flows with Playwright and a local test backend; record hosted coverage separately.
5. Delivery: typecheck, lint, unit/integration/browser tests, build, dependency audit, author review, documentation, commit, push feature branch and create PR. Never merge.

Fallback: focus and weakest slots may share an attribute but never a quest ID. Balance excludes the distinct focus and weakest attributes. In an exhausted attribute pool, relax only the seven-date nonrepeatable exclusion; the immutable five-per-attribute catalog always provides enough distinct IDs. Hash ties use quest ID/version or canonical attribute order as secondary keys. History includes only dates before today.

Review focus: midnight during retries; lost successful response; same key on different quests; cross-user cached data; offline/expired sessions. These must preserve authoritative rewards and avoid duplicate or misattributed writes.
