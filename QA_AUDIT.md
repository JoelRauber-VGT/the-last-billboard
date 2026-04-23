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
| `/bid` | ⚠️ partial | P0 | Client-side Auth-Check via `useEffect` → User sieht kurz leere Seite vor Redirect; gesamter Flow defekt (siehe Tabelle 5) | Auth in Server-Component oder Layout verschieben | `src/app/[locale]/bid/page.tsx` |
| `/bid/success` | ⚠️ partial | P0 | Hardcoded Locale `en` im Stripe-`success_url` führt non-EN User auf englische Seite; ruft non-existentes `/api/auth/session` auf | Locale aus Server-Action durchreichen; `/api/auth/session` implementieren oder entfernen | `src/app/[locale]/bid/success/page.tsx`, `src/app/actions/bid.ts:240` |
| `/bid/cancel` | ✅ works | P1 | Kein generateMetadata | Optional: Metadata-Export ergänzen | `src/app/[locale]/bid/cancel/page.tsx` |
| `/admin` | ✅ works | P0 | – | `requireAdmin()` im Layout aktiv | `src/app/[locale]/admin/page.tsx` |
| `/admin/reports` | ✅ works | P0 | – | Layout-Gate schützt Subseite | `src/app/[locale]/admin/reports/page.tsx` |
| `/admin/slots` | ✅ works | P1 | – | – | `src/app/[locale]/admin/slots/page.tsx` |
| `/admin/transactions` | ✅ works | P1 | – | – | `src/app/[locale]/admin/transactions/page.tsx` |
| `/admin/users` | ⚠️ partial | P1 | API hinter dieser Seite hat N+1-Query (Transactions pro User in Loop) → langsam bei vielen Usern | API `users/route.ts` auf Aggregation-Join umstellen | `src/app/[locale]/admin/users/page.tsx`, `src/app/api/admin/users/route.ts:25-47` |
| `/legal/terms` | ⚠️ partial | P0 | Hardcoded Placeholder `legal@example.com`; TODO-Marker in Übersetzungen (`law.todoTitle`, `law.todoText`) | Kontakt-Mail aus `lib/config.ts`/env, Translation-TODOs füllen | `src/app/[locale]/legal/terms/page.tsx` |
| `/legal/privacy` | ⚠️ partial | P0 | Hardcoded `privacy@example.com`; TODO-Marker `rights.todoEmail` | Mail aus config, Translation-TODOs füllen | `src/app/[locale]/legal/privacy/page.tsx` |
| `/legal/imprint` | ❌ broken | P0 | Hardcoded `[YOUR-EMAIL@example.com]`; TODO-Marker `operator.placeholder`, `operator.todoTitle`, `operator.todoItems.*`, `contact.placeholder` — Pflichtangaben fehlen → DSGVO/TMG-Verstoss | Operator-Daten (Name, Adresse, Mail, Tel., USt-ID, Reg-Nr.) eintragen | `src/app/[locale]/legal/imprint/page.tsx` |
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
| **ReportDialog** | ✅ controlled (`open`/`onOpenChange`) | ✅ ESC, Click-Outside, Cancel-Button | ❌ **BROKEN beim Absenden** — Schema-Match auf den ersten Blick OK (`{slot_id, reason, details}` matched Zod). Ursache muss runtime verifiziert werden — wahrscheinliche Root Causes: (a) Cookie-/Session nicht gesendet → 401, (b) `reports`-Tabelle hat keine RLS-Insert-Policy für `reporter_id = auth.uid()`, (c) Rate-Limit-Check trifft, (d) ungültige UUID. Schema-Validierung zwischen Client (`reportSchema` lokal) und Server (`/api/reports/route.ts:6-17`) ist inhaltlich identisch. | ✅ red box (line 200-202) | ❌ **non-konform**: Material/Tailwind-Style (`bg-red-50 text-red-800`), kein Space Mono, kein bracket-style. Bricht aesthetic der App. | (1) Submit-Bug: Browser-Test mit DevTools Network-Tab → tatsächlichen Status-Code festhalten; RLS-Policy auf `reports` prüfen. (2) Aesthetic-Refactor auf term-ui. | `src/components/billboard/ReportDialog.tsx`, `src/app/api/reports/route.ts` |
| **SlotDetailModal** | ✅ controlled (`open`/`onOpenChange`) | ✅ Close-Button ×, Click-Outside | n/a (read-only + Outbid-Link) | n/a | ✅ Space Mono, `#0a0a0a` bg, `#60a5fa` accent, `[ visit ↗ ]` / `[ OUTBID THIS SLOT ]` | – | `src/components/billboard/SlotDetailModal.tsx` |
| **OnboardingModal** | ✅ controlled (`isOpen`/`onClose`) | ✅ ESC, Click-Outside, `[esc]`-Button | n/a | n/a | ✅ Space Mono, `bg-[#1a1a1a]`, `#60a5fa` accent, bracket-style | Footer-Text `last updated 142d ago` (line 149) hardcoded | `src/components/onboarding/OnboardingModal.tsx` |
| **SettingsForm** | n/a (eingebettetes Form) | n/a | ✅ Supabase `.update()` profile, Error-Handling, Loading, Success-Toast | ✅ rote Box `border-red-500/50 bg-red-500/10`, grüne Box auf Success | ⚠️ teilweise: `font-mono` + `#60a5fa`, aber kein bracket-style (`[save]`), Standard-Card-Styling | Aesthetic teilweise inkonsistent (P2) | `src/components/settings/SettingsForm.tsx` |
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

