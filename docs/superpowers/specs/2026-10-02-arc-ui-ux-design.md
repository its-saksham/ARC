# ARC UI/UX and beta-entry design

Status: visual direction approved in chat; written specification awaiting review.

## Purpose and scope

Help prospective users understand ARC before signing up, and help existing
testers find and complete their next daily quest. The approved direction is a
calm, game-inspired daily quest journal, not a dense RPG dashboard. Preserve
saved progress, OTP sign-in, existing signed-in links, and offline recovery.
Work only in ARC; do not merge PR #1. Social publishing is not part of this work.

The functional requirements in `docs/launch-expansion-design.md` are part of
this specification: 15 total onboarded profiles, authoritative aggregate-only
seat availability, and a private verified-email waitlist. This document adds
the visual and interaction decisions, rather than replacing those safeguards.

## Visual system

- Midnight background `#0B0D10`, raised navy surface `#141D2A`, and boundary
  `#35465D`; icy-blue action `#B8D4F2` with midnight text.
- Primary text `#F0F4FA`, secondary text `#B4C2D3`, success `#B3D6CC`, and
  error `#F0ADB1`. Validate contrast on actual surfaces; colors alone must
  never identify success, errors, or completion.
- Use the existing system sans-serif stack without remote font dependencies.
  Body text is 16px minimum; secondary actionable information 14px minimum.
  Headlines use a restrained responsive scale and sentence case.
- Use 8/16/24/32/48px spacing, left-aligned text, and readable line lengths.
  Marketing content may widen on desktop; gameplay remains a focused column.
- Plain SVG navigation icons with visible labels. No decorative numbers,
  flashing scarcity, autoplay, gratuitous gradients, or repetitive animations.

## Screens and hierarchy

Anonymous `/` and `/discover`: clear product promise, a labelled illustrative
quest preview, one primary beta action, and availability beside that action.
Follow with the actual three-step process, five attributes, beta explanation,
FAQ, privacy, and supplied social links. No fictional testimonials or metrics.
Signed-in `/` remains Today; signed-in `/discover` remains accessible.

Today: date and concise heading, then the three quests as the dominant
actionable content. Show completion count and a labelled progress bar. Rank,
level, XP, and streak remain visible but secondary. Completed quests have
both a textual completed state and a visual marker.

Quest: predictable Back to Today control, readable practice instructions,
reward, and one primary completion button. Preserve busy, completed, pending,
retry, offline, and expired-session behavior without duplicate submissions.

Status: retain the attribute radar and numerical values, with legible labels
and no implication that attributes are medical measurements. Profile keeps
account details, progress explanation, and a reachable sign-out control.

Login: explicit email and six-digit code labels, paste/autofill support, clear
destination and resend cooldown, change-email action, and actionable errors.
Onboarding keeps the focus choices and account switching. A full beta routes
the user to the waitlist, without discarding existing sign-out behavior.

Waitlist: explain that it does not reserve a beta spot. Verify email through
OTP, then save only that authenticated user's entry. Confirm success only
after persistence; show retry, duplicate, leave, and leave-failure states.
Signed-in visitors bypass OTP, not the explicit join action. Prevent the
waitlist route from automatically starting gameplay onboarding.

## Availability and privacy

Share one server-side capacity source between onboarding and the aggregate
availability endpoint. Refresh availability on entry, every 30 seconds while
visible, focus, and reconnect. Clear the numeric claim on failure or offline;
show a neutral message and retry. At zero, the beta CTA becomes Join waitlist.
No individual profile or email data is exposed, and no service-role key ships
to the browser. Preserve the private waitlist/RPC identity rules from the
functional specification. Do not promise automated invitation delivery.

## Accessibility and verification

Controls have at least 44px touch targets, visible keyboard focus, persistent
labels, and clear disabled/busy feedback. OTP errors are announced without
announcing a seat counter every refresh. Respect reduced motion and safe-area
insets; fixed navigation must not obscure content or focused controls.

Verify at 320/375/768/1440px, including long email addresses and quest titles.
Test keyboard navigation, OTP failure/resend/change email, new and returning
users, waitlist join/leave and account switching, availability loading/full/
failure/offline states, and existing completion recovery. Run typecheck, lint,
unit tests, build, database boundary/privacy/concurrency tests, and relevant
browser tests. Hosted changes require successful local checks and ARC-only
target verification. Report separately what is implemented, tested, and live.
