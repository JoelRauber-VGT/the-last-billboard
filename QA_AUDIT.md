# QA Audit — The Last Billboard

Erstellt: 2026-04-23
Agent: A (Auditor)
Methode: Statische Code-Analyse (kein Browser-Lauf, keine Live-Tests). Hinweise zur Verifikation sind im Defect-Feld vermerkt, wo ohne Runtime keine 100%-Aussage möglich ist.

---

## Zusammenfassung

| Bereich | Getestet | Status |
|---|---|---|
| Routes | 17 / 17 | ✅ Alle abgedeckt |
| Dialoge & Modals | 7 / 7 | ✅ Alle abgedeckt |
| Interaktive Controls | 12 Komponenten / 42 Elemente | ✅ Alle abgedeckt |
| Billboard-Interaktionen | 17 / 17 | ✅ Alle abgedeckt |
| Bid-Flow Steps | 23 / 23 | ✅ Alle abgedeckt |
| Admin-Flows | 5 Pages + 13 APIs | ✅ Alle abgedeckt |
| API-Endpoints (public) | 7 / 7 | ✅ Alle abgedeckt |

**Defekt-Zählung:**

- **P0** (Launch-Blocker): **18**
- **P1** (wichtig): **15**
- **P2** (Polish/Cleanup): **9**

**Seed-Defekte verifiziert:**
1. Billboard-Zoom (falscher Anker) — Agent B (Review 2026-04-23): **nicht bestätigt** — Button-Zoom hält visible-viewport-center fix (Expected-Behavior)
2. Minimap-Sync — Agent B (Review 2026-04-23): **nicht bestätigt** — Forward/Backward-Math sind konsistent
3. ReportDialog Fehler beim Absenden — ✅ in Tabelle 2 / P0 (runtime-Ursache pending — siehe Fix in Auftrag 2)
4. LayoutPicker/Bid-Dialog UX — ✅ in Tabelle 5 / P0 (komplett-Rebuild Auftrag 3)

---

## Tabelle 1 — Routes

Getestet mit Locale-Prefix `/[locale]` (en, de, fr, es). Statische Analyse: Auth-Gates, Server/Client-Pattern, Translation-Keys, Responsive-Klassen.

| Route | Status | Priority | Defect | Fix-Hint | File-Path |
|---|---|---|---|---|---|
| `/` | ✅ works | P0 | – | – | `src/app/[locale]/page.tsx` |
| `/about` | ✅ works | P1 | – | – | `src/app/[locale]/about/page.tsx` |
| `/login` | ✅ works | P0 | – | Server-side Auth-Redirect bei eingeloggten Usern korrekt | `src/app/[locale]/login/page.tsx` |
| `/dashboard` | ✅ works | P0 | – | Server-side Auth-Gate vorhanden | `src/app/[locale]/dashboard/page.tsx` |
| `/settings` | ✅ works | P1 | – | Server-side Auth-Gate vorhanden | `src/app/[locale]/settings/page.tsx` |
| `/bid` | ✅ works | P0 | Fixed-In-Auftrag 3: Server-Component mit Auth-Gate (`createServerClient` + `redirect()`); Single-Screen-Composer ersetzt Wizard. curl no-auth → 307 → `/en/login?redirect=/bid`. | – | `src/app/[locale]/bid/page.tsx`, `src/components/bid/BidComposer.tsx` |
| `/bid/success` | ✅ works | P0 | Fixed-In-Auftrag 3: `/api/auth/session` existiert jetzt (GET → `{user:{id,email}|null}`, advisorisch). Locale-Fix siehe Agent B Commit 681226e. Transactional-Email bleibt P2. | – | `src/app/[locale]/bid/success/page.tsx`, `src/app/api/auth/session/route.ts` |
| `/bid/cancel` | ✅ works | P1 | Fixed-In-Auftrag 4: neue `src/app/[locale]/bid/cancel/layout.tsx` mit `generateMetadata` (locale-aware title/description aus `meta.bidCancel`, `robots: noindex`). Page selbst auf term-Aesthetic migriert (bracket-Buttons, `bg-term-surface`, kein Shadcn-Card mehr). | – | `src/app/[locale]/bid/cancel/layout.tsx`, `src/app/[locale]/bid/cancel/page.tsx` |
| `/admin` | ✅ works | P0 | – | `requireAdmin()` im Layout aktiv | `src/app/[locale]/admin/page.tsx` |
| `/admin/reports` | ✅ works | P0 | – | Layout-Gate schützt Subseite | `src/app/[locale]/admin/reports/page.tsx` |
| `/admin/slots` | ✅ works | P1 | – | – | `src/app/[locale]/admin/slots/page.tsx` |
| `/admin/transactions` | ✅ works | P1 | – | – | `src/app/[locale]/admin/transactions/page.tsx` |
| `/admin/users` | ✅ works | P1 | Fixed-In-Auftrag 4 (API-seitig): N+1 entfernt — ein einziger `transactions`-SELECT über alle User, JS-Map-Aggregation. UI unverändert. | – | `src/app/[locale]/admin/users/page.tsx`, `src/app/api/admin/users/route.ts` |
| `/legal/terms` | ✅ works | P0 | Fixed-In-Commit 572243ce: Email aus `config.legal.legalEmail` (LEGAL_EMAIL/LEGAL_CONTACT_EMAIL); Jurisdiktion via LEGAL_GOVERNING_LAW; TODO-Prefixes aus Übersetzungen entfernt. **Reviewed-By-C (2026-04-23): ✅** — page rendert 200, Code liest `config.legal.legalEmail` + `governingLawJurisdiction` mit korrekten Fallback-Zweigen (pending-Notice bei leerer env). | – | `src/app/[locale]/legal/terms/page.tsx` |
| `/legal/privacy` | ✅ works | P0 | Fixed-In-Commit 572243ce: Email aus `config.legal.privacyEmail` (LEGAL_PRIVACY_EMAIL/LEGAL_CONTACT_EMAIL); TODO-Prefixes aus Übersetzungen entfernt. **Reviewed-By-C (2026-04-23): ✅** — page rendert 200, config-Fallback korrekt. | – | `src/app/[locale]/legal/privacy/page.tsx` |
| `/legal/imprint` | ✅ works | P0 | Fixed-In-Commit b5420821: env-driven operator data via `config.legal` (`LEGAL_OPERATOR_*`). TODO-Strings aus EN/DE/FR/ES-Translations entfernt. Pflichtangaben müssen vor Launch via env gesetzt werden. **Reviewed-By-C (2026-04-23): ✅** — page rendert 200, `hasOperator`-Fallback zeigt strukturierte Pending-Checkliste statt TODO-Literal. | – | `src/app/[locale]/legal/imprint/page.tsx` |
| `/legal/contact` | ✅ works | P2 | Kein generateMetadata | Optional ergänzen | `src/app/[locale]/legal/contact/page.tsx` |

**Backup-Dateien (P2 Cleanup, nicht löschen in diesem Auftrag — nur vermerken):**

- `src/app/[locale]/bid/page 2.tsx` — alte Bid-Page-Version
- `src/app/[locale]/bid/page-old-backup.tsx` — alte Bid-Page mit ColorPicker
- `src/app/[locale]/admin/page 2.tsx` — alte Admin-Page

**i18n / Middleware (geprüft, OK):**

- `src/i18n/routing.ts` — Locales: `en, de, fr, es`; default `en`; prefix `always`
- `src/middleware.ts` — Chained Supabase-Session-Update + next-intl; Matcher schliesst `/api`, `/_next`, `/_vercel`, statische Assets korrekt aus

---

## Tabelle 2 — Dialoge & Modals

Aesthetic-Check: Space Mono (`font-mono`), schwarzer Hintergrund, blue accent `#60a5fa`, bracket-style `[text]`.

