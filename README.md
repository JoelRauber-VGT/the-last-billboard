# The Last Billboard

A collaborative digital billboard where every bid reshapes the canvas. The Last Billboard is an innovative web application that combines art, economics, and technology to create a dynamic, ever-evolving digital canvas.

## ⚠️ Production Notice

**The Last Billboard is a production application.**

- Every change must be tested in isolation.
- No change may break existing functionality.
- All interactive elements must be 100% functional — no half-finished buttons, no dead links, no placeholder handlers.
- Before deploying: run the Manual Smoke Test below.

### Critical Invariants

The following behaviors must never regress:

1. **Displacement atomicity** — displaced slots trigger an atomic Postgres function (`process_bid`, migration 008). Refunds are calculated as 90% to the displaced owner, 10% retained as platform commission. Race-protection uses `SELECT … FOR UPDATE`.
2. **Freeze status** — when `/api/freeze-status` returns active (i.e. `isBillboardFrozen()` is true), bidding is disabled app-wide (`/bid` shows the frozen gate; `FreezeBanner` renders on the board).
3. **Auth flow** — Supabase Magic Link only. No password fields anywhere.
4. **Stripe webhook idempotency** — `/api/webhooks/stripe` must handle duplicate events safely. The current guard skips any transaction whose status is not `pending`, and the Zod schema validates metadata before any DB write.
5. **Realtime consistency** — the billboard canvas reflects DB state within ~2 s of any change (Supabase Realtime subscription + `useLiveTicker`).
6. **Admin-route existence leak** — every `/api/admin/*` endpoint returns **404** to non-admin callers (never 401/403). Matches `checkAdminAuth()` in `src/lib/admin/auth.ts`.

## Manual Smoke Test (run before every deploy)

1. **Auth** — Log in via Magic Link. Confirm session persists on reload.
2. **Billboard** — Open `/`. Confirm canvas renders, zoom (buttons + wheel) works, minimap tracks pan/zoom 1:1.
3. **Bid** — Place a bid end-to-end with Stripe test card (`4242 4242 4242 4242`). Confirm slot appears on the board via Realtime.
4. **Displacement** — Place a higher bid that displaces another owner. Confirm refund appears in the Stripe dashboard (status eventually `succeeded`) and `slot_history.ended_at` is set on the old row.
5. **Report** — Submit a report on a slot (authenticated). Confirm row in `reports` table.
6. **Admin** — Dismiss a report, export transactions CSV, toggle an admin flag (on a non-self user).
7. **Mobile** — Repeat steps 2–5 on a 390×844 viewport.
8. **Curl health-check** — `curl http://<host>/api/health` returns 200 `{status:"healthy", ...}`.

**If any step fails: do not deploy.**

## Tech Stack

### Core
- **Next.js 15.2** - React framework with App Router
- **TypeScript** - Type-safe development
- **React 19** - Latest React features

### Styling
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **Inter & Space Mono** - Google Fonts for typography

### Backend & Data
- **Supabase** - Backend as a service (authentication, database, storage)
- **@supabase/ssr** - Server-side rendering support
- **@supabase/supabase-js** - Supabase JavaScript client

### Forms & Validation
- **React Hook Form** - Performant form management
- **Zod** - TypeScript-first schema validation
- **@hookform/resolvers** - Form validation resolvers

### Utilities
- **next-intl** - Internationalization (i18n)
- **Lucide React** - Beautiful icon library
- **class-variance-authority** - Component variant management
- **clsx & tailwind-merge** - Conditional className utilities

## Setup Instructions

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase account (for backend services)

### Installation

#### 1. Clone the repository
```bash
git clone <repository-url>
cd the-last-billboard
```

#### 2. Install dependencies
```bash
npm install
```

#### 3. Set up Supabase

**Create a Supabase project:**
1. Go to [https://supabase.com](https://supabase.com) and create a new account (if you don't have one)
2. Create a new project
3. Wait for the database to be provisioned

**Run the database migration:**

Option A - Using Supabase CLI (recommended):
```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

Option B - Manual SQL execution:
1. Go to your Supabase project dashboard
2. Navigate to "SQL Editor"
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and run the SQL

**Get your Supabase credentials:**
1. Go to Project Settings → API
2. Copy the following values:
   - Project URL (NEXT_PUBLIC_SUPABASE_URL)
   - Anon/Public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Service Role key (SUPABASE_SERVICE_ROLE_KEY) - keep this secret!

#### 4. Configure environment variables
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 5. Run the development server
```bash
npm run dev
```

#### 6. Set up Stripe for payments

**Create a Stripe account:**
1. Go to [https://stripe.com](https://stripe.com) and create a new account (if you don't have one)
2. Navigate to the Dashboard → Developers → API keys
3. Copy your test API keys:
   - Publishable key (starts with `pk_test_`)
   - Secret key (starts with `sk_test_`)

**Add Stripe keys to your .env.local:**
```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

**Set up webhook for local development:**
1. Install Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Windows
   # Download from https://github.com/stripe/stripe-cli/releases/latest

   # Linux
   # Download from https://github.com/stripe/stripe-cli/releases/latest
   ```

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server (in a separate terminal):
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. Copy the webhook signing secret (starts with `whsec_`) from the output and add it to `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

**Test payment:**
- Use test card: `4242 4242 4242 4242`
- Any future expiry date (e.g., 12/34)
- Any 3-digit CVC (e.g., 123)
- Any ZIP code (e.g., 12345)

#### 7. Open [http://localhost:3000](http://localhost:3000) in your browser

#### 8. First user setup
The first user to log in will automatically be granted admin privileges:
1. Navigate to the login page
2. Enter your email address
3. Check your email for the magic link
4. Click the link to complete authentication
5. You're now logged in as the admin user!

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
the-last-billboard/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   │   └── ui/          # shadcn/ui components
│   ├── lib/             # Utility functions and configuration
│   ├── i18n/            # Internationalization setup
│   └── types/           # TypeScript type definitions
├── public/              # Static assets
└── supabase/            # Supabase configuration and migrations
```

## Features

- Real-time collaborative canvas
- Bidding system with displacement mechanics
- Multi-language support (EN, DE, FR, ES)
- Responsive design
- Type-safe development
- Modern UI components

## Configuration

The application configuration is centralized in `src/lib/config.ts`:
- Canvas dimensions and constraints
- Bidding mechanics and financial settings
- Upload limits and file types
- Internationalization settings

## Deployment

Before every deploy to production:

1. Run the [Manual Smoke Test](#manual-smoke-test-run-before-every-deploy) above end-to-end.
2. Verify every `Critical Invariant` still holds.
3. Ensure all required `env` vars (Supabase, Stripe, `LEGAL_*`, `ADMIN_BOOTSTRAP_EMAIL` if applicable) are set in the deploy target.
4. `npm run build` must succeed locally (`tsc --noEmit` clean, no ESLint errors).

Any regression of a Critical Invariant is a launch-blocker — roll back the deploy.

## License

[License information to be added]

## Contributing

[Contributing guidelines to be added]
