# ARC Interface Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. No subagents unless the user chooses delegated execution. Do not commit before the user reviews the working preview.

**Goal:** Implement the approved landing and gameplay designs with accessible beta-entry screens.

**Architecture:** Preserve React Router and existing gameplay/session logic. Add focused public-page components and typed beta API helpers; use the backend contracts in the companion plan rather than fabricated availability or local-only waitlist success.

**Tech Stack:** Existing React 19, Vite, TypeScript, CSS Modules, React Query, Supabase, Vitest and Playwright; no new UI dependencies.

**Spec:** `docs/superpowers/specs/2026-10-02-arc-ui-ux-design.md` and `docs/launch-expansion-design.md`.

## Global Constraints

- Work only in ARC. Keep PR #1 unmerged and secrets out of output/source.
- Match the approved visual preview while using real gameplay content.
- Preserve OTP, saved progression, logout cancellation and completion recovery.
- 44px touch targets; 16px body and 14px secondary actionable text; visible focus and reduced motion.
- No fabricated live counts, testimonials, signup activity, or invitation delivery.
- Use existing system fonts; no remote font dependency.
- Do not deploy UI needing missing RPCs; complete the companion beta plan first.

## Review Focus

- A waitlist OTP session must stay on the waitlist, not enter onboarding.
- Logout/account changes must cancel pending waitlist callbacks and clear user-scoped state.
- Network failure/offline must remove numeric availability, not show stale scarcity.
- 320px screens, long titles and long emails must not overflow or be hidden by navigation.
- Existing users visiting public pages must retain access to Today without rerunning onboarding.

---

### Task 1: Existing app visual system

**Files:** Modify `src/global.css`, `src/ui.module.css`, `src/features/Pages.tsx`, `src/App.tsx`; create `src/features/Pages.test.tsx`.

**Interfaces:** Keep all existing page props and API calls unchanged. Use labelled SVG icons for Today, Status and Profile navigation.

- [ ] Add tests that Today shows all three quest links, explicit completion labels, progression values and accessible daily progress; quest completion remains disabled when offline/busy/completed.
- [ ] Run `npm test -- src/features/Pages.test.tsx`; observe failures for new hierarchy/labels before implementation.
- [ ] Add shared color/spacing tokens, readable type, and the preview's quest-first hierarchy. Keep numerical attribute values and existing recovery UI; replace tiny labels/decorative numbering and fragile fixed-width layouts.
- [ ] Run the new tests and existing completion/onboarding tests; all pass.
- [ ] Review responsive screenshots before considering any commit.

### Task 2: Public landing and availability

**Files:** Create `src/features/Landing.tsx`, `src/features/landing.module.css`, `src/features/useBetaAvailability.ts`, `src/features/Landing.test.tsx`, `src/features/useBetaAvailability.test.tsx`, `src/lib/betaApi.ts`, `src/lib/betaApi.test.ts`; modify `src/App.tsx`, `index.html`.

**Interfaces:** `getBetaAvailability(signal?: AbortSignal): Promise<{capacity:number;remaining:number;checked_at:string}>` validates the companion RPC result. `Landing({signedIn}:{signedIn:boolean})` links to Today or login as appropriate. Availability hook exposes validated data, loading, unavailable and retry states.

- [ ] Add tests for initial loading, real remaining/capacity text, full CTA to `/waitlist`, unavailable/offline clearing, retry, malformed response rejection and stale-request cancellation.
- [ ] Add fake-timer tests asserting visible-only 30-second refresh and focus/reconnect refresh; hidden page does not poll.
- [ ] Run `npm test -- src/features/Landing.test.tsx src/features/useBetaAvailability.test.tsx src/lib/betaApi.test.ts`; observe failures.
- [ ] Implement the helpers/hook/components. Anonymous `/` shows Landing; `/discover` always shows Landing; `/login` uses existing Auth; signed-in `/` remains Today. Provide hero, illustrative quest, three-step explanation, attributes, beta information, FAQ, privacy and supplied social links.
- [ ] Set canonical/social metadata for `https://www.tryarc.co.in`; never cache availability responses in service-worker runtime routes.
- [ ] Run the same tests; all pass, including account/public-route cases.

### Task 3: Verified-email waitlist and OTP usability

**Files:** Create `src/features/Waitlist.tsx`, `src/features/Privacy.tsx`, `src/features/Waitlist.test.tsx`; modify `src/features/Auth.tsx`, `src/features/Auth.test.tsx`, `src/features/Onboarding.tsx`, `src/App.tsx`, `src/lib/betaApi.ts`.

**Interfaces:** `getWaitlist(signal?:AbortSignal):Promise<{joined:boolean;created_at:string|null}>`; `joinWaitlist(source:'direct'|'reddit'|'x',signal?:AbortSignal)` returns the same shape with `joined:true`; `leaveWaitlist(signal?:AbortSignal)` returns `{joined:false,created_at:null}`. `Waitlist({session}:{session:Session|null})` uses Auth when signed out and explicit Join when signed in.

- [ ] Test that OTP authentication on `/waitlist` does not create a profile, and no join occurs before explicit consent.
- [ ] Test persistence success/failure/retry, duplicate join, leave failure, allowed source parsing and logout while requests are pending; late callbacks must not update another account's page.
- [ ] Test OTP paste/autofill, invalid/expired code feedback, resend cooldown and change-email behavior; preserve existing cancellation semantics.
- [ ] Run targeted tests; observe the new expectations fail.
- [ ] Implement waitlist and privacy screens and isolated routing before SignedIn loads gameplay. Reuse OTP; never store OTP/email lists in local storage. Add a full-beta waitlist link to onboarding while preserving account switching.
- [ ] Run targeted tests and the full unit suite; all pass.

### Task 4: Browser review and handoff

**Files:** Modify `tests/e2e/arc.spec.ts`, `tests/e2e/pwa.spec.ts`, `README.md`, `docs/verification.md`.

**Interfaces:** Existing Supabase HTTP fixtures gain aggregate/waitlist responses; gameplay contracts remain unchanged.

- [ ] Add browser assertions for anonymous landing, login, verified waitlist, signed-in public pages and full-beta recovery; update existing login entry steps for the new landing.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, and companion database tests; report actual outcomes separately.
- [ ] Capture landing, Today, OTP and waitlist at 320/375/768/1440px; inspect long titles/emails, focus order, safe-area padding, reduced motion and error states. Fix defects and rerun affected checks.
- [ ] Present the working local preview and screenshots to the user before committing or publishing. Record what is locally verified versus hosted.

## Self-review

All visual/spec screen requirements map to Tasks 1–3. Each Review Focus condition has tests in Tasks 2–4. API contracts match the companion backend plan; backend security and capacity tests belong there. Social scheduling remains outside both plans.
