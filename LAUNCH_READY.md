# Launch Readiness — 2026-04-23

**Agent:** E (Release-Manager / P1-Reviewer)
**Scope:** Auftrag 5 — Final-Verify + README + Cleanup + GO/NO-GO.

---

## Audit-Summary

Source: `QA_AUDIT.md` Defekt-Liste (final state after Aufträge 1–4, plus Agent E Phase 1 verification).

| Severity | Total | Fixed | Open (non-blocking) | Open (blocking) |
|---|---|---|---|---|
| **P0** | 18 | 18 | 0 | **0** |
| **P1** | 15 | 14 | 1 (LoginForm close — formal-only in embedded context) | 0 |
| **P2** | 9 | 3 | 6 (polish / post-launch) | 0 |

**Zero launch-blocking defects open.**

### P0 closure trail

| # | Defekt | Resolution |
|---|---|---|
| 1, 9, 10, 15–18 | Bid-Flow composite (Tabelle 5) | Rebuilt in Auftrag 3 — Server-Component `/bid` + `BidComposer` single-screen. Auth-Gate server-side (307 redirect), `/api/auth/session` shipped, LayoutPicker/ColorPicker retired from flow (Pan/Zoom replaces them). |
| 2, 11 | Stripe locale hardcoded | `681260e` — `resolveLocale()` in `create-session` + `getLocale()` in `actions/bid.ts`. |
| 3 | Same as 2 | dup. |
| 4 | `/api/auth/session` missing | Auftrag 3 — `src/app/api/auth/session/route.ts`. |
| 5, 12 | Webhook idempotency | `468cadd` — skip on any `status !== 'pending'`. |
| 6 | ReportDialog crash | `a7a38d40` — auth-gated + 401-UX. |
| 7 | `/legal/imprint` TODO leak | `b5420821` — env-driven via `config.legal`. |
| 8 | `/legal/terms` + `/legal/privacy` TODO leak | `572243ce`. |
| 13 | Webhook metadata unchecked | `e435c9c` — Zod schema. |
| 14 | `/api/auth/ensure-admin` bootstrap exploit | `7b709c6` — gated behind `ADMIN_BOOTSTRAP_EMAIL`. |

### P1 non-blocking carry

- **LoginForm close** (Tabelle 2): the form is embedded in the `/login` page (not a dialog). No modal-close needed in that context. Aesthetically consistent. Deferred.

### P2 carry (post-launch polish)

1. `/legal/contact` — add `generateMetadata`.
2. `OnboardingStep.tsx:12` — last `text-muted-foreground` → term-aesthetic.
3. Translation completeness audit across EN/DE/FR/ES.
4. Systematic loading-state pass.
5. Admin sidebar mobile drawer.
6. `/legal/*` mobile styling (`prose` ↔ `term-bg`).

---

## Journey Results

> **Methodology note:** runtime-dependent steps (Magic-Link email delivery, Stripe Test-Card checkout, Supabase Realtime, authenticated browser flows) cannot be executed by a code-only agent. Each journey below is split into **code-verified** (static walk of server-side + client-side code paths, type-check, curl-probes for unauthenticated surfaces) and **user-to-verify at runtime**. This is the honest readout — claiming a ✅ on a flow I cannot actually exercise would be false.

| # | Journey | Code-verified | Runtime (user) | Notes |
|---|---------|---------------|----------------|-------|
| 1 | Onboarding | ✅ | pending | `OnboardingModal.tsx` renders 5 steps, `[esc]` + click-outside, `useOnboarding` auto-opens on first visit. HowItWorksButton fires `onClick()` into `LayoutClient`. |
| 2 | Login via Magic Link | ✅ | pending | `LoginForm.signInWithOtp` → Supabase. Callback in `/auth/callback` sets session cookie. Middleware refreshes via `updateSession`. `/dashboard` is server-auth-gated. |
| 3 | Bid Happy-Path | ✅ (code-path) | pending | `/bid` server-redirects unauth (curl 307 verified in Auftrag 3). `BidComposer` single-screen. `createBidCheckoutSession` → Stripe URL. Webhook → `process_bid` RPC → Realtime INSERT. Stripe test-card end-to-end is user-to-run. |
| 4 | Displacement | ✅ (RPC) | pending | `supabase/migrations/008_update_process_bid_function.sql:89-195` — `FOR UPDATE` lock + race-check + 90/10 refund-split + slot_history close. `processRefunds()` invoked from webhook queue. Runtime verification = 2 simultaneous Stripe checkouts on same slot with different amounts. |
| 5 | Report-Flow | ✅ | pending | `ReportDialog` (term-aesthetic, auth-gated) → `POST /api/reports` (Zod + rate-limit 5/h + slot-existence-check). curl no-auth → 401 verified in Auftrag 3. Authenticated submit → DB row in `reports` is user-to-verify. |
| 6 | Admin-Moderation | ✅ (APIs) | pending | `/admin/*` layout-gated by `requireAdmin()`. `dismiss`/`remove-no-refund`/`remove-with-refund` all use `checkAdminAuth()` → 404 on non-admin (no route-existence leak). `remove-with-refund` now chains `processRefunds()` (Auftrag 4). `transactions/export` RFC-4180 CSV. `toggle-admin` has self-demote guard. |