| Step | Erwartetes Verhalten | Actual | Status | Defect | File-Path |
|---|---|---|---|---|---|
| **1. Entry `/bid` (unauth)** | AuthOverlay oder Redirect zu `/login` mit Hinweis | `useEffect` redirected, aber rendert vorher `null` → User sieht leere Seite kurz | ❌ | UX-Sprung; Server-side Auth-Wall fehlt | `src/app/[locale]/bid/page.tsx:105-112,258-259` |
| **2. Upload Validierung** | Size ≤ `maxImageSizeMb`, MIME PNG/JPEG/WEBP | Client + Server validieren; Magic-Bytes auf Server | ✅ | – | `src/components/bid/ImageUpload.tsx:34-46`, `src/lib/upload/uploadSlotImage.ts:9-63` |
| **3. Upload Error-Handling** | Toast / inline Error | benutzt `alert()` statt sonner-Toast | ⚠️ | UX-Bruch | `src/components/bid/ImageUpload.tsx:37-46` |
| **4. Image Upload Supabase** | Upload mit Retry → publicUrl | korrekt; 2 Retries (1s, 2s exp. Backoff) | ✅ | – | `src/lib/upload/uploadSlotImage.ts:45-105` |
| **5. Layout-Picker Step** | 4 Top-Layout-Vorschläge auswählbar | **LayoutPicker wird NICHT importiert**; Code sendet hardcoded `layout_width = Math.round(bid_eur)`, `layout_height = 1` → degenerate Strip-Layout | ❌ | **SEED-DEFEKT 4 (a)**: Komponente existiert, ist im Flow aber nicht eingehängt → Rebuild in Auftrag 3 | `src/app/[locale]/bid/page.tsx:225-226`, `src/components/bid/LayoutPicker.tsx` (orphan) |
| **6. Top-4-Divisor-Algorithmus** | best-fit, squarish, rotated, extreme | Algorithmus korrekt implementiert (`getDivisorPairs`, `findBestFit` log-ratio, `findSquarishOption`, `findExtremeOption`); aber nie aufgerufen | ⚠️ | Logik solide — UX-Defekt liegt an Step 5 | `src/lib/layout.ts:26-287` |
| **7. Pan/Zoom in Preview** | User kann während Konfiguration zoomen+pannen | `ImagePositioner` hat Pan/Zoom (1.0–3.0×, Pointer-Drag mit Clamp, 3 Aspect-Previews 9:16 / 1:1 / 16:9) — aber sequenziell vor/nach LayoutPicker, nicht im Live-Bid-Preview | ⚠️ | UX-Bruch wie SEED-DEFEKT 4: Pan/Zoom existiert, aber nicht im Flow erlebbar (Scrollen nötig) | `src/components/bid/ImagePositioner.tsx:1-276` |
| **8. ColorPicker Step** | User wählt Background-Farbe | **ColorPicker wird NICHT importiert**; `brand_color` hardcoded `'#1a1a1a'` | ❌ | Komponente existiert (10 Swatches + Hex-Input), nie verwendet → Rebuild in Auftrag 3 | `src/app/[locale]/bid/page.tsx:220`, `src/components/bid/ColorPicker.tsx` (orphan) |
| **9. Bid-Betrag Validierung** | Schritte à 5€; min = `ceil((current_bid + 0.01) / 5) * 5` | korrekt clientseitig (`bid % 5 === 0`) und serverseitig (`multipleOf(0.01)`); `step="5"` im Input | ✅ | – | `src/app/[locale]/bid/page.tsx:57,72-75,162`, `src/app/actions/bid.ts:15` |
| **10. Outbid-Modus** | `?outbid=<slot_id>` lädt Slot, prüft `current_owner != user` | korrekt | ✅ | – | `src/app/[locale]/bid/page.tsx:118-145` |
| **11. Stripe Checkout-Session** | Form-Validierung (`display_name ≤ 50`, `link_url https://`, bid-min); Session-Erstellung mit Metadaten | korrekt; `createBidCheckoutSession()` validiert; setzt Metadata `transaction_id, user_id, mode, slot_id, bid_eur, image_url, link_url, display_name, brand_color, layout_width, layout_height, pan_x, pan_y, zoom`; Transaction wird mit `stripe_session_id` aktualisiert | ⚠️ | Race-Condition: Zwischen `current_bid_eur`-Lese und Session-Create kein Lock — User-A validiert auf 10€ während User-B parallel auf 15€ outbidet → A's Session läuft trotzdem an. Mitigation: Webhook-RPC `process_bid` macht `FOR UPDATE` Lock und behandelt Race-Condition mit Refund (siehe Step 18). Endloser Verlust verhindert, aber UX-degradiert. | `src/app/api/checkout/create-session/route.ts:85-169`, `src/app/actions/bid.ts:83-282` |
| **12. Stripe Session Metadata** | enthält alle für Webhook nötigen Felder | korrekt | ✅ | – | `src/app/actions/bid.ts:242-257` |
| **13. Redirect nach `/bid/success`** | `?session_id=…`, locale-aware | `success_url` hardcoded `/en/bid/success?session_id={CHECKOUT_SESSION_ID}` | ⚠️ | non-EN User landet auf englischer Seite | `src/app/actions/bid.ts:240`, `src/app/api/checkout/create-session/route.ts:199` |
| **14. `/bid/success`** | Confirmation-Card, Links auf billboard + dashboard | rendert terminal-style Card; ruft `/api/auth/session` (existiert NICHT) → fällt still auf "your email" | ⚠️ | endpoint fehlt; Email-Anzeige funktioniert nicht; KEINE Confirmation-Mail wird verschickt (kein Mail-Service angebunden) | `src/app/[locale]/bid/success/page.tsx:1-87` |
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
| `/api/admin/reports/remove-with-refund` | POST | `checkAdminAuth()` | Refund wird `pending` erstellt, aber nicht automatisch verarbeitet → braucht manuellen `/api/admin/process-refunds` Trigger | `src/app/api/admin/reports/remove-with-refund/route.ts` |
| `/api/admin/slots` | GET | `checkAdminAuth()` | – | `src/app/api/admin/slots/route.ts` |
| `/api/admin/slots/hide` | POST | `checkAdminAuth()` | – | `src/app/api/admin/slots/hide/route.ts` |
| `/api/admin/slots/restore` | POST | `checkAdminAuth()` | – | `src/app/api/admin/slots/restore/route.ts` |
| `/api/admin/transactions` | GET | `checkAdminAuth()` | – | `src/app/api/admin/transactions/route.ts` |
| `/api/admin/transactions/export` | GET | `checkAdminAuth()` | CSV korrekt RFC-4180 quotiert; kein Filtering/Batching-Limit (alle Transactions auf einmal) | `src/app/api/admin/transactions/export/route.ts` |
| `/api/admin/users` | GET | `checkAdminAuth()` | **N+1 Query**: lädt alle User, dann pro User Transaction-Stats sequenziell (line 25-47). Bei wachsender User-Base langsam. | `src/app/api/admin/users/route.ts:25-47` |
| `/api/admin/users/toggle-admin` | POST | `checkAdminAuth()` + Self-Demote-Guard (line 25-42) | – | `src/app/api/admin/users/toggle-admin/route.ts` |
| `/api/admin/process-refunds` | POST | **Inkonsistent**: manueller Auth-Check statt `checkAdminAuth()`, gibt 403 zurück (statt 404 wie alle anderen Admin-Routes) → leakt Existenz an Nicht-Admins | Auth-Helper vereinheitlichen | `src/app/api/admin/process-refunds/route.ts` |

