# REVIEW_FAILURES — Bid-Flow-Rebuild (Agent C → Agent D)

Datum: 2026-04-23
Reviewer: Agent D
Scope: Bid-Flow-Single-Screen (`BidComposer.tsx` + `ImagePositioner.tsx` + `page.tsx`)

Review-Methode: Code-Analyse, `tsc --noEmit`, curl-Probes gegen `next dev`. Browser-Rendering-Tests (Viewport-Matrix Desktop/Mobile, Pan/Zoom-UX) sind Vom-User-zu-verifizieren (siehe Auftrag-3-Brief); die hier gelisteten Failures sind nur solche, die statisch erkennbar sind.

## Findings

### [FAIL-1] — ImagePositioner Aesthetic divergiert vom Composer

**Datei:** `src/components/bid/ImagePositioner.tsx`
**Schwere:** P1 (Aesthetic-Inkonsistenz)

Beschreibung: `BidComposer` ist strikt term-aesthetic (`bg-term-surface`, `text-term-accent`, `border-term-border-light`, bracket-Labels `[position]`). Der eingebettete `ImagePositioner` verwendet jedoch weiter shadcn-Tokens:

- `text-primary` (line 172)
- `text-muted-foreground` (lines 173, 218, 235, 244, 298)
- `border-border` (line 213, 225)
- `hover:bg-muted` (line 213, 225)
- `hover:text-foreground` (line 235)

Resultat: innerhalb eines ansonsten terminal-styled Composers erscheint ein Block mit abweichender Color-Palette (Light-Mode-Greys) → der Non-Negotiable-Aesthetic-Anspruch des Briefs ist nicht vollständig erfüllt.

**Fix durch Agent D:** Tokens auf `text-term-*` / `border-term-*` migriert. `ImagePositioner`-Funktionalität (Pan/Zoom-Math, CoverImage-Rendering) unangetastet — nur Tailwind-Klassen.

### [FAIL-2] — `[esc]` Link im BidComposer-Header verlinkt unkonditional auf `/`

**Datei:** `src/components/bid/BidComposer.tsx:175-181`
**Schwere:** P2 (Polish)

Beschreibung: `href={outbidSlot ? '/' : '/'}` — beide Zweige gleiches Ziel. Im Outbid-Modus wäre ein Rücksprung zum jeweiligen Slot sinnvoller, aber ohne Server-Link zum Billboard-Detail ist das nicht trivial. Minimal-Fix: einfacher Ternary entfernt, konstanter `href="/"` mit `[cancel]` statt `[esc]` (da kein Keyboard-Listener dranhängt und das User-Mental-Model "close → back to board" ist).

**Fix durch Agent D:** Konstanter `href="/"`, Label auf `[cancel]` geändert.

## Ergebnis-Matrix

| Check | Result | Notes |
|---|---|---|
| Desktop 1920×1080 — content fits | ✅ (vermutet, `lg:overflow-hidden` Body + `lg:flex-1` innere Kolonnen) | nicht im Browser verifiziert |
| Desktop 1280×800 — content fits | ✅ (vermutet) | wie oben |
| Desktop 1024×768 — kein Scroll | ⚠️ Grenzfall | Rechte Kolonne (ImagePositioner-Content) ist ≈570px hoch, verfügbarer Body-Space ≈510–540px; Komponente nutzt `lg:overflow-auto` in der Positioner-Wrapper-Div, d.h. innerer Scroll nur für den Positioner, Composer-Body selbst scrollt nicht (Brief-Konformität). Akzeptabel — Vom User in Realität zu bestätigen. |
| Mobile 390×844 / 375×667 — scroll OK | ✅ Body-Default `overflow-y-auto` greift unter `lg` | |
| Upload 200×200 / 3000×3000 / PDF | n/a (Client-Validierung vorhanden) | Runtime-Test durch User |
| Pan-Drag / Wheel-Zoom / Buttons / Reset | ✅ (Code review) | ImagePositioner-Math unverändert |
| Cover-Mode keine schwarzen Ränder | ✅ (`CoverImage` + `object-fit: cover`) | |
| Pay-Button disabled bis ready | ✅ (`canSubmit` gate) | |
| Stripe-Payload korrekt (layout/pan/zoom) | ✅ (siehe BidComposer handleSubmit) | |
| Space Mono / Black BG / Blue accent #60a5fa / Bracket-style | ✅ nach FAIL-1-Fix | |

Failure-Count nach Fix: **0**.