### Static-verification detail per journey

- **Journey 1** — `OnboardingModal.tsx` 156 lines; dialog from Radix via shadcn wrapper; `[esc]` button guarded by `!isLoading`; footer hardcode removed (v1 static text); `useOnboarding` in `@/hooks/useOnboarding`.
- **Journey 2** — `LoginForm.tsx` uses `createBrowserClient().auth.signInWithOtp`. Redirect URL inspects `searchParams.redirect` to round-trip `/bid`-style targets. `UserMenu` + `LogoutButton` wired via `signOut()`.
- **Journey 3** — `/bid/page.tsx` is a Server-Component: `redirect(…/login?redirect=…)` on missing user (307). `BidComposer` validates `bid % 5 === 0`, `bid >= minBid`, `https://` on link, non-empty display_name. `actions/bid.ts` Zod-validates and creates Stripe Checkout with full metadata payload. `/bid/success/page.tsx` calls `/api/auth/session` to render email line (returns `{user:null}` on anon — no 401).
- **Journey 4** — Migration `008_update_process_bid_function.sql` lines 89–195: `LOCK` → race-check → refund-insert (90%/10% split) → slot UPDATE → `slot_history` close + new row. Webhook handler `route.ts:72-160` parses Zod-validated metadata, skips on non-pending status, invokes RPC atomically.
- **Journey 5** — `/api/reports/route.ts` enforces auth (returns 401), Zod schema, rate-limit (5/h), slot-existence check. Client dialog pre-flight checks `auth.getUser()` before showing form (renders login prompt otherwise).
- **Journey 6** — All eight admin routes grep as `checkAdminAuth() → return 404`. `/api/admin/users/route.ts:27-45` N+1 eliminated (single transactions SELECT + Map aggregation). `toggle-admin/route.ts:25-42` prevents self-demote.

---

## Open Issues (non-blocking)

1. **LoginForm close mechanism** (P1) — formal-only; the form is embedded on `/login`, not a modal. No UX impact.
2. **`/legal/contact` generateMetadata** (P2) — add later; current page still renders and is indexable via parent layout metadata.
3. **`OnboardingStep.tsx:12` text-muted-foreground** (P2) — last shadcn token in onboarding body; cosmetic.
4. **Translation completeness audit** (P2) — EN/DE/FR/ES parity sweep. New `bid.form.cropHint` + `meta.bidCancel.*` added in Auftrag 4; full diff not automated.
5. **Systematic loading-state pass** (P2) — individual flows already have spinners; no systematic audit.
6. **Admin sidebar mobile drawer** (P2) — desktop-first; admin UX on < lg is usable but not optimized.
7. **`/legal/*` mobile prose styling** (P2) — mix of `prose` and `term-bg` — visual only.

None of the above blocks launch.

---

## Go / No-Go

- [x] All P0 items closed (18 / 18)
- [x] All 6 journeys code-verified; runtime passes are user-to-run per Manual Smoke Test (`README.md`)
- [x] README updated — Production Notice + Critical Invariants + Manual Smoke Test + Deployment section
- [x] Smoke test documented (README)
- [x] No Review-Failures open (`REVIEW_FAILURES.md` 0 open after Auftrag 4)
- [x] Backup files cleaned (`bid/page 2.tsx`, `bid/page-old-backup.tsx`, `admin/page 2.tsx` deleted)
- [x] `tsc --noEmit` clean after all Agent E edits
- [x] No agent-authored git commits

**Recommendation:** **GO — conditional on the Manual Smoke Test passing end-to-end in the user's browser with a real Stripe Test-Card and Supabase Magic Link.**

Rationale: every launch-blocker is closed at the code/SQL layer. The remaining verification is the set of steps a code-only agent cannot perform (Magic-Link email delivery, Stripe Checkout redirect+webhook round-trip, real-time Supabase subscription, admin moderation in a logged-in session). The README now gates deploys behind this smoke test explicitly.

If any smoke-test step fails: do not deploy. Re-open the audit.

---

## Sign-off

Agent E — 2026-04-23

Stichprobe (Phase 1): ReportDialog, ImagePositioner aesthetic, `/api/admin/users` N+1, `/api/admin/process-refunds`, `/api/admin/reports/remove-with-refund`, `/api/og` UUID-validation, `/bid/cancel/layout.tsx`, Seed-Zoom + Seed-Minimap math, 7-dialog aesthetic grep. Result: 0 new failures.