| Komponente | Öffnet | Schliesst | Submit | Error-State | Aesthetic-konform | Defect | File-Path |
|---|---|---|---|---|---|---|---|
| **AuthOverlay** | ✅ controlled (`isOpen`) | ✅ ESC, Click-Outside, `[esc]`-Button (guarded by `!isLoading`) | ✅ `signInWithOtp`, Loading-State, Error-Handling | ✅ inline `text-term-danger` | ✅ Space Mono, `bg-term-surface`, `text-term-accent`, `[esc]` | – | `src/components/auth/AuthOverlay.tsx` |
| **LoginForm** | ✅ controlled, embedded | ⚠️ kein expliziter Close (Form-only) | ✅ `signInWithOtp`, Error-Handling, Loading | ✅ inline `text-term-danger` | ✅ Space Mono, `> [send link]` bracket-style | – | `src/components/auth/LoginForm.tsx` |
| **ReportDialog** | ✅ controlled (`open`/`onOpenChange`) | ✅ ESC, Click-Outside, `[esc]`/`[cancel]`-Buttons | ✅ Fixed-In-Commit a7a38d40 | ✅ `> error:`-Zeile (term) | ✅ Fixed-In-Auftrag 4: term-Aesthetic (`$ report`-Header, `[esc]`, `[cancel]`/`[submit]`-Buttons, bracket-Labels, native `<select>`/`<textarea>` mit `border-term-border-light`, `focus:border-term-accent`) | Fixed-In-Commit a7a38d40 (P0 Auth-Gate). Fixed-In-Auftrag 4 (P1 Aesthetic): komplett-Refactor — Material/shadcn-Tokens durch term-Aesthetic ersetzt, gleiche Close-Konvention wie AuthOverlay (`[esc]`). Funktionalität (Auth-Check, Zod-Validation, 401/429-Mapping, Toast-Success) unverändert. | `src/components/billboard/ReportDialog.tsx`, `src/app/api/reports/route.ts` |
| **SlotDetailModal** | ✅ controlled (`open`/`onOpenChange`) | ✅ Close-Button ×, Click-Outside | n/a (read-only + Outbid-Link) | n/a | ✅ Space Mono, `#0a0a0a` bg, `#60a5fa` accent, `[ visit ↗ ]` / `[ OUTBID THIS SLOT ]` | – | `src/components/billboard/SlotDetailModal.tsx` |
| **OnboardingModal** | ✅ controlled (`isOpen`/`onClose`) | ✅ ESC, Click-Outside, `[esc]`-Button | n/a | n/a | ✅ Space Mono, `bg-[#1a1a1a]`, `#60a5fa` accent, bracket-style | Fixed-In-Auftrag 4: Footer `last updated 142d ago` durch statisches `the last billboard · v1` ersetzt (line 148-150). | `src/components/onboarding/OnboardingModal.tsx` |
| **SettingsForm** | n/a (eingebettetes Form) | n/a | ✅ Supabase `.update()` profile, Error-Handling, Loading, Success-Inline | ✅ `> error:` / `> success`-Inline (term-Aesthetic) | ✅ Fixed-In-Auftrag 4: bracket-Labels `[email]`/`[display_name]`, `[save]`-Button, `focus:border-term-accent` statt `#60a5fa` literal; native Button statt shadcn-`Button`. | – | `src/components/settings/SettingsForm.tsx` |
| **Bid-Dialog (Wizard)** | ✅ Multi-Step `currentStep` | ✅ Browser-Back, Step-Back-Button | ✅ `createBidCheckoutSession()` Server-Action, Error-Handling, Toast | ✅ Alert (destructive) + Toast | ✅ font-mono, `text-primary`, bracket-style `[confirm bid →]` | ❌ **gesamter Flow wird in Auftrag 3 rebuilt** — siehe Tabelle 5. Hauptdefekte: LayoutPicker nicht eingebunden, ColorPicker nicht eingebunden, sequenzielle Schritte mit Scrolling, kein Pan/Zoom im Live-Preview während Konfiguration | → Rebuild in Auftrag 3 | `src/app/[locale]/bid/page.tsx`, `src/components/bid/*` |

---

## Tabelle 3 — Interaktive Controls

| Component | Element | Action | Status | Defect | File-Path |
|---|---|---|---|---|---|
| **Header** | Logo-Link | → `/` | ✅ | – | `src/components/nav/Header.tsx:22-24` |
| Header | About-Link | → `/about` | ✅ | – | `src/components/nav/Header.tsx:30-31` |
| Header | Rules-Button | öffnet OnboardingModal via `onOpenRules` | ✅ | – | `src/components/nav/Header.tsx:35-40` |
| Header | Admin-Link (cond. isAdmin) | → `/admin` | ✅ | – | `src/components/nav/Header.tsx:48-50` |
| Header | Bid-Link (blue accent) | → `/bid` | ✅ | – | `src/components/nav/Header.tsx:53-54` |
| Header | Sign-In Button | öffnet AuthOverlay oder → `/login` | ✅ | – | `src/components/nav/Header.tsx:60-69` |
| **HeaderWrapper** | (server) | fetched user/isAdmin, props an Header | ✅ | – | `src/components/nav/HeaderWrapper.tsx` |
| **Footer** | Terms-Link | → `/legal/terms` | ✅ | – | `src/components/nav/Footer.tsx:36-37` |
| Footer | Contact-Link | → `/legal/contact` | ✅ | – | `src/components/nav/Footer.tsx:39-40` |
| Footer | LanguageSwitcher (minimal) | switch locale | ✅ | – | `src/components/nav/Footer.tsx:23` |
| **MobileNav** | Trigger-Button | öffnet Sheet | ✅ | – | `src/components/nav/MobileNav.tsx:31-33` |
| MobileNav | About-Link | → `/about` + close drawer | ✅ | – | `src/components/nav/MobileNav.tsx:40-45` |
| MobileNav | Dashboard-Link (cond. user) | → `/dashboard` | ✅ | – | `src/components/nav/MobileNav.tsx:48-54` |
| MobileNav | Admin-Link (cond. isAdmin) | → `/admin` | ✅ | – | `src/components/nav/MobileNav.tsx:57-63` |
| MobileNav | LanguageSwitcher | switch locale | ✅ | – | `src/components/nav/MobileNav.tsx:69` |
| MobileNav | Place-Bid-Button | → `/bid` | ✅ | – | `src/components/nav/MobileNav.tsx:74-77` |
| MobileNav | Logout-Button | siehe LogoutButton | ✅ | – | `src/components/nav/MobileNav.tsx:79` |
| MobileNav | Login-Button | → `/login` | ✅ | – | `src/components/nav/MobileNav.tsx:82-84` |
| **UserMenu** | Trigger | öffnet DropdownMenu | ✅ | – | `src/components/nav/UserMenu.tsx:48-52` |
| UserMenu | My-Bids-Item | → `/dashboard` | ✅ | – | `src/components/nav/UserMenu.tsx:66-70` |
| UserMenu | Settings-Item | → `/settings` | ✅ | – | `src/components/nav/UserMenu.tsx:74-78` |
| UserMenu | Logout-Item | `signOut()` + `router.push('/')` | ✅ | – | `src/components/nav/UserMenu.tsx:84-91` |
| **LogoutButton** | Logout | `signOut()` + redirect + refresh | ✅ | – | `src/components/nav/LogoutButton.tsx:30-38` |
| **LanguageSwitcher (full)** | Locale-Buttons | `router.replace(pathname, {locale})` | ✅ | – | `src/components/nav/LanguageSwitcher.tsx:22-24` |
| LanguageSwitcher (minimal) | Locale-Buttons | dito | ✅ | – | `src/components/nav/LanguageSwitcher.tsx:28-45` |
| **CookieBanner** | Accept-Button | `localStorage['cookie-consent']='true'`, hide | ✅ | – | `src/components/legal/CookieBanner.tsx:19-22` |
| CookieBanner | Learn-More-Link | → `/legal/privacy` | ✅ | – | `src/components/legal/CookieBanner.tsx:33-37` |
| **HowItWorksButton** | `[how it works]`-Button | `onClick()` openOnboarding | ✅ | – | `src/components/billboard/HowItWorksButton.tsx:9-14` |
| **ZoomControls** | Zoom-In | `onZoomIn()` (disabled bei zoom ≥ 4.9999) | ⚠️ | Button ruft `zoomBy()` auf — anker-Bug zoomt zu canvas-center statt cursor (siehe Tabelle 4) | `src/components/billboard/ZoomControls.tsx:27` |
| ZoomControls | Zoom-Out | `onZoomOut()` (disabled bei zoom ≤ 1.0001) | ⚠️ | dito Anker-Bug | `src/components/billboard/ZoomControls.tsx:29` |
| ZoomControls | Reset-View | `onReset()` | ✅ | – | `src/components/billboard/ZoomControls.tsx:31` |
| **LayoutClient** | Rules-Modal-Opener | `setRulesOpen(true)` | ✅ | – | `src/components/layout/LayoutClient.tsx:28` |
| LayoutClient | Auth-Modal-Opener | `setAuthOpen(true)` | ✅ | – | `src/components/layout/LayoutClient.tsx:29` |