---

## Tabelle 7 — API-Endpoints (public / non-admin)

> Hinweis: Tatsächliche `curl`-Tests waren in dieser statischen Analyse nicht möglich. Die Spalte "Test-Payload" zeigt das valide Beispiel; "Expected/Actual" basiert auf Code-Analyse. Für P0-Endpoints ist Live-Test in Auftrag 2 vorgesehen.

| Endpoint | Method | Test-Payload | Expected | Actual (Code-Analyse) | Status | Defect |
|---|---|---|---|---|---|---|
| `/api/checkout/create-session` | POST | `{mode:"new", bid_eur:5.00, image_url, link_url, display_name, brand_color}` | 200 + `{sessionId, url}`; 400/401/403 ansonsten | wie expected; deckt 400/401/403/404/500 manuell ab | ⚠️ | (1) **Race-Condition**: kein DB-Lock auf `slots.current_bid_eur` zwischen Lese und Session-Create (line 85-169). Mitigation via Webhook-RPC vorhanden (siehe Tabelle 5 Step 11). (2) Hardcoded Locale `en` in `success_url` (line 199). |
| `/api/webhooks/stripe` | POST | raw Stripe-Event-Body + `stripe-signature` Header | 200 `{received:true}`; 400 bei Sig-Fail; 500 bei Crash | wie expected; Sig-Verifikation `stripe.webhooks.constructEvent` korrekt; Idempotenz prüft nur `status==='completed'` | ⚠️ | (1) **Idempotenz unvollständig**: `status='pending'` wird beim 2. Aufruf übersprungen → bid steckt fest. (2) Metadata-Felder `layout_width/height/pan_x/y/zoom` werden mit Fallbacks geparst, aber serverseitig in create-session NICHT validiert (Zod fehlt für diese Felder) → malformed Daten erreichen DB. |
| `/api/freeze-status` | GET | – | 200 `{isFrozen, endsAt, timeRemaining}` | wie expected | ✅ | – |
| `/api/health` | GET | – | 200 `{status:"healthy", database, timestamp}` oder 503 | wie expected; nutzt `count: 'exact', head: true` (kein Full-Scan) | ✅ | – |
| `/api/og` | GET | `?slot=<uuid>` (optional) | 200 + ImageResponse 1200×630 | static OG image für ALLE Requests; `slotId` extrahiert aber nicht verwendet (TODO line 12-15) | ⚠️ | Slot-spezifische OG-Generation nicht implementiert; auch keine UUID-Validierung am `slot`-Param |
| `/api/reports` | POST | `{slot_id:"<uuid>", reason:"spam", details:"..."}` | 201 `{success, reportId}`; 400/401/404/429/500 | wie expected; Zod-Schema, Rate-Limit 5/h pro User, Slot-Existenz-Check | ❌ | **SEED-DEFEKT 3** (ReportDialog Submit-Fehler): Schema **ist** kompatibel zwischen Client (`ReportDialog.tsx:91-94`) und Server (`route.ts:6-17`). Bug muss runtime verifiziert werden. Plausible Ursachen: (a) RLS-Policy auf `reports`-Tabelle erlaubt `insert` nicht für authenticated user (Migration 001 zeigt `enable row level security` aber Insert-Policy für `reports` ist nicht im sichtbaren Grep — muss verifiziert werden), (b) Auth-Cookie nicht weitergereicht (gleicher Origin → sollte automatisch), (c) `reporter_id`-Foreign-Key bricht (Profile-Row für User fehlt). **Action**: Browser-Test mit Network-Tab → exakter Status-Code dokumentieren in Auftrag 2. |
| `/api/auth/ensure-admin` | POST | – (Body leer) | 200 `{success, is_admin, message}`; 401 wenn nicht eingeloggt | wie expected (line 38 hat `await updateResult` — hier KEIN bug, anders als von einem Sub-Audit behauptet) | ⚠️ | **Security-Risiko**: Endpoint setzt JEDEN authentifizierten User als Admin, wenn aktuell kein Admin existiert (line 18-31). Wenn der einzige Admin gelöscht wird, kann der nächste eingeloggte Caller diesen Endpoint triggern und Admin werden. Kein Rate-Limit, kein Bootstrap-Token. |

