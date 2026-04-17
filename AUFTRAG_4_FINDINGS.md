# Auftrag 4 — Phase 0 Findings

**Date:** 2026-04-17
**Dev Server:** Running on http://localhost:3001

## Installed shadcn/ui Components

Currently installed:
- ✅ badge
- ✅ button
- ✅ card
- ✅ dialog
- ✅ dropdown-menu
- ✅ empty-state
- ✅ form
- ✅ input
- ✅ label
- ✅ select
- ✅ sheet
- ✅ table
- ✅ textarea

**Need to install:**
- ❌ accordion (for FAQ)
- ❌ alert (for error states)
- ❌ tooltip (for UI hints)
- ❌ separator (for visual breaks)
- ❌ avatar (possibly for user display)
- ❌ tabs (possibly useful)

## Issues Found by Component/Page

### 1. Header (`src/components/nav/Header.tsx`)
**Current State:**
- Uses solid `bg-background` with `border-b`
- Logo text is clean (no visible border/outline issues in code)
- Already has MobileNav component using Sheet
- LanguageSwitcher exists

**Issues:**
- ❌ Not using glassmorphism design (should be `background: rgba(255,255,255,0.85)` + `backdrop-filter: blur(12px)`)
- ❌ No sticky blur effect
- ❌ Mobile nav works but may need styling verification

**Files to change:**
- `src/components/nav/Header.tsx`

---

### 2. Landing Page (`src/app/[locale]/page.tsx`)
**Current State:**
- Traditional sectioned layout:
  - Hero section with large centered title
  - Explanation section with "How it works" heading
  - Preview section with Billboard in 2/3 grid + LiveTicker on side
  - Countdown section at bottom
- Billboard has border and is contained in aspect-video div
- LiveTicker is in a side column

**Issues:**
- ❌ Billboard is NOT fullscreen/immersive - it's contained in a grid
- ❌ No fullscreen hero with floating overlays
- ❌ Large centered "The Last Billboard" title takes up hero space
- ❌ "How it works" is a full section, not a modal
- ❌ No onboarding modal system
- ❌ No stats bar at bottom with live countdown
- ❌ No "? How it works" floating button
- ❌ No zoom controls overlay
- ❌ LiveTicker positioning is in grid, not floating overlay
- ❌ No billboard mockup for empty state (uses loading message)

**Files to change:**
- `src/app/[locale]/page.tsx` (major restructure)
- Create: `src/components/billboard/OnboardingModal.tsx`
- Create: `src/components/billboard/BillboardMockup.tsx`
- Create: `src/components/billboard/StatsBar.tsx`
- Modify: `src/components/billboard/BillboardPreview.tsx`

---

### 3. Bid Form (`src/app/[locale]/bid/page.tsx`)
**Current State:**
- Uses shadcn Card, Form, Input, Button components
- Has custom error div (red background)
- Image upload uses native file input (line 336-348)
- Color picker uses native input type="color" (line 397-400)

**Issues:**
- ❌ Native `<input type="file">` visible (line 339)
- ❌ Native `<input type="color">` visible (line 397)
- ❌ No custom dropzone for image upload
- ❌ No color swatch picker (8-10 predefined colors)
- ❌ Error display uses custom div, not shadcn Alert component
- ❌ No specific "Unknown error" text found, but generic error handling could be better

**Files to change:**
- `src/app/[locale]/bid/page.tsx`
- Create: `src/components/bid/ImageUpload.tsx`
- Create: `src/components/bid/ColorPicker.tsx`

---

### 4. About Page (`src/app/[locale]/about/page.tsx`)
**Current State:**
- Max-width container with prose styling
- Sections for Concept, How It Works, Pricing, Freeze, Technology, FAQ, Philosophy
- FAQ uses div wrappers with h3 headers (lines 103-124)
- Pricing is plain text paragraphs

**Issues:**
- ❌ FAQ does not use shadcn Accordion - just divs with bold headers
- ❌ Pricing section is plain text, not structured Card with rows
- ❌ No visual hierarchy beyond text
- ❌ Philosophy section not visually separated

**Files to change:**
- `src/app/[locale]/about/page.tsx`

---

### 5. Translation Keys Check

**English (`messages/en.json`):**
- ✅ Comprehensive, well-structured
- ✅ All major keys present: nav, landing, auth, dashboard, admin, about, footer, bid, errors, billboard, ticker, report, meta, legal

**Preliminary assessment:** Need to verify other languages have matching keys.

**To check:**
- ❌ German (`messages/de.json`)
- ❌ French (`messages/fr.json`)
- ❌ Spanish (`messages/es.json`)
- ❌ Browser test all 4 languages on all pages

**Specific known issue from requirements:**
- Cookie banner showing `legal.cookieBanner.accept` - need to verify

---

### 6. Loading/Empty/Error States

**Current State:**
- BillboardPreview has loading state (line 26-31 in BillboardPreview.tsx)
- Uses text "Loading billboard..."
- Empty state shows in t('emptyState') from translations

**Issues:**
- ❌ Loading state is plain text, not skeleton loader with pulsing blocks
- ❌ Empty billboard state: no mockup with fake slots
- ❌ Need to verify Empty states on Dashboard, Admin
- ❌ Need to verify Error states use Alert component everywhere
- ❌ No custom 404 page checked yet

**Files to check:**
- `src/components/billboard/BillboardPreview.tsx`
- `src/components/billboard/BillboardCanvas.tsx`
- `src/app/[locale]/dashboard/page.tsx`
- `src/app/not-found.tsx` or `src/app/[locale]/not-found.tsx`

---

### 7. Mobile Optimization

**Need to test on iPhone 14 Pro (390x844):**
- ❌ Header hamburger menu
- ❌ Billboard touch interactions
- ❌ Bid form full width, no horizontal scroll
- ❌ Stats bar 2×2 grid
- ❌ About/FAQ padding and font sizes

---

### 8. Typography & Consistency

**Need to verify:**
- ❌ Space Mono used for ALL numbers (prices, countdown, stats)
- ❌ Inter used for all UI text
- ❌ Consistent Tailwind spacing (gap-2, gap-4, gap-6, etc.)
- ❌ No magic numbers in styles
- ❌ Cursor pointer on all clickable elements
- ❌ Hover states on all interactive elements

---

## Summary of Work Needed

### High Priority (Major UI Changes):
1. **Landing Page Redesign** - Fullscreen billboard hero with overlays
2. **Onboarding Modal** - 3-step slider, auto-opens on first visit
3. **Bid Form Custom Components** - Dropzone + Color swatches
4. **About Page** - Accordion FAQ + structured Pricing card

### Medium Priority (Component Fixes):
5. **Header Glassmorphism** - Transparent blur effect
6. **Install Missing shadcn Components** - Accordion, Alert, Tooltip, Separator
7. **Translation Keys** - Verify all 4 languages, fix cookie banner

### Low Priority (Polish):
8. **Loading States** - Skeleton loaders with pulsing
9. **Empty States** - Billboard mockup, proper EmptyState components
10. **Mobile Testing** - Full responsive verification
11. **Typography Audit** - Space Mono for numbers, consistent spacing

---

## Next Steps

1. ✅ Install missing shadcn components
2. Start with Fix 1 (Header)
3. Proceed through Fixes 2-9 sequentially
4. Run full verification (all 22 checks)
5. Create AUFTRAG_4_COMPLETED.md with screenshots