---

## Tabelle 4 — Billboard-Interaktionen

| Interaktion | Erwartetes Verhalten | Actual | Status | Defect | File-Path |
|---|---|---|---|---|---|
| **Zoom-In (Button)** | Zoom auf 1.25×, fokussiert auf Cursor (oder zumindest sichtbares Zentrum), 200ms Animation | Zoomt 1.25×, Anker = visible-viewport-center (cx/cy = container-size/2). Code hält den Content-Punkt unter dem sichtbaren Zentrum fix (siehe Math-Trace unten). | ✅ | Agent B (Review 2026-04-23): Re-verifiziert. `currentSize` ist die Container-Size (visible viewport), nicht Canvas-Content-Size. `cx = currentSize.width/2` ist der sichtbare Mittelpunkt. `contentX = (panX + cx)/zoom` ist der Content-Punkt unter dem sichtbaren Mittelpunkt; neuer Pan hält diesen Punkt fix. Das entspricht dem erwarteten Verhalten "sichtbares Zentrum". Button-Zoom hat keinen Cursor; Fallback ist korrekt. | `src/hooks/useBillboardViewport.ts:408-422` |
| **Zoom-Out (Button)** | analog | analog: Anker = visible-viewport-center (korrekt) | ✅ | wie oben | `src/hooks/useBillboardViewport.ts:408-422` |
| **Zoom-Reset** | zurück auf 1.0×, pan (0,0) | korrekt (easeOutCubic, 200ms) | ✅ | – | `src/hooks/useBillboardViewport.ts:428` |
| **Zoom Wheel/Trackpad** | Zoom toward cursor | korrekt — cursor-Position bleibt auf gleichem Content-Punkt | ✅ | – | `src/hooks/useBillboardViewport.ts:189-195` |
| **Pan / Drag** | Drag verschiebt Viewport, Momentum nach Release | korrekt (delta-clamping, momentum aus letzten 100ms; nur aktiv bei `zoom > 1.0001`) | ✅ | – | `src/hooks/useBillboardViewport.ts:302-354` |
| **Minimap-Sync (Viewport-Rect)** | Roter Viewport-Rahmen tracked Canvas-Pan/Zoom 1:1 | Rahmen synchron zu Pan/Zoom. | ✅ | Agent B (Review 2026-04-23): Re-verifiziert. Coordinate-Model in `useBillboardViewport.ts:40-46`: `content = container * zoom`, `panX ∈ [0, container*(zoom-1)]`. fracX = panX/(container*zoom) → bei max pan = (zoom-1)/zoom, rect-width 1/zoom, also right-edge = 1.0 ✓. Forward-Drag: dxMm/mmWidth · container · zoom. Full-drag-range = (zoom-1)/zoom · mmWidth, mapped auf container·(zoom-1) ✓. Forward/Backward sind konsistent — die im Audit vorgeschlagene "Korrektur" (Division durch (zoom-1)) würde bei max-pan einen Rect mit fracX=1.0 + width=1/zoom erzeugen (overflow). Audit war falsch. | `src/components/billboard/Minimap.tsx:68-82` |
| **Minimap Drag-Viewport** | Drag des roten Rects → Canvas pant 1:1 | korrekt | ✅ | – | `src/components/billboard/Minimap.tsx:129-131` |
| **Minimap Click-Background** | Klick → Canvas zentriert auf gewählten Punkt, 200ms Anim | korrekt | ✅ | – | `src/components/billboard/Minimap.tsx:88-100` |
| **Slot-Hover → Tooltip** | Tooltip nach 200ms Delay, folgt Cursor, in Viewport geclamped, hide on pan | korrekt (Delay-Timer reset pro Slot, Offset 12/12 mit Clamping) | ✅ | – | `src/components/billboard/SlotTooltip.tsx:74-106` |
| **Slot-Click → SlotDetailModal** | öffnet Modal mit Owner/Bid/History | korrekt; Click nur wenn `!isFrozen && !isPanning`; History wird bei `slot && open` gefetched | ✅ | – | `src/components/billboard/FullscreenBillboard.tsx:38-52`, `src/components/billboard/SlotDetailModal.tsx:70-106` |
| **FreezeBanner conditional** | Render wenn `isBillboardFrozen() === true` | korrekt; ruft `Date.now() >= config.billboardEndsAt.getTime()` | ✅ | – | `src/components/billboard/FreezeBanner.tsx:9` |
| **RealtimeStatus-Indikator** | grün/gelb/grau + Label je Verbindungsstatus | korrekt; Initial-State `connecting`, Updates auf `SUBSCRIBED`/`CLOSED`/`TIMED_OUT` | ✅ | – | `src/components/billboard/RealtimeStatus.tsx:10-24` |
| **StatsBar Total Invested** | Summe `current_bid_eur` über alle Slots, EUR-Format mit k/M-Notation | korrekt | ✅ | – | `src/components/billboard/StatsBar.tsx:16` |
| **StatsBar Active Slots** | Anzahl Slots | korrekt | ✅ | – | `src/components/billboard/StatsBar.tsx:19` |
| **StatsBar Time Remaining** | Countdown von `NEXT_PUBLIC_FREEZE_TIMESTAMP` zu now als `DD:HH:MM:SS` | korrekt; 1s-Interval, stoppt bei Freeze | ✅ | – | `src/components/billboard/StatsBar.tsx:25-57` |
| **LiveTicker** | Top-Liste neuer Bids, Fade-In | korrekt; Realtime INSERT prepend; Limit 20 | ✅ | – | `src/hooks/useLiveTicker.ts:68-88`, `src/components/billboard/LiveTicker.tsx:68-99` |
| **FloatingLiveTicker** | draggable/resizable, Position in localStorage, hidden auf <lg | korrekt (load/save in localStorage; `hidden lg:block`) | ✅ | – | `src/components/billboard/FloatingLiveTicker.tsx:26-67` |
| **Countdown** | `DD:HH:MM:SS`; rot+pulse < 1h; "FROZEN" bei 0; SSR-hydration-safe | korrekt; pausiert wenn Tab hidden | ✅ | – | `src/components/billboard/Countdown.tsx:58-104` |

---

