# ARC launch expansion — design for review

Status: proposed; application and hosted database have not changed.

## User request

Expand ARC from five to 15 beta testers, add a product landing page and a separate beta waitlist page, and increase marketing frequency on Reddit u/Antique_Ad1158 and X @Saksham52413336. Keep all work within ARC and keep PR #1 unmerged.

## Work streams

1. Beta capacity: independently deployable additive migration and boundary tests.
2. Product landing page plus verified-email waitlist: public UI, authenticated persistence, and integration checks.
3. Marketing: revise local campaign now; account connection and supported recurring publishing remain separate from implementation.

## Beta capacity

Raise total onboarded profiles from 5 to 15, including the founder's existing profile. Existing profiles, progression, catalog and sessions remain unchanged. Add a new migration replacing only private.save_onboarding's capacity constant and full-beta message, while preserving its advisory lock, validation, retry semantics, grants and empty search_path. Do not edit the already-applied original migration.

Verify the 15th profile succeeds, the 16th fails, existing-user onboarding retries still succeed at capacity, and concurrent onboarding cannot exceed 15. Update relevant fixtures and documentation. Apply only to ARC's project sibufkhplnvwjtjdkmsb after checks; deployment does not require merging PR #1.

## Product landing page

Anonymous visitors to / see a mobile-first marketing page in ARC's existing dark blue visual style. Existing signed-in users retain their Today screen at /, so their saved links continue to work. /discover exposes the product page to signed-in visitors as well. /login exposes the existing email-code form for new and returning users.

Sections:

- Header: ARC, How it works, Join waitlist, Sign in.
- Hero: "Turn self-improvement into three daily quests." Supporting text: "Small actions. XP, levels and streaks. A clearer next step for your day."
- Primary CTA: Start free beta, leading to /login. Secondary CTA: Join waitlist, leading to /waitlist.
- Illustrative quest preview, clearly labelled as an example rather than a real user's data.
- Three-step explanation: choose your focus, do a daily quest, see your progress.
- Five attributes: Strength, Intelligence, Vitality, Charisma, Perception.
- Beta section: free, 15 total testers, with the database-backed seat counter specified below; no invented vacancy count or testimonials.
- FAQ: what ARC does, browser installation, beta limits and data collected.
- Footer: privacy information and social profile links supplied by the user.

Metadata uses the canonical public domain https://www.tryarc.co.in and an ARC description suitable for social sharing. The page never claims payments, an App Store listing, personalized AI-generated quests or proven health outcomes. "New customers" means prospective users in this free beta; do not add pricing or payments.

If onboarding fails because the beta is full, show a specific explanation and a working Join waitlist link. Preserve the current sign-out and change-account behavior.

## Live beta seat counter

User addition: show a real seat counter on tryarc.co.in and use actual availability in recruitment posts. "9 of 15 left" is illustrative, not a claimed current count.

Display "{remaining} of {capacity} beta spots left" beside the primary landing-page CTA. Count only onboarded public.profiles rows, including the founder. Accounts that only requested an OTP, waitlist entries and website visits do not occupy a spot. The counter reserves no space; onboarding's database lock remains the authority for admission.

Provide a narrow public read-only aggregate endpoint returning capacity, remaining and checked_at. Its capacity must come from the same server-side configuration used by onboarding, so a page cannot advertise 15 while admission still stops at five. No email, user ID, profile data or individual joining timestamps are returned. Preserve RLS and direct-access restrictions on profiles; anonymous visitors receive only the aggregate availability result. Do not count profiles directly in the browser or expose a service-role key. Review and test any intentional public aggregate function privileges.

Fetch when the page opens, refresh every 30 seconds while visible, and refresh on window focus or reconnection. Do not cache API data in the service worker. Show a neutral loading state. On errors or while offline, replace the numeric claim with "Availability temporarily unavailable" and offer retry; no made-up initial number or stale-looking live claim. Respect the operating system's reduced-motion preference; no countdown, pulsing urgency or forced announcement on every refresh.

At zero remaining, show "Beta is full — join the waitlist" and route the recruitment CTA to /waitlist. Existing beta users retain Sign in. If remaining capacity changes between viewing and onboarding, explain the full state and offer the same waitlist link. The primary marketing page remains informative when availability cannot load.