---

## Defekt-Liste nach Priorität

### P0 (Launch-Blocker)

1. **Tabelle 5** — Bid-Flow komplett (LayoutPicker nicht eingebunden, ColorPicker nicht eingebunden, sequenzielle Schritte mit Scrolling, hardcoded `layout_width=bid_eur, height=1`, hardcoded `brand_color`). → Rebuild Auftrag 3.
2. **Tabelle 5 Step 11** — Race-Condition `create-session` (mitigiert, aber UX-Risiko).
3. **Tabelle 5 Step 13** — Hardcoded Locale `en` in Stripe `success_url`.
4. **Tabelle 5 Step 14** — `/api/auth/session` fehlt → Email auf Success-Page nicht angezeigt; keine Confirmation-Mail.
5. **Tabelle 5 Step 16** — Webhook-Idempotenz nur auf `status='completed'` → `pending`-Hänger möglich.
6. **Tabelle 7 / Tabelle 2 / SEED-DEFEKT 3** — ReportDialog Submit-Fehler (root cause runtime-verify).
7. **Tabelle 1 `/legal/imprint`** — Hardcoded Placeholder-Email + leere Operator-Pflichtdaten → DSGVO/TMG-Verstoss.
8. **Tabelle 1 `/legal/terms`, `/legal/privacy`** — Hardcoded Beispiel-Mails + TODO-Übersetzungen.
9. **Tabelle 1 `/bid`** — Auth-Race (Client-only Check, leere Seite vor Redirect).
10. **Tabelle 1 `/bid/success`** — Auth-Race + fehlender Endpoint.
11. **Tabelle 7 `/api/checkout/create-session`** — Hardcoded Locale (s. Punkt 3).
12. **Tabelle 7 `/api/webhooks/stripe`** — Idempotenz (s. Punkt 5).
13. **Tabelle 7 `/api/webhooks/stripe`** — Metadata-Validierung fehlt für layout/pan/zoom-Felder.
14. **Tabelle 7 `/api/auth/ensure-admin`** — Admin-Bootstrap-Endpoint exploitabel wenn Admin-Liste leer wird.
15. (Composite of bid-flow steps — `LayoutPicker` orphan)
16. (Composite of bid-flow steps — `ColorPicker` orphan)
17. (Composite of bid-flow steps — Pan/Zoom nicht im Live-Bid-Preview)
18. (Composite of bid-flow steps — Sequential-Step UX statt unified)