## Tabelle 5 — Bid-Flow End-to-End

> **Alle Einträge dieser Tabelle: Priority `P0` — `→ Rebuild in Auftrag 3`.**
> Die Displacement-Logik (Schritte 16–23) ist **fachlich korrekt** und **muss im Rebuild erhalten bleiben** — nur das UI/UX/Zwang-zum-Scrollen wird neu gebaut.
>
> **Reviewed-By-D (2026-04-23): ✅** — Bid-Flow-Rebuild von Agent C statisch durchgereviewt (Code-Walk durch `BidComposer.tsx`, `ImagePositioner.tsx`, `[locale]/bid/page.tsx`, `[locale]/bid/layout.tsx`; curl-Probes bestätigen 307-Redirect und `/api/auth/session`). Zwei Review-Failures in `REVIEW_FAILURES.md` dokumentiert und gefixt (ImagePositioner-Aesthetic-Migration, `[cancel]`-Link). Zusätzlich wurde der Crop-Hint `bid.form.cropHint` in allen 4 Locales ergänzt und nahe dem `[position]`-Label eingebaut. Cover-Mode im Billboard-Renderer (`BillboardCanvas.tsx:150-165`) geprüft und korrekt — keine Änderung nötig. Browser-Viewport-Matrix (Desktop-no-scroll / Mobile / Pan-Zoom-UX / Stripe-Flow) bleibt vom User zu verifizieren.

| Step | Erwartetes Verhalten | Actual | Status | Defect | File-Path |
|---|---|---|---|---|---|
| **1. Entry `/bid` (unauth)** | AuthOverlay oder Redirect zu `/login` mit Hinweis | Server-side `createServerClient` + `redirect()` vor jedem Render — kein leerer Flash-Screen. | ✅ | Fixed-In-Auftrag: 3. Page ist jetzt Server-Component; unauth → 307 auf `/${locale}/login?redirect=/bid` (mit Outbid-Param-Preservation). curl bestätigt: 307 mit Location-Header. | `src/app/[locale]/bid/page.tsx:44-56` |
| **2. Upload Validierung** | Size ≤ `maxImageSizeMb`, MIME PNG/JPEG/WEBP | Client + Server validieren; Magic-Bytes auf Server | ✅ | – | `src/components/bid/ImageUpload.tsx:34-46`, `src/lib/upload/uploadSlotImage.ts:9-63` |
| **3. Upload Error-Handling** | Toast / inline Error | `BidComposer.handleFile` zeigt Fehler inline (`text-term-danger`) **und** `toast.error`. `ImageUpload.tsx` wird im neuen Flow nicht mehr importiert (bleibt als orphan für späteres Cleanup). | ✅ | Fixed-In-Auftrag: 3. Upload-Validierung (Size/MIME) inline im neuen Composer; kein `alert()` mehr. Alter `ImageUpload.tsx` bleibt auf Platte bis Cleanup. | `src/components/bid/BidComposer.tsx:58-98` |
| **4. Image Upload Supabase** | Upload mit Retry → publicUrl | korrekt; 2 Retries (1s, 2s exp. Backoff) | ✅ | – | `src/lib/upload/uploadSlotImage.ts:45-105` |
| **5. Layout-Picker Step** | 4 Top-Layout-Vorschläge auswählbar | Produkt-Entscheidung: kein Layout-Picker mehr — User positioniert via Pan/Zoom (`ImagePositioner`) und sieht 3 Aspect-Vorschauen. `layout_width/height` bleiben als Dummy-Payload bis DB-Migration die Spalten entfernt. | ✅ | Fixed-In-Auftrag: 3. Pan/Zoom ersetzt Layout-Picker (siehe Zielbild im Brief). `LayoutPicker.tsx` bleibt orphan bis Cleanup in Auftrag 5. | `src/components/bid/BidComposer.tsx:125-128` |
| **6. Top-4-Divisor-Algorithmus** | best-fit, squarish, rotated, extreme | `src/lib/layout.ts` bleibt auf Platte (orphan), wird vom neuen Flow nicht mehr aufgerufen — Pan/Zoom-Crop ersetzt die Divisor-Logik. | ✅ | Fixed-In-Auftrag: 3. Divisor-Algorithmus obsolet durch Pan/Zoom-Entscheidung; keine Code-Änderung in `lib/layout.ts` (nicht mehr importiert). Cleanup in Auftrag 5. | `src/lib/layout.ts` (orphan) |
| **7. Pan/Zoom in Preview** | User kann während Konfiguration zoomen+pannen | `ImagePositioner` rendert zusammen mit Upload/Amount/Pay auf einem Screen. Pan-Drag + Wheel-Zoom + Buttons + Reset; 3 Live-Previews (9:16 / 1:1 / 16:9) daneben. | ✅ | Fixed-In-Auftrag: 3. Logik unverändert (siehe Non-Negotiable im Brief), nur als Child in `BidComposer` eingebettet. | `src/components/bid/BidComposer.tsx:262-275`, `src/components/bid/ImagePositioner.tsx` |
| **8. ColorPicker Step** | User wählt Background-Farbe | Produkt-Entscheidung: kein ColorPicker mehr — Background kommt aus Image (via `object-fit: cover` + Pan/Zoom). `brand_color` als Dummy `#1a1a1a` gesendet bis DB-Migration die Spalte entfernt. | ✅ | Fixed-In-Auftrag: 3. Dummy-Payload unverändert, UI-Exposure entfernt (es gibt kein Farbfeld mehr im Flow). `ColorPicker.tsx` bleibt orphan bis Cleanup. | `src/components/bid/BidComposer.tsx:124` |
| **9. Bid-Betrag Validierung** | Schritte à 5€; min = `ceil((current_bid + 0.01) / 5) * 5` | korrekt clientseitig (`bid % 5 === 0`) und serverseitig (`multipleOf(0.01)`); `step="5"` im Input | ✅ | – | `src/app/[locale]/bid/page.tsx:57,72-75,162`, `src/app/actions/bid.ts:15` |
| **10. Outbid-Modus** | `?outbid=<slot_id>` lädt Slot, prüft `current_owner != user` | korrekt | ✅ | – | `src/app/[locale]/bid/page.tsx:118-145` |
| **11. Stripe Checkout-Session** | Form-Validierung (`display_name ≤ 50`, `link_url https://`, bid-min); Session-Erstellung mit Metadaten | korrekt; `createBidCheckoutSession()` validiert; setzt Metadata `transaction_id, user_id, mode, slot_id, bid_eur, image_url, link_url, display_name, brand_color, layout_width, layout_height, pan_x, pan_y, zoom`; Transaction wird mit `stripe_session_id` aktualisiert | ✅ | Race-Condition-Mitigation bleibt wie gehabt (Webhook-RPC `FOR UPDATE` + Refund — siehe Step 18). Keine Code-Änderung in Auftrag 3, bewusst out-of-scope — Auftrag 3 berührt nur UI. Zod-Metadata-Validierung server-side (Agent B / e435c9c) deckt malformed metadata ab. | `src/app/actions/bid.ts:83-282` |
| **12. Stripe Session Metadata** | enthält alle für Webhook nötigen Felder | korrekt | ✅ | – | `src/app/actions/bid.ts:242-257` |
| **13. Redirect nach `/bid/success`** | `?session_id=…`, locale-aware | `actions/bid.ts` nutzt `getLocale()` aus `next-intl/server`; URLs enthalten korrektes Locale-Segment. | ✅ | Fixed-In-Commit 681226e (Agent B) + Reviewed-By-C. Siehe Tabelle 7 `/api/checkout/create-session` für Details. | `src/app/actions/bid.ts:224,242-243` |
| **14. `/bid/success`** | Confirmation-Card, Links auf billboard + dashboard | `/api/auth/session` liefert jetzt `{ user: { id, email } \| null }`; success-page rendert echte Email wenn eingeloggt. Mail-Service weiterhin nicht angebunden (out of scope). | ✅ | Fixed-In-Auftrag: 3. Neuer GET-Endpoint in `src/app/api/auth/session/route.ts` (advisorisch, kein 401 bei anon — gibt `{user:null}` zurück). curl ohne Cookie → `{"user":null}` bestätigt. Transactional-Email bleibt P1/P2 (siehe Auftrag 4/5). | `src/app/api/auth/session/route.ts`, `src/app/[locale]/bid/success/page.tsx:15-29` |
| **15. `/bid/cancel`** | Cancellation-Notice, Try-Again + Back-Links | korrekt (XCircle, Locale-aware Links, Support-Mail) | ✅ | – | `src/app/[locale]/bid/cancel/page.tsx:1-71` |
| **16. Webhook `checkout.session.completed`** | Signatur prüfen, idempotent, RPC `process_bid` aufrufen | korrekt: `STRIPE_WEBHOOK_SECRET`-Check, Idempotenz-Check (Skip wenn bereits `completed`), atomarer RPC-Aufruf, Refund bei Race-Condition, `processRefunds()` enqueued | ⚠️ | Idempotenz nur auf `status === 'completed'` — wenn 1. Aufruf nach Metadata-Parse aber vor RPC abbricht (transaction bleibt `pending`), 2. Aufruf skipped silently → bid steckt fest. Sollte `status IN ('completed','processing')` o.ä. nutzen | `src/app/api/webhooks/stripe/route.ts:72-160` |
| **17. RPC `process_bid` (new slot)** | Insert in `slots` + initialer `slot_history` | korrekt, atomic | ✅ | – | `supabase/migrations/008_update_process_bid_function.sql:34-87` |
| **18. RPC `process_bid` (outbid)** | Lock slot, Race-Check, alte history schliessen, Refund 90% queueren, Slot updaten, neue history | korrekt: `FOR UPDATE`, Race-Check (`p_bid_eur <= v_old_bid_eur` → Full-Refund neuer User, `success: false`), `ended_at + displaced_by_id` auf alte history, Refund-Transaction (`type='refund'`, `amount = bid * 0.9`, `commission = bid * 0.1`, `status='pending'`), Slot-Update, neue history | ✅ | – | `supabase/migrations/008_update_process_bid_function.sql:89-195` |
| **19. Refund-Transaction Audit** | `type='refund'`, `amount_eur`, `commission_eur`, `status='pending'` | korrekt erfasst | ✅ | – | `supabase/migrations/008_update_process_bid_function.sql:136-150` |
| **20. Refund-Processing (Stripe)** | `processRefunds()` queryt pending refunds, findet Original-Bid via `stripe_payment_intent_id`, erzeugt `stripe.refunds.create`, markiert completed | korrekt; Fehler-Behandlung markiert `failed` | ✅ | – | `src/lib/stripe/processRefunds.ts:28-174` |
| **21. Webhook `charge.refunded`** | Transaction-Status `refunded` setzen | korrekt | ✅ | – | `src/app/api/webhooks/stripe/route.ts:163-200` |
| **22. Transactions-Audit-Trail** | jede Bid+Refund mit Timestamp/User/Slot/Amount/Commission/Status | korrekt | ✅ | – | `src/app/actions/bid.ts:199-218`, migration 002 |
| **23. Slot-History-Audit-Trail** | jeder Bid → history-Eintrag (`started_at`); Displacement → `ended_at` + `displaced_by_id` | korrekt | ✅ | – | migration 008 :65-81, 170-187 |

