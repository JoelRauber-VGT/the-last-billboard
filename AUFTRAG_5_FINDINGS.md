# Auftrag 5 — Findings

## Datum: 2026-04-17

## Existing Implementation

### Components Found

1. **HowItWorksButton** (`src/components/billboard/HowItWorksButton.tsx`)
   - Already exists, positioned bottom-left with glassmorphism styling
   - Uses `HelpCircle` icon from lucide-react
   - Positioned at `bottom-[68px] left-4`
   - Already integrated and wired to open the onboarding modal

2. **OnboardingModal** (`src/components/billboard/OnboardingModal.tsx`)
   - Basic implementation exists with 3 steps
   - Uses static icons: MousePointerClick, Swords, Lock
   - Has step indicator with clickable bars
   - Has auto-open logic (500ms delay on first visit)
   - Uses localStorage key: `hasSeenOnboarding`
   - Has Back/Next navigation
   - "Start bidding" button on last step navigates to `/bid`
   - Uses shadcn Dialog component
   - **NO animated treemap — just icons and text**

3. **FullscreenBillboard** (`src/components/billboard/FullscreenBillboard.tsx`)
   - Already integrates both HowItWorksButton and OnboardingModal
   - Uses `useOnboarding` hook for modal state management
   - Button at line 55, Modal at line 105

### Translations

- Onboarding translations already exist in `messages/en.json` under `landing.onboarding`
- Keys: `step1.title`, `step1.description`, `step2.title`, `step2.description`, `step3.title`, `step3.description`, `back`, `next`, `startBidding`
- Current descriptions are basic text, need to be updated for the new animated approach

### What Needs to Change

1. **Replace OnboardingModal completely** with new animated version that includes:
   - Animated mini-treemap instead of static icons
   - Ticker line showing live events
   - Three animation sequences (Place bid, Displace, Freeze)
   - New component structure under `src/components/onboarding/`

2. **Update translations** for all 4 languages (EN, DE, FR, ES) with:
   - New step descriptions that match the visual animations
   - Ticker event texts
   - Keep the same keys for backward compatibility

3. **Install framer-motion** for smooth animations

4. **Maintain existing integration**:
   - Keep localStorage key as `hasSeenOnboarding` (already used)
   - Keep auto-open logic (500ms delay)
   - Keep HowItWorksButton as trigger
   - Keep navigation to `/bid` on "Start bidding"

## Dev Server Status

- Running at http://localhost:3000
- Build is clean, no errors on startup