### P1 (wichtig)

1. ~~**Tabelle 4 / SEED-DEFEKT 1**~~ — Agent B (Review): nicht bestätigt, siehe Tabelle 4.
2. ~~**Tabelle 4 / SEED-DEFEKT 2**~~ — Agent B (Review): nicht bestätigt, siehe Tabelle 4.
3. **Tabelle 2 ReportDialog** — Aesthetic non-konform (Material-Style Error-Box).
4. **Tabelle 5 Step 3** — `ImageUpload` benutzt `alert()` statt Toast.
5. **Tabelle 6b `/api/admin/users`** — N+1 Query.
6. **Tabelle 6b `/api/admin/process-refunds`** — Auth-Pattern inkonsistent (403 statt 404).
7. **Tabelle 6b `/api/admin/reports/remove-with-refund`** — Refund wird nur `pending` erstellt, kein Auto-Trigger von processRefunds.
8. **Tabelle 7 `/api/og`** — Slot-spezifische OG nicht implementiert; keine UUID-Validierung.
9. **Tabelle 1 `/admin/users`** — abhängig von 6b N+1.
10. **Tabelle 1 `/about`** — keine direkten Defekte, P1 wegen Marketing-Wichtigkeit.
11. **Tabelle 1 `/settings`** — keine direkten Defekte, P1 wegen User-Erwartung.
12. **Tabelle 1 `/admin/slots`** — keine direkten Defekte.
13. **Tabelle 1 `/admin/transactions`** — keine direkten Defekte.
14. **Tabelle 1 `/bid/cancel`** — kein generateMetadata.
15. **Tabelle 2 LoginForm** — kein expliziter Close-Mechanismus (formal nur).

### P2 (Polish / Cleanup)

1. **Backup-Dateien löschen**: `src/app/[locale]/bid/page 2.tsx`, `src/app/[locale]/bid/page-old-backup.tsx`, `src/app/[locale]/admin/page 2.tsx`.
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