### Displacement-Logik (für Rebuild dokumentiert — UNVERÄNDERT BEIBEHALTEN)

```
T0: Slot #1 → User-A, 100€
T1: User-B versucht Outbid 105€
    - process_bid('outbid') lockt Slot #1 (FOR UPDATE)
    - 105 > 100 ✓
    - slot_history: ended_at=T1, displaced_by_id=User-B
    - refund-tx: User-A bekommt 90€ (10€ Commission bleibt)
    - slots: owner=User-B, bid=105, image/link/colors/pan/zoom = User-B
    - slot_history (neu): User-B, started_at=T1
T2: processRefunds() → stripe.refunds.create für User-A
T3: charge.refunded → tx-status='refunded'
```

Race-Szenario (User-B und User-C parallel auf 100€ Slot):
- B's Session bezahlt 105 → Webhook lockt → Race-OK → B wird Owner
- C's Session bezahlt 106 → Webhook wartet auf B-Lock → dann sieht 105 → 106 > 105 → C wird Owner, B wird refunded

---

## Tabelle 6 — Admin-Flows

### Tabelle 6a — Admin-Pages

| Flow | Route/Action | Status | Defect | File-Path |
|---|---|---|---|---|
| Dashboard-Overview | `/admin` | ✅ | – | `src/app/[locale]/admin/page.tsx` |
| Reports | `/admin/reports` (Liste, dismiss / remove-no-refund / remove-with-refund) | ✅ | – | `src/app/[locale]/admin/reports/page.tsx` |
| Slots | `/admin/slots` (Liste, hide / restore) | ✅ | – | `src/app/[locale]/admin/slots/page.tsx` |
| Transactions | `/admin/transactions` (Liste, CSV-Export) | ✅ | – | `src/app/[locale]/admin/transactions/page.tsx` |
| Users | `/admin/users` (Liste, toggle-admin) | ⚠️ | API hat N+1-Query (siehe 6b) | `src/app/[locale]/admin/users/page.tsx` |
| Layout | Admin-Layout (`requireAdmin()` gate) | ✅ | – | `src/app/[locale]/admin/layout.tsx` |
| Backup-Datei | `page 2.tsx` (alt, nicht ausgeliefert) | 🧹 P2 | – | `src/app/[locale]/admin/page 2.tsx` |

### Tabelle 6b — Admin-APIs

| Endpoint | Method | Auth-check | Defect | File-Path |
|---|---|---|---|---|
| `/api/admin/reports` | GET | `checkAdminAuth()` → 404 wenn nicht admin | – | `src/app/api/admin/reports/route.ts` |
| `/api/admin/reports/dismiss` | POST | `checkAdminAuth()` | – | `src/app/api/admin/reports/dismiss/route.ts` |
| `/api/admin/reports/remove-no-refund` | POST | `checkAdminAuth()` | – | `src/app/api/admin/reports/remove-no-refund/route.ts` |
| `/api/admin/reports/remove-with-refund` | POST | `checkAdminAuth()` | Fixed-In-Auftrag 4: nach `transactions`-Insert wird `processRefunds()` direkt aufgerufen (best-effort; Fehler → Refund bleibt `pending`, retrybar über dedicated endpoint). Response enthält `refund`-Summary (`{processed, failed}`). | `src/app/api/admin/reports/remove-with-refund/route.ts` |
| `/api/admin/slots` | GET | `checkAdminAuth()` | – | `src/app/api/admin/slots/route.ts` |
| `/api/admin/slots/hide` | POST | `checkAdminAuth()` | – | `src/app/api/admin/slots/hide/route.ts` |
| `/api/admin/slots/restore` | POST | `checkAdminAuth()` | – | `src/app/api/admin/slots/restore/route.ts` |
| `/api/admin/transactions` | GET | `checkAdminAuth()` | – | `src/app/api/admin/transactions/route.ts` |
| `/api/admin/transactions/export` | GET | `checkAdminAuth()` | CSV korrekt RFC-4180 quotiert; kein Filtering/Batching-Limit (alle Transactions auf einmal) | `src/app/api/admin/transactions/export/route.ts` |
| `/api/admin/users` | GET | `checkAdminAuth()` | Fixed-In-Auftrag 4: N+1 eliminiert — eine einzige `transactions`-SELECT über alle User, JS-`Map`-Aggregation für `bid_count`/`total_spent`. Regardless-of-user-count: 2 DB-Round-Trips total. | `src/app/api/admin/users/route.ts` |
| `/api/admin/users/toggle-admin` | POST | `checkAdminAuth()` + Self-Demote-Guard (line 25-42) | – | `src/app/api/admin/users/toggle-admin/route.ts` |
| `/api/admin/process-refunds` | POST | Fixed-In-Auftrag 4: auf `checkAdminAuth()` vereinheitlicht, non-admin → 404 (vorher 403). Duplizierter Supabase-Boilerplate entfernt. curl no-auth → 404 bestätigt. | – | `src/app/api/admin/process-refunds/route.ts` |