Verify zero, one, 14 and 15 occupied seats, aggregate-only anonymous access, network failure, offline behavior, refresh behavior and a concurrent race for the last seat. Read the live endpoint after deploying the capacity change before quoting a count publicly.

## Waitlist page and persistence

/waitlist explains that joining expresses interest in a future beta space, does not reserve a current space, and does not start onboarding. Request an email, explain that it will be used for beta access updates, and verify ownership through the existing Supabase six-digit OTP flow. Show success only after the database has saved the entry. Existing signed-in users do not need another OTP.

Use a private.waitlist_entries table with user_id as its primary key, created_at, and an allowlisted optional source (direct, reddit, x). Email remains in Supabase auth.users rather than a public-readable duplicate email table. Repeated submissions return the same entry and preserve its initial timestamp. Add a leave-waitlist action that removes only that user's entry.

RLS is enabled; clients have no direct table access. Exposed authenticated-only security-invoker RPC wrappers call narrow private implementations following ARC's existing pattern. Implementations derive identity from auth.uid(), verify the auth user and confirmed email, have empty search_path, and accept no client-supplied user ID or email. Anonymous submissions and cross-user access fail. No list or count of waitlist identities is publicly available.

The waitlist does not consume a beta profile slot and does not grant admission or send invitations automatically. The founder can review aggregate interest through management access. This phase does not add a mail campaign engine or promise that scheduled invitation emails already exist.

Render explicit loading, error, retry, duplicate and saved states. Do not persist OTPs or email lists in browser storage or log personal data. Use source information only for aggregate campaign attribution; do not collect referring usernames. A short public privacy page explains the verified-email waitlist and contact routes without inventing an organization, legal address or retention guarantee.

## Marketing cadence

Pilot duration: seven days once publishing access is available.

X: three distinct original posts per day, provisionally 10:00, 15:00 and 19:30 IST. Rotate a practical quest-sized tip, a real product/build observation, and a question or invitation. At most one direct beta invitation per day; adapt after day-three results. Timing is a starting hypothesis. More posting does not establish authenticity or guarantee reach.

Use the live seat counter in the daily recruitment post, read immediately before publication and logged with its checked_at time. Example only: "ARC beta: 9 of 15 spots left as of this evening. Three daily quests with XP and levels. Explore it at https://www.tryarc.co.in". Publish the actual number, not this example. If availability is unchanged, it is unchanged: do not invent signups, imply a drop or repeatedly resend nearly identical scarcity posts. Vary the substantive product information and respond to genuine questions; changing only a digit does not make duplicate promotions useful or compliant. When full, use the real waitlist link. Availability at posting time is a snapshot, not a promise that a place is reserved.

Reddit: daily review and relevant participation; original promotional posts only where current community rules permit, at most two during the first week. Use other days for substantive responses and follow-ups, not repeated promotions. Publicly disclose product ownership. No unsolicited bulk DMs, account farming, fabricated testimonials or artificial engagement. X automated replies are outside this campaign.

Track publication URLs, reach where available, useful replies, landing visits where measured, verified waitlist entries, onboarded testers and return use. Missing metrics remain unknown. Record source attribution only where actually supported. Review on days three and seven.

No publishing or recurring jobs are currently configured. Account handles alone do not provide access. X publishing needs its API or an approved scheduler; an unattended browser-script campaign is not the publishing plan. No scheduler purchase or persistent access grant is assumed.

## Verification and release

Preserve OTP sign-in, cancellation on logout, existing Today/status/profile routing, account switching, service-worker updates and pending-completion recovery. Test mobile keyboard navigation, form labels, visible focus and reduced-motion behavior. Run typecheck, lint, unit tests, production build, disposable-database integration tests and relevant browser flows. Verify hosted RPC grants and advisors and the new capacity function after migration.

Publish application changes through feat/arc-v1 only after checks and confirm live landing, waitlist persistence and existing gameplay. PR #1 stays unmerged. Social publication remains contingent on connected accounts and a working scheduler/API.

## Decision to review

Recommended waitlist is verified-email, reusing OTP. This adds one verification step but avoids a new anonymous email collection endpoint and additional email infrastructure. Product routing preserves the existing signed-in homepage. The capacity is 15 total profiles, not 15 additional profiles. Implementation starts after this design is reviewed under the current brainstorming workflow.
