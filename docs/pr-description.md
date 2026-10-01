ARC now provides a five-person personal development beta: typed email OTP, one-time focus/timezone onboarding, three deterministic daily quests, secure XP awards, levels/ranks/streaks, an accessible attribute radar, and a profile. The mobile-first PWA supports shell installation, read-only offline snapshots, an update prompt, and recovery of a single pending completion with its original idempotency key.

The PostgreSQL migrations implement sealed versioned catalogs, RLS, append-only completions, per-user locking, idempotency aliases, and public invoker RPCs backed by private definer functions. Rewards and local dates are server authoritative. The catalog contains 25 human-authored quests.

Validation: typecheck, lint, Vitest/React Testing Library, real local PostgreSQL security/concurrency and SQL/TypeScript parity tests, production build, dependency audit, and mobile Playwright flows. Browser Supabase HTTP responses are mocked; hosted Supabase JWT/auth configuration and email delivery still need verification on a dedicated ARC project. See README for exact setup and deployment steps.

Do not merge until the hosted setup is reviewed and real beta email sign-in and completion are verified.