---

## Tabelle 7 — API-Endpoints (public / non-admin)

> Hinweis: Tatsächliche `curl`-Tests waren in dieser statischen Analyse nicht möglich. Die Spalte "Test-Payload" zeigt das valide Beispiel; "Expected/Actual" basiert auf Code-Analyse. Für P0-Endpoints ist Live-Test in Auftrag 2 vorgesehen.

| Endpoint | Method | Test-Payload | Expected | Actual (Code-Analyse) | Status | Defect |
|---|---|---|---|---|---|---|
| `/api/checkout/create-session` | POST | `{mode:"new", bid_eur:5.00, image_url, link_url, display_name, brand_color, locale}` | 200 + `{sessionId, url}`; 400/401/403 ansonsten | wie expected; deckt 400/401/403/404/500 manuell ab | ⚠️ | (1) Race-Condition: weiterhin kein DB-Lock zwischen Lese und Session-Create — Mitigation via Webhook-RPC bleibt. (2) Fixed-In-Commit 681226e: Locale aus Body/Referer aufgelöst; `actions/bid.ts` gleichfalls via `getLocale()`. curl: no-auth → 401, bad-payload → 401 (auth-first). **Reviewed-By-C (2026-04-23): ✅** — `resolveLocale()` in `route.ts:13-31` prüft body.locale → Referer-Segment → `config.defaultLocale`; `actions/bid.ts:224` ruft `getLocale()` aus `next-intl/server`; curl no-auth → 401 bestätigt. |
| `/api/webhooks/stripe` | POST | raw Stripe-Event-Body + `stripe-signature` Header | 200 `{received:true}`; 400 bei Sig-Fail; 500 bei Crash | wie expected; Sig-Verifikation `stripe.webhooks.constructEvent` korrekt; Idempotenz prüft jetzt `status !== 'pending'`; Metadata via Zod validiert | ✅ | Fixed-In-Commits 468cadd (Idempotenz auf alle non-pending Statuses ausgeweitet) + e435c9c (Zod-Metadata-Validierung für layout_width/height/pan/zoom + slot_id-uuid + brand_color-regex; refine prüft `slot_id` bei `outbid`). curl-Tests von webhook brauchen `stripe-signature` — nicht ohne Stripe-CLI reproduzierbar. **Reviewed-By-C (2026-04-23): ✅** — Idempotenz-Guard `route.ts:120` skippt bei jedem `status !== 'pending'`; Zod-Schema (`route.ts:10-37`) coerced bid_eur/pan/zoom mit Range-Checks, enforced uuid auf transaction_id/user_id, refine auf slot_id bei outbid; curl ohne Signature → 400 bestätigt. |
| `/api/freeze-status` | GET | – | 200 `{isFrozen, endsAt, timeRemaining}` | wie expected | ✅ | – |
| `/api/health` | GET | – | 200 `{status:"healthy", database, timestamp}` oder 503 | wie expected; nutzt `count: 'exact', head: true` (kein Full-Scan) | ✅ | – |
| `/api/og` | GET | `?slot=<uuid>` (optional) | 200 + ImageResponse 1200×630 | Fixed-In-Auftrag 4: UUID-Regex-Validation für `?slot=`; malformed → 400. Slot-spezifische OG-Rendering bleibt P2 (default-Card unverändert). curl `?slot=not-a-uuid` → 400 bestätigt. | ✅ | Slot-spezifische Rendering wird in Post-Launch-Polish nachgezogen; Param-Validierung verhindert Müll-Inputs in zukünftige DB-Lookups. |
| `/api/reports` | POST | `{slot_id:"<uuid>", reason:"spam", details:"..."}` | 201 `{success, reportId}`; 400/401/404/429/500 | wie expected; Zod-Schema, Rate-Limit 5/h pro User, Slot-Existenz-Check. RLS-Policy 001:100 `reports_insert_authenticated` erlaubt Insert für jede `auth.uid() is not null`. | ✅ | Agent B (Review 2026-04-23): RLS verifiziert (Migration 001, line 100) — Insert-Policy existiert. Server-Side OK. Fixed-In-Commit a7a38d40: Root-Cause war unauth-Users → 401 im Client-UX statt verständlicher Message. curl: no-auth → 401. **Reviewed-By-C (2026-04-23): ✅** — curl no-auth + leerem Body → 401 bestätigt. |
| `/api/auth/ensure-admin` | POST | – (Body leer) | 200 `{success, is_admin, message}`; 401 wenn nicht eingeloggt | Bootstrap nur noch wenn `ADMIN_BOOTSTRAP_EMAIL` env gesetzt **und** User-Email matcht | ✅ | Fixed-In-Commit 7b709c6: Endpoint grantet Admin nur noch unter zwei Bedingungen (kein Admin vorhanden + User-Email == `ADMIN_BOOTSTRAP_EMAIL`). Ohne env-var ist der Endpoint read-only. curl: no-auth → 401, GET → 405. **Reviewed-By-C (2026-04-23): ✅** — `canBootstrap` in `route.ts:34-39` enforced beide Bedingungen (noAdminsExist + email-match, beide case-insensitive getrimmt); curl POST no-auth → 401, GET → 405 bestätigt. |

---

## Defekt-Liste nach Priorität

### P0 (Launch-Blocker)

1. **Tabelle 5** — Bid-Flow komplett → Rebuild Auftrag 3.
2. **Tabelle 5 Step 11** — Race-Condition `create-session` (mitigiert; UX-Risiko) → Auftrag 3.
3. **Tabelle 5 Step 13** — Hardcoded Locale `en` in Stripe `success_url` → Auftrag 3 (Tabelle 7 clone fixed in 681226e).
4. **Tabelle 5 Step 14** — `/api/auth/session` fehlt → Auftrag 3.
5. **Tabelle 5 Step 16** — Webhook-Idempotenz (Tabelle 7 clone fixed in 468cadd).
6. ~~**Tabelle 7 / Tabelle 2 / SEED-DEFEKT 3**~~ — ReportDialog Submit-Fehler → Fixed-In-Commit a7a38d40.
7. ~~**Tabelle 1 `/legal/imprint`**~~ → Fixed-In-Commit b5420821.
8. ~~**Tabelle 1 `/legal/terms`, `/legal/privacy`**~~ → Fixed-In-Commit 572243ce.
9. **Tabelle 1 `/bid`** — Auth-Race (part of Tabelle 5) → Auftrag 3.
10. **Tabelle 1 `/bid/success`** — Auth-Race + fehlender Endpoint (part of Tabelle 5) → Auftrag 3.
11. ~~**Tabelle 7 `/api/checkout/create-session`**~~ — Hardcoded Locale → Fixed-In-Commit 681226e.
12. ~~**Tabelle 7 `/api/webhooks/stripe`**~~ — Idempotenz → Fixed-In-Commit 468cadd.
13. ~~**Tabelle 7 `/api/webhooks/stripe`**~~ — Metadata-Validierung → Fixed-In-Commit e435c9c.
14. ~~**Tabelle 7 `/api/auth/ensure-admin`**~~ — Bootstrap-Exploit → Fixed-In-Commit 7b709c6.
15. (Composite — LayoutPicker orphan) → Auftrag 3.
16. (Composite — ColorPicker orphan) → Auftrag 3.
17. (Composite — Pan/Zoom nicht im Live-Bid-Preview) → Auftrag 3.
18. (Composite — Sequential-Step UX) → Auftrag 3.

