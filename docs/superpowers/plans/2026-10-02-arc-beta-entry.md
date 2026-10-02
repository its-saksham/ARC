# ARC Beta Entry Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. No subagents unless the user chooses delegated execution. Do not commit before user review.

**Goal:** Provide truthful 15-seat availability and private verified-email waitlist persistence.

**Architecture:** Add migrations without altering applied files. Retain narrow public security-invoker RPC wrappers around private implementations, explicit grants and empty search paths. One private capacity source supplies both admission and availability.

**Tech Stack:** Existing Supabase/PostgreSQL, disposable database harness `scripts/db-tests.ts`, and the installed Supabase CLI.

**Spec:** `docs/launch-expansion-design.md` and `docs/superpowers/specs/2026-10-02-arc-ui-ux-design.md`.

## Global Constraints

- ARC only; hosted project `sibufkhplnvwjtjdkmsb`; PR #1 stays unmerged.
- 15 total profiles, including the founder; waitlist/OTP-only users take no seat.
- Preserve admission lock, validation, idempotency, existing profiles and catalog.
- Never expose identities or service-role credentials to anonymous clients.
- Private tables have RLS and no client CRUD; authenticated waitlist operations derive identity from `auth.uid()` and require a confirmed email.
- Do not send invitations or claim they are automatically delivered.
- Discover CLI commands through help; create migration files with `supabase migration new`, then edit with apply_patch.

## Review Focus

- Two users racing for the final seat must not create a 16th profile.
- Existing profiles retrying onboarding at capacity must still succeed.
- An unconfirmed/deleted user with a JWT must not create a waitlist entry.
- Anonymous/cross-user access and invalid source values must fail.
- Duplicate joins preserve the original timestamp; leave affects only the caller.

---

### Task 1: Capacity and aggregate RPC

**Files:** New CLI-generated capacity migration in `supabase/migrations/`; modify `scripts/db-tests.ts` and its disposable auth fixture if needed.

**Interfaces:** `public.get_beta_availability()` returns JSON `{capacity:15,remaining:max(0,15-profile_count),checked_at:timestamp}` and is executable by anon/authenticated. `private.beta_capacity()` is the shared server-side value used by admission and aggregate lookup. `public.save_onboarding(text,text)` retains its signature and output.

- [ ] Fetch current Supabase changelog and relevant function/grant documentation before implementation; inspect existing schema/fixture and CLI help.
- [ ] Add database assertions for occupied counts 0/1/14/15 producing remaining 15/14/1/0, aggregate-only anonymous output, no direct profile access, existing-user retry, and a two-user final-seat race.
- [ ] Run `npm run test:db`; observe failures against the current five-profile gate/missing RPC.
- [ ] Generate and implement the additive migration with explicit execute revocations/grants, stable read-only aggregate behavior and admission using the shared capacity. Keep privileged implementations private; intentionally document the anonymous aggregate exception to identity checks.
- [ ] Run `npm run test:db`; all existing and new security/parity/concurrency groups pass.

### Task 2: Private waitlist operations

**Files:** New CLI-generated waitlist migration in `supabase/migrations/`; modify `scripts/db-tests.ts` and disposable auth fixture to include confirmation metadata matching hosted auth.

**Interfaces:** `public.get_waitlist()` returns JSON `{joined:boolean,created_at:timestamp|null}`; `public.join_waitlist(p_source text default 'direct')` returns `{joined:true,created_at:timestamp}`; `public.leave_waitlist()` returns `{joined:false,created_at:null}`. `private.waitlist_entries` has `user_id` primary key referencing auth.users with cascading deletion, `created_at`, and allowlisted source direct/reddit/x.

- [ ] Add assertions for anonymous denial, missing/invalid identity, unconfirmed/deleted user denial, no direct table CRUD, account isolation, invalid source rejection, duplicate timestamp preservation and repeated leave success.
- [ ] Run `npm run test:db`; observe failures before adding the migration.
- [ ] Implement private identity-checked definer functions and public invoker wrappers, empty search paths, explicit grants/revocations and RLS with no direct client policies. Do not duplicate email in a public table.
- [ ] Run the full database suite; confirm waitlist operations do not affect profile count or progression.

### Task 3: Hosted release checks, after preview approval

**Files:** Update `docs/verification.md` and `README.md` only with observed results.

**Interfaces:** Use ARC's normal authenticated management connection; never print credentials or inspect unrelated projects.

- [ ] Confirm local checks, user preview approval, target project identity, applied migration history and intended migration contents before release.
- [ ] Apply only tested ARC migrations; inspect function grants, RLS and security advisors. Resolve security errors before deploying the companion interface.
- [ ] Read the real aggregate via anonymous HTTP and verify hosted authenticated waitlist join/get/leave with an authorized test user. Do not use destructive production capacity fixtures.
- [ ] Record actual count/read time and hosted limits; do not quote an illustrative count in marketing.

## Self-review

All backend requirements map to Tasks 1–3. Every Review Focus condition is pinned to a database test. Public availability is the only anonymous RPC addition; all waitlist operations require verified caller identity. Release is gated on local checks and user preview review.
