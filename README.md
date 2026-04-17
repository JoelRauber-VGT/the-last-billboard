# The Last Billboard

A collaborative digital billboard where every bid reshapes the canvas. The Last Billboard is an innovative web application that combines art, economics, and technology to create a dynamic, ever-evolving digital canvas.

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

## License

[License information to be added]

## Contributing

[Contributing guidelines to be added]