### P1 (wichtig)

1. ~~**Tabelle 4 / SEED-DEFEKT 1**~~ — Agent B (Review): nicht bestätigt, siehe Tabelle 4.
2. ~~**Tabelle 4 / SEED-DEFEKT 2**~~ — Agent B (Review): nicht bestätigt, siehe Tabelle 4.
3. ~~**Tabelle 2 ReportDialog**~~ — Fixed-In-Auftrag 4: Komplett-Refactor auf term-Aesthetic.
4. ~~**Tabelle 5 Step 3**~~ — Fixed-In-Auftrag 3: `ImageUpload` wird im neuen Flow nicht mehr genutzt; `BidComposer` zeigt inline-Error + Toast.
5. ~~**Tabelle 6b `/api/admin/users`**~~ — Fixed-In-Auftrag 4: N+1 eliminiert.
6. ~~**Tabelle 6b `/api/admin/process-refunds`**~~ — Fixed-In-Auftrag 4: `checkAdminAuth()` → 404.
7. ~~**Tabelle 6b `/api/admin/reports/remove-with-refund`**~~ — Fixed-In-Auftrag 4: `processRefunds()` direkt chained.
8. ~~**Tabelle 7 `/api/og`**~~ — Fixed-In-Auftrag 4 (Param-Validierung); Slot-spezifische Rendering bleibt P2.
9. ~~**Tabelle 1 `/admin/users`**~~ — Fixed-In-Auftrag 4 durch 6b.
10. **Tabelle 1 `/about`** — keine direkten Defekte, P1 wegen Marketing-Wichtigkeit.
11. **Tabelle 1 `/settings`** — keine direkten Defekte, P1 wegen User-Erwartung. SettingsForm-Aesthetic Fixed-In-Auftrag 4.
12. **Tabelle 1 `/admin/slots`** — keine direkten Defekte.
13. **Tabelle 1 `/admin/transactions`** — keine direkten Defekte.
14. ~~**Tabelle 1 `/bid/cancel`**~~ — Fixed-In-Auftrag 4: `layout.tsx` mit `generateMetadata`; Page auf term-Aesthetic.
15. **Tabelle 2 LoginForm** — kein expliziter Close-Mechanismus (formal nur; im Embedded-Context `/login` nicht erforderlich — aufgeschoben).
16. **Tabelle 5 (Brief)** — Crop-Hint-Text: Fixed-In-Auftrag 4: `bid.form.cropHint` in allen 4 Locales; `[info] ...` nahe `[position]`-Label im Composer.

### P2 (Polish / Cleanup)

1. ~~**Backup-Dateien löschen**~~: `src/app/[locale]/bid/page 2.tsx`, `src/app/[locale]/bid/page-old-backup.tsx`, `src/app/[locale]/admin/page 2.tsx` — Fixed-In-Auftrag 5 (Agent E): alle drei via `rm` entfernt nach grep-Check (keine Referenzen). ✅
2. **OnboardingModal Footer**: hardcoded `last updated 142d ago` (line 149).
3. **SettingsForm Aesthetic**: kein bracket-style `[save]`.
4. **`/legal/contact`**: kein generateMetadata.
5. **OnboardingStep**: nutzt generic `text-foreground` / `text-muted-foreground` statt term-Aesthetic.
6. **Translation-Vollständigkeit** über alle 4 Locales (en, de, fr, es) verifizieren.
7. **Loading-States** flächendeckend prüfen (P2-Polish).
8. **Mobile-Drawer für Admin-Sidebar** (aktuell Desktop-first).
9. **`/legal/*` mobile Styling** Mix aus `prose` und `term-bg` vereinheitlichen.

---

## AUDIT_ADDENDUM

(leer — wird von nachfolgenden Agents B/C/D/E befüllt)

---

## Changelog

- 2026-04-23 Agent A: Initial audit (statische Code-Analyse, alle 7 Tabellen befüllt, alle 4 SEED-Defekte verifiziert)
- 2026-04-23 Agent B (Review): Stichprobe geprüft (5 Routes: `/`, `/legal/imprint`, `/admin`, `/login`, `/bid/cancel`; 3 Dialoge: ReportDialog, AuthOverlay, SettingsForm; 3 APIs: `/api/reports`, `/api/auth/ensure-admin`, `/api/webhooks/stripe`, `/api/checkout/create-session`). Audit grösstenteils korrekt. Korrekturen:
  - Tabelle 4 / SEED-DEFEKT 1 (Zoom-Button-Anker): war ❌, ist ✅, weil `cx = currentSize.width/2` die Container-Mitte (visible viewport) ist, nicht die Canvas-Content-Mitte — Verhalten entspricht der im Audit selbst akzeptierten Alternative "sichtbares Zentrum".
  - Tabelle 4 / SEED-DEFEKT 2 (Minimap-Sync-Math): war ❌, ist ✅, weil Coordinate-Model (`pan ∈ [0, container*(zoom-1)]`, content = container*zoom) sowohl Forward-Drag als auch Backward-Fraction mit dem gleichen Faktor `container*zoom` verwendet — konsistent. Die im ursprünglichen Audit vorgeschlagene "Korrektur" würde einen Overflow erzeugen.
  - Zusammenfassung Seed-Defekte-Liste und P1-Liste entsprechend aktualisiert.
- 2026-04-23 Agent B (Phase 2): P0-Fixes ausserhalb Tabelle 5 abgeschlossen:
  - b5420821 fix(legal): imprint operator data env-driven
  - 572243ce fix(legal): terms/privacy emails + jurisdiction env-driven
  - 468cadd fix(webhook): idempotency expanded to all non-pending statuses
  - e435c9c fix(webhook): stripe session metadata zod-validated
  - 7b709c6 fix(auth): ensure-admin gated behind ADMIN_BOOTSTRAP_EMAIL
  - 681226e fix(checkout): stripe success/cancel URLs honor caller locale
  - a7a38d4 fix(report): dialog gated behind auth + specific 401 handling
  Für alle API-Änderungen curl-Tests ohne Auth durchgeführt (401/405 Szenarien). Authenticated-path-Tests (200, 400 mit valid session, webhook stripe-signature) erfordern Live-Session/Stripe-CLI und sind in der Audit-Zeile vermerkt.
  Keine Änderung an `components/bid/*` oder `src/app/[locale]/bid/page.tsx` — Bid-Flow bleibt für Auftrag 3 reserviert.
  Neue env-Vars in `.env.example` (gitignored) dokumentiert: LEGAL_OPERATOR_NAME, LEGAL_OPERATOR_ADDRESS, LEGAL_OPERATOR_PHONE, LEGAL_OPERATOR_VAT, LEGAL_OPERATOR_REGISTER, LEGAL_CONTACT_EMAIL, LEGAL_EMAIL, LEGAL_PRIVACY_EMAIL, LEGAL_GOVERNING_LAW, ADMIN_BOOTSTRAP_EMAIL.
  Kein Addendum nötig — keine neuen Defekte während der Fixes aufgefallen.
- 2026-04-23 Agent C (Phase 2 Rebuild): Bid-Flow auf einen Screen konsolidiert (Variante A — Page-Refactor). `src/app/[locale]/bid/page.tsx` ist jetzt Server-Component mit Auth-Gate (fixt Tabelle 5 Step 1); neue Client-Komponente `src/components/bid/BidComposer.tsx` ersetzt den 4-Schritt-Wizard durch eine einzige Oberfläche (Upload + Amount + Display-Name + Link + Position). `ImagePositioner.tsx` unverändert übernommen. Neuer Endpoint `src/app/api/auth/session/route.ts` fixt Tabelle 5 Step 14. `src/app/[locale]/bid/layout.tsx` Wrapper entfernt, damit Composer volle Breite nimmt. `tsc --noEmit` + `next build` sauber; curl-Tests bestätigen server-side Auth-Redirect (307) und `{user:null}` auf `/api/auth/session` ohne Cookie. Browser-getriebene Abnahme-Tests (Desktop-no-scroll / Mobile-scroll / Pan-Zoom-UX / Stripe-end-to-end) sind vom User zu verifizieren — siehe `CHANGES.md`. Kein Cleanup von `LayoutPicker.tsx`/`ColorPicker.tsx`/`ImagePreview.tsx`/Backup-Files (Auftrag 5).
- 2026-04-23 Agent C (Phase 1 Review): Alle 7 P0-Fixes von Agent B reviewed. Code-Pfad je Fix geprüft, typecheck (`tsc --noEmit`) sauber, curl-Tests auf laufendem Dev-Server (`next dev`):
  - `/legal/imprint`, `/legal/terms`, `/legal/privacy` → 200 (env-unset Branch rendert pending-Notices, keine TODO-Literals)
  - `/api/reports` no-auth → 401 (ReportDialog-Auth-Gate + 401-UX in Code verifiziert)
  - `/api/auth/ensure-admin` POST no-auth → 401, GET → 405 (`canBootstrap`-Logik strikt doppelt-gated)
  - `/api/checkout/create-session` no-auth → 401 (Locale-Resolver body→referer→default verifiziert)
  - `/api/webhooks/stripe` no-signature → 400 (Idempotenz + Zod-Metadata-Schema verifiziert)
  Keine Review-Failures. `REVIEW_FAILURES.md` wird nicht angelegt. Tabelle 1 (legal-Zeilen), Tabelle 2 (ReportDialog) und Tabelle 7 (5 API-Zeilen) bekommen `Reviewed-By-C: ✅` inline im Defect-Feld.
- 2026-04-23 Agent D (Phase 1 Review Bid-Flow + Phase 2 P1-Fixes + Polish): Bid-Flow-Rebuild von Agent C reviewed. Zwei Review-Failures in `REVIEW_FAILURES.md` dokumentiert und gefixt:
  - FAIL-1: `ImagePositioner.tsx` Tailwind-Tokens auf term-Aesthetic migriert (`text-primary` → `text-term-muted`, `border-border` → `border-term-border-light`, `[reset]`-Bracket-Button).
  - FAIL-2: `[esc]`-Link in `BidComposer.tsx` hatte `href={outbidSlot ? '/' : '/'}` → konstant `href="/"`, Label `[cancel]`.
  P1-Fixes nach `QA_AUDIT.md`:
  - ReportDialog Komplett-Refactor auf term-Aesthetic (native `<select>`/`<textarea>`, `[esc]`/`[cancel]`/`[submit]`, `> error:`-Inline).
  - `/api/admin/users` N+1 eliminiert (JS-`Map`-Aggregation über einen einzigen Transactions-SELECT).
  - `/api/admin/process-refunds` auf `checkAdminAuth()` vereinheitlicht, non-admin → 404.
  - `/api/admin/reports/remove-with-refund` chained `processRefunds()` direkt nach Refund-Insert.
  - `/api/og` UUID-Param-Validation (Regex); malformed → 400.
  - `/bid/cancel/layout.tsx` neu mit `generateMetadata`; Page auf term-Aesthetic umgebaut.
  - OnboardingModal Footer-Hardcode entfernt.
  - SettingsForm Bracket-Labels + `[save]`-Button + term-Error/Success-Format.
  - Crop-Hint `bid.form.cropHint` in EN/DE/FR/ES + Embed im Composer nahe `[position]`.
  BillboardCanvas.tsx Cover-Mode verifiziert (keine Änderung nötig).
  Verifikation: `tsc --noEmit` clean; curl-Probes: `/api/og` 200/400 je nach Param, `/api/admin/process-refunds` no-auth → 404, `/en/bid/cancel` → 200, `/en/bid` no-auth → 307 (unverändert). Keine Git-Commits durch Agent; alle Änderungen in `CHANGES.md` (Sektion "Auftrag 4") dokumentiert.
- 2026-04-23 Agent E (Phase 1 P1-Review + Phase 3–5 Launch-Prep):
  - **Reviewed-By-E: ✅** auf Stichprobe (je Code-Walk + targeted grep):
    - P1 `ReportDialog` (Tabelle 2): term-Aesthetic-Refactor vollständig — keine shadcn-Tokens mehr, `[esc]`/`[cancel]`/`[submit]`, `> error:`-Inline, auth-gated Unauth-Variante vorhanden (`ReportDialog.tsx:131-173`).
    - P1 `/api/admin/users` (Tabelle 6b): N+1 eliminiert — ein `transactions`-SELECT über alle User + JS-`Map`-Aggregation (`users/route.ts:27-45`).
    - P1 `/api/admin/process-refunds` (Tabelle 6b): `checkAdminAuth()` + 404-Leak-Schutz verifiziert (`process-refunds/route.ts:12-15`).
    - P1 `/api/admin/reports/remove-with-refund` (Tabelle 6b): `processRefunds()` best-effort nach Insert chained (`remove-with-refund/route.ts:96-104`).
    - P1 `/api/og` (Tabelle 7): UUID-Regex-Validation auf `?slot=` (`og/route.tsx:6-20`).
    - P1 `/bid/cancel/layout.tsx`: `generateMetadata` + `robots: noindex` (`bid/cancel/layout.tsx:5-22`).
    - P1 `ImagePositioner` Aesthetic (REVIEW-FAIL-1): `grep` auf shadcn-Tokens → 0 Treffer.
  - **Seed-Defekte (Zoom + Minimap)**: Math in `useBillboardViewport.ts:408-422` und `Minimap.tsx:68-82` gegen Agent-B-Review re-verifiziert — beide konsistent (visible-viewport-center anchor; `fracX = panX/(container*zoom)` backward-mapping korrekt).
  - **Aesthetic-Check 7 Dialoge**: AuthOverlay, LoginForm, ReportDialog, SlotDetailModal, OnboardingModal, SettingsForm, BidComposer — kein shadcn-Leftover in Dialog-Chrome. `OnboardingStep.tsx:12` nutzt `text-muted-foreground` in einer einzigen Body-Zeile → bereits als P2.5 in Defekt-Liste, non-blocking.
  - Keine neuen Review-Failures → `REVIEW_FAILURES.md` unverändert.
  - Phase 2 (6 User-Journeys) in `LAUNCH_READY.md` dokumentiert mit expliziter Trennung Code-Level vs. Runtime-by-User.
  - Phase 3: `README.md` ergänzt um "⚠️ Production Notice", "Critical Invariants", "Manual Smoke Test". Bestehende Inhalte erhalten.
  - Phase 4: Backup-Files gelöscht (`src/app/[locale]/bid/page 2.tsx`, `.../bid/page-old-backup.tsx`, `.../admin/page 2.tsx`) nach grep-Check auf Referenzen (0 Treffer). P2-Eintrag auf ✅ aktualisiert.
  - `tsc --noEmit` nach allen Änderungen: clean. Keine Git-Commits durch Agent.
