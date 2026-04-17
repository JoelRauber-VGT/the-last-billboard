# The Last Billboard — Production Deployment Checklist

**Version:** 1.0
**Last Updated:** 2026-04-16
**Status:** Ready for Production Deployment

---

## Overview

This checklist guides you through deploying **The Last Billboard** to production. Follow each section in order, checking off items as you complete them.

**Estimated Time:** 2-4 hours for technical setup, plus time for legal compliance.

---

## Phase 1: Stripe Configuration (Payment Processing)

### 1.1 Create Stripe Live Account
- [ ] Go to [Stripe Dashboard](https://dashboard.stripe.com/)
- [ ] Complete business verification (provide business details, tax information)
- [ ] Activate your account (may take 1-3 business days for review)
- [ ] Enable payment methods (credit cards, SEPA, etc.)

### 1.2 Get Live API Keys
- [ ] In Stripe Dashboard, switch from **Test Mode** to **Live Mode** (toggle in top-right)
- [ ] Go to **Developers** → **API Keys**
- [ ] Copy **Publishable key** (starts with `pk_live_`)
- [ ] Copy **Secret key** (starts with `sk_live_`)
- [ ] **IMPORTANT:** Keep secret key secure, never commit to Git

### 1.3 Configure Webhook Endpoint
- [ ] Go to **Developers** → **Webhooks**
- [ ] Click **Add endpoint**
- [ ] Enter URL: `https://your-domain.com/api/webhooks/stripe`
  - Replace `your-domain.com` with your actual production domain
- [ ] Select events to listen for:
  - [x] `checkout.session.completed`
  - [x] `charge.refunded`
- [ ] Click **Add endpoint**
- [ ] Copy the **Signing secret** (starts with `whsec_`)

### 1.4 Test Live Mode
- [ ] Make a test transaction with a real credit card (charge €1)
- [ ] Verify webhook is received in Supabase logs
- [ ] Verify slot appears in billboard
- [ ] Issue a refund and verify it processes correctly
- [ ] **Important:** Only proceed if all tests pass

### 1.5 Stripe Configuration Summary
```env
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

## Phase 2: Supabase Configuration (Database & Auth)

### 2.1 Create Production Project
- [ ] Go to [Supabase Dashboard](https://app.supabase.com/)
- [ ] Click **New Project**
- [ ] Choose organization
- [ ] Enter project name: "the-last-billboard-prod"
- [ ] Choose region (closest to your target users)
- [ ] Generate strong database password (save securely!)
- [ ] Wait for project to provision (~2 minutes)

### 2.2 Apply Database Migrations
- [ ] Install Supabase CLI if not already installed:
  ```bash
  npm install -g supabase
  ```
- [ ] Link to your production project:
  ```bash
  supabase link --project-ref your-project-ref
  ```
  - Find project ref in Supabase Dashboard → Settings → General
- [ ] Apply all migrations:
  ```bash
  supabase db push
  ```
- [ ] Verify migrations applied successfully:
  - [ ] Go to Supabase Dashboard → Database → Tables
  - [ ] Confirm all tables exist: `profiles`, `slots`, `slot_history`, `transactions`, `reports`, `admin_audit_log`

### 2.3 Verify RLS Policies
- [ ] In Supabase Dashboard → Authentication → Policies
- [ ] Verify each table has RLS enabled
- [ ] Verify policies exist for each table:
  - **profiles:** Users can read/update own profile, admins see all
  - **slots:** Public read, authenticated insert/update own
  - **slot_history:** Public read
  - **transactions:** Users see own transactions, admins see all
  - **reports:** Authenticated users can insert, admins see all
  - **admin_audit_log:** Admins only

### 2.4 Configure Storage Bucket
- [ ] Go to Supabase Dashboard → Storage
- [ ] Verify `slot-images` bucket exists (created by migration)
- [ ] Configure public access:
  - [ ] Bucket is **public** (images need to be visible)
  - [ ] RLS policy allows authenticated users to upload
  - [ ] Maximum file size: 10MB
- [ ] Test upload:
  ```bash
  # Upload a test image via the app bid form
  # Verify it appears in Storage → slot-images
  ```

### 2.5 Configure Email Templates
- [ ] Go to Supabase Dashboard → Authentication → Email Templates
- [ ] Customize **Magic Link** template:
  - Add your branding (logo, colors)
  - Update sender name: "The Last Billboard"
  - Test magic link email delivery
- [ ] Configure email provider (optional):
  - By default, Supabase sends from `noreply@mail.app.supabase.io`
  - For custom domain, set up SendGrid/AWS SES in Settings → Auth

### 2.6 Get Production API Keys
- [ ] Go to Supabase Dashboard → Settings → API
- [ ] Copy **Project URL** (e.g., `https://xxx.supabase.co`)
- [ ] Copy **anon/public key** (starts with `eyJ`, safe for client-side)
- [ ] Copy **service_role key** (starts with `eyJ`, **keep secret!**)

### 2.7 Enable Realtime
- [ ] Go to Database → Replication
- [ ] Enable replication for tables:
  - [x] `slots`
  - [x] `slot_history`
- [ ] Save changes

### 2.8 Supabase Configuration Summary
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

---

## Phase 3: Domain & DNS Configuration

### 3.1 Domain Setup
- [ ] Purchase domain (if not already owned)
  - Recommended registrars: Namecheap, Cloudflare, Google Domains
- [ ] Add domain to Vercel:
  - [ ] Go to Vercel Dashboard → Your Project → Settings → Domains
  - [ ] Click **Add Domain**
  - [ ] Enter your domain: `thelastbillboard.com`
  - [ ] Vercel will provide DNS records to configure

### 3.2 Configure DNS Records
Configure these records at your DNS provider:

**A Record (for apex domain):**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: Auto
```

**CNAME Record (for www subdomain):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Auto
```

**Wait for DNS propagation** (can take 5 minutes to 48 hours, usually ~15 minutes)

### 3.3 Verify SSL Certificate
- [ ] In Vercel Dashboard → Domains, wait for SSL status to show "Active"
- [ ] Visit `https://your-domain.com` (note the `https`)
- [ ] Verify padlock icon in browser
- [ ] Test on [SSL Labs](https://www.ssllabs.com/ssltest/) (should get A+ rating)

### 3.4 Update Environment Variables
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain:
  ```env
  NEXT_PUBLIC_APP_URL=https://thelastbillboard.com
  ```
- [ ] Update Stripe webhook URL to production domain
- [ ] Update Supabase Site URL:
  - Go to Supabase Dashboard → Authentication → URL Configuration
  - Set Site URL: `https://thelastbillboard.com`
  - Add Redirect URLs:
    - `https://thelastbillboard.com/*/auth/callback`
    - `https://www.thelastbillboard.com/*/auth/callback`

---

## Phase 4: Vercel Deployment

### 4.1 Connect Repository
- [ ] Go to [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Click **Add New...** → **Project**
- [ ] Import your Git repository (GitHub, GitLab, or Bitbucket)
- [ ] Select "the-last-billboard" repository
- [ ] Vercel will auto-detect Next.js settings

### 4.2 Configure Build Settings
**Framework Preset:** Next.js (auto-detected)
**Root Directory:** `./` (default)
**Build Command:** `npm run build` (default)
**Output Directory:** `.next` (default)
**Install Command:** `npm install` (default)

- [ ] Leave defaults unless you have custom requirements

### 4.3 Set Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add all variables:

**Supabase:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Stripe:**
```env
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**App:**
```env
NEXT_PUBLIC_APP_URL=https://thelastbillboard.com
```

**Optional (Sentry):**
```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

- [ ] Set all variables for **Production** environment
- [ ] Click **Save**

### 4.4 Deploy
- [ ] Click **Deploy**
- [ ] Wait for build to complete (~2-3 minutes)
- [ ] Vercel will automatically deploy to your custom domain
- [ ] Visit your domain to verify deployment

### 4.5 Verify Deployment
- [ ] Homepage loads correctly
- [ ] Billboard renders with treemap
- [ ] Login with magic link works
- [ ] Bid form loads
- [ ] Admin panel accessible (for admin users)
- [ ] All 4 languages work (EN, DE, FR, ES)

---

## Phase 5: Application Configuration

### 5.1 Set Billboard End Date
- [ ] Open `src/lib/config.ts`
- [ ] Set `billboardEndsAt` to your desired freeze date:
  ```typescript
  billboardEndsAt: new Date('2026-12-31T23:59:59Z'), // Example: Dec 31, 2026
  ```
- [ ] Commit and push:
  ```bash
  git add src/lib/config.ts
  git commit -m "feat: set production billboard freeze date"
  git push
  ```
- [ ] Vercel will auto-deploy the update

### 5.2 Verify Commission Rate
- [ ] In `src/lib/config.ts`, verify:
  ```typescript
  commissionRate: 0.10, // 10% platform fee
  ```
- [ ] If you want a different rate, update and redeploy

### 5.3 Create First Admin User
- [ ] Have the first user sign up via the app
- [ ] This user will automatically become admin (first-user logic)
- [ ] Verify admin status:
  - [ ] Check Supabase Dashboard → Authentication → Users
  - [ ] Verify `profiles` table has `is_admin = true` for this user
  - [ ] Log in and verify "Admin" link appears in header

### 5.4 Create Additional Admin Users (Optional)
If you need more admins:
- [ ] Go to Supabase Dashboard → Table Editor → profiles
- [ ] Find the user you want to make admin
- [ ] Set `is_admin` to `true`
- [ ] Save

---

## Phase 6: Legal Compliance

### 6.1 Complete Imprint (Impressum)
**Required for Germany, Austria, Switzerland**

- [ ] Edit `src/app/[locale]/legal/imprint/page.tsx`
- [ ] Replace all placeholder text with real operator information:
  - [ ] Full legal name or company name
  - [ ] Complete address (street, postal code, city, country)
  - [ ] Contact email address
  - [ ] Phone number (if applicable)
  - [ ] VAT ID / Tax ID (if business registered)
  - [ ] Commercial register entry (if company)
- [ ] Remove yellow TODO box once completed
- [ ] Commit and deploy

**Example:**
```
Operator:
John Doe
Example Street 123
12345 Berlin, Germany
Email: legal@thelastbillboard.com
VAT ID: DE123456789
```

### 6.2 Update Privacy Policy
- [ ] Replace all `@example.com` email addresses with real ones:
  - [ ] `privacy@your-domain.com` for data protection inquiries
  - [ ] `support@your-domain.com` for general support
- [ ] If you have >250 employees or process sensitive data, add Data Protection Officer (DPO) contact
- [ ] Update "Last Updated" date to deployment date
- [ ] Commit and deploy

### 6.3 Update Terms of Service
- [ ] Replace `legal@example.com` with real legal contact email
- [ ] Specify applicable law (e.g., "These terms are governed by Swiss law")
- [ ] Specify jurisdiction (e.g., "Disputes shall be resolved in the courts of Zurich, Switzerland")
- [ ] **CRITICAL:** Have a lawyer review these terms before going live
- [ ] Update "Last Updated" date
- [ ] Commit and deploy

### 6.4 Sign Data Processing Agreements (DPAs)
- [ ] **Supabase:** Sign DPA in Supabase Dashboard → Organization → Legal
- [ ] **Stripe:** Sign DPA in Stripe Dashboard → Settings → Data Protection
- [ ] **Vercel:** Sign DPA (available for Pro and Enterprise plans)
- [ ] Keep copies of all signed DPAs on file

### 6.5 Cookie Consent (Already Implemented)
- [ ] Verify cookie banner shows on first visit
- [ ] Banner states "essential cookies only" (compliant by default)
- [ ] If you add analytics/tracking later, update banner and privacy policy

### 6.6 Legal Review Budget
**Recommended budget for legal compliance:**
- Lawyer review of all legal pages: €1,000 - 3,000
- Business registration (if needed): €100 - 500
- Liability insurance (annual): €500 - 2,000
- **Total estimated:** €1,600 - 5,500

---

## Phase 7: Monitoring & Analytics

### 7.1 Set Up Vercel Analytics (Included)
- [ ] Go to Vercel Dashboard → Your Project → Analytics
- [ ] Analytics are automatically enabled for your project
- [ ] Monitor:
  - Page views
  - Unique visitors
  - Top pages
  - Real-time visitors

### 7.2 Set Up Vercel Speed Insights (Optional, Free)
- [ ] Install package:
  ```bash
  npm install @vercel/speed-insights
  ```
- [ ] Add to root layout:
  ```tsx
  import { SpeedInsights } from '@vercel/speed-insights/next';

  export default function RootLayout({ children }) {
    return (
      <html>
        <body>
          {children}
          <SpeedInsights />
        </body>
      </html>
    );
  }
  ```
- [ ] Deploy and monitor Core Web Vitals

### 7.3 Set Up Sentry (Optional, Recommended)
- [ ] Create account at [Sentry.io](https://sentry.io/)
- [ ] Create new project for Next.js
- [ ] Copy DSN
- [ ] Add to Vercel environment variables:
  ```env
  NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
  ```
- [ ] Install Sentry SDK (optional, hooks already in code):
  ```bash
  npm install @sentry/nextjs
  ```
- [ ] Deploy and verify errors are tracked

### 7.4 Set Up Uptime Monitoring
Free options:
- [ ] [UptimeRobot](https://uptimerobot.com/) (free tier: 50 monitors)
- [ ] [Better Uptime](https://betteruptime.com/) (free tier: 10 monitors)

Configure:
- [ ] Monitor main domain: `https://thelastbillboard.com`
- [ ] Monitor API health: `https://thelastbillboard.com/api/health`
- [ ] Set check interval: 5 minutes
- [ ] Add email/SMS alerts for downtime

### 7.5 Set Up Error Alerts
- [ ] Vercel → Settings → Integrations → Slack (or email)
- [ ] Get notified of:
  - Build failures
  - Runtime errors
  - Function timeouts

---

## Phase 8: SEO & Search Engines

### 8.1 Submit Sitemap to Google
- [ ] Go to [Google Search Console](https://search.google.com/search-console/)
- [ ] Add property: `https://thelastbillboard.com`
- [ ] Verify ownership (multiple methods available)
- [ ] Submit sitemap: `https://thelastbillboard.com/sitemap.xml`
- [ ] Wait 1-7 days for indexing

### 8.2 Submit Sitemap to Bing
- [ ] Go to [Bing Webmaster Tools](https://www.bing.com/webmasters/)
- [ ] Add site: `https://thelastbillboard.com`
- [ ] Verify ownership
- [ ] Submit sitemap: `https://thelastbillboard.com/sitemap.xml`

### 8.3 Test Open Graph Images
- [ ] Facebook Debugger: https://developers.facebook.com/tools/debug/
  - [ ] Enter your URL
  - [ ] Click "Scrape Again"
  - [ ] Verify OG image appears correctly
- [ ] Twitter Card Validator: https://cards-dev.twitter.com/validator
  - [ ] Enter your URL
  - [ ] Verify card displays correctly
- [ ] LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
  - [ ] Test sharing a URL
  - [ ] Verify preview looks good

### 8.4 robots.txt Verification
- [ ] Visit `https://thelastbillboard.com/robots.txt`
- [ ] Verify it shows:
  ```
  User-agent: *
  Allow: /
  Disallow: /admin
  Disallow: /api

  Sitemap: https://thelastbillboard.com/sitemap.xml
  ```

---

## Phase 9: Performance & Security

### 9.1 Run Lighthouse Audit
- [ ] Open Chrome DevTools → Lighthouse
- [ ] Run audit on homepage (production URL)
- [ ] Verify scores:
  - [ ] Performance: >85
  - [ ] Accessibility: >90
  - [ ] Best Practices: >90
  - [ ] SEO: >90
- [ ] Fix any critical issues

### 9.2 Test on Real Devices
- [ ] iPhone (iOS Safari)
- [ ] Android (Chrome)
- [ ] iPad (tablet view)
- [ ] Desktop (Chrome, Firefox, Safari)
- [ ] Verify all features work on each device

### 9.3 Security Headers
Vercel automatically sets secure headers. Verify:
- [ ] Visit [SecurityHeaders.com](https://securityheaders.com/)
- [ ] Enter your domain
- [ ] Verify you get at least a **B** rating
- [ ] If lower, check Vercel security settings

### 9.4 HTTPS Enforcement
- [ ] Visit `http://thelastbillboard.com` (no 's')
- [ ] Verify automatic redirect to `https://`
- [ ] Vercel handles this by default

### 9.5 Rate Limiting (Optional but Recommended)
For additional security, consider:
- [ ] Vercel Pro plan includes DDoS protection
- [ ] Add rate limiting via middleware (already implemented for reports API)
- [ ] Monitor for abuse in Vercel logs

---

## Phase 10: Final Verification (Critical!)

### 10.1 Authentication Flow
- [ ] Sign up with new email address
- [ ] Receive magic link email
- [ ] Click link and verify login works
- [ ] Check dashboard loads
- [ ] Log out
- [ ] Log back in

### 10.2 Bidding Flow (End-to-End)
- [ ] Click "Place Bid"
- [ ] Fill out bid form:
  - [ ] Upload image (< 10MB)
  - [ ] Enter display name
  - [ ] Enter link URL
  - [ ] Choose brand color
  - [ ] Enter bid amount (minimum €1)
- [ ] Click "Submit Bid"
- [ ] Redirected to Stripe Checkout
- [ ] Complete payment with real card
- [ ] Redirected back to success page
- [ ] Verify slot appears in billboard
- [ ] Verify slot appears in dashboard
- [ ] Verify transaction recorded in Supabase

### 10.3 Displacement Flow
- [ ] Have second user bid higher on existing slot
- [ ] Verify first user's slot is displaced
- [ ] Verify refund is processed in Stripe (90% of original bid)
- [ ] Verify transaction shows as "refund" in Supabase
- [ ] Verify first user can see removed slot in dashboard

### 10.4 Reporting Flow
- [ ] Click on a slot to open details
- [ ] Click "Report" button
- [ ] Submit report with reason
- [ ] Verify success message
- [ ] Have 2 more users report the same slot (total 3 reports)
- [ ] Verify slot is automatically hidden after 3rd report
- [ ] Admin: Check `/admin/reports` to see open reports

### 10.5 Admin Dashboard
- [ ] Log in as admin
- [ ] Navigate to `/admin`
- [ ] Verify overview cards show correct data
- [ ] Check `/admin/reports` - verify reports appear
- [ ] Check `/admin/slots` - verify all slots listed
- [ ] Check `/admin/transactions` - verify transactions listed
- [ ] Check `/admin/users` - verify users listed
- [ ] Test one admin action (e.g., dismiss a report)
- [ ] Verify audit log records the action

### 10.6 Real-time Updates
- [ ] Open billboard in two browser windows
- [ ] Place bid in window 1
- [ ] Verify window 2 updates automatically (no refresh)
- [ ] Verify live ticker shows the event in both windows

### 10.7 Freeze Enforcement
- [ ] Temporarily set freeze date to past:
  ```typescript
  billboardEndsAt: new Date('2020-01-01T00:00:00Z')
  ```
- [ ] Commit, push, wait for deploy
- [ ] Verify "FROZEN" banner appears
- [ ] Verify bid buttons are disabled
- [ ] Verify API returns 403 when trying to bid
- [ ] Revert to real freeze date
- [ ] Deploy again

### 10.8 Internationalization
- [ ] Switch to German (DE)
  - [ ] Verify all UI text is in German
  - [ ] Verify no English fallbacks
- [ ] Switch to French (FR)
  - [ ] Verify all UI text is in French
- [ ] Switch to Spanish (ES)
  - [ ] Verify all UI text is in Spanish
- [ ] Switch back to English (EN)

### 10.9 Mobile Responsiveness
- [ ] Open site on mobile device (or DevTools mobile emulation)
- [ ] Verify hamburger menu works
- [ ] Verify billboard is scrollable/zoomable
- [ ] Verify bid form is usable
- [ ] Verify all buttons are tappable

### 10.10 Error Handling
- [ ] Try to upload image >10MB → verify error toast
- [ ] Try to bid with amount <€1 → verify error
- [ ] Visit non-existent page → verify 404 page shows
- [ ] Try to access `/admin` as non-admin → verify 404 (not 403)

---

## Phase 11: Launch Preparation

### 11.1 Backup Strategy
- [ ] Supabase backups are automatic (daily for free tier, point-in-time for paid)
- [ ] Verify backup settings in Supabase Dashboard → Settings → Backups
- [ ] Consider upgrading to paid plan for point-in-time recovery

### 11.2 Set Up Support Email
- [ ] Create `support@your-domain.com` email address
- [ ] Add to footer and contact forms
- [ ] Set up auto-responder (optional)
- [ ] Monitor for user inquiries

### 11.3 Prepare Announcement
- [ ] Draft launch announcement (blog post, social media)
- [ ] Prepare press release (optional)
- [ ] Set up social media accounts (Twitter, LinkedIn, etc.)
- [ ] Create shareable graphics

### 11.4 Final Code Commit
- [ ] Ensure all TODOs in code are resolved
- [ ] Update README with production URL
- [ ] Tag release:
  ```bash
  git tag -a v1.0.0 -m "Production release"
  git push origin v1.0.0
  ```

### 11.5 Team Briefing
- [ ] Brief team on production URL
- [ ] Share admin credentials securely
- [ ] Establish on-call rotation (if applicable)
- [ ] Create incident response plan

---

## Phase 12: Post-Launch Monitoring (First 24 Hours)

### 12.1 Monitor Vercel Logs
- [ ] Watch for errors in Vercel Dashboard → Logs
- [ ] Check function execution times
- [ ] Monitor for any 500 errors

### 12.2 Monitor Stripe Dashboard
- [ ] Watch for incoming payments
- [ ] Verify webhook deliveries
- [ ] Check for any failed charges

### 12.3 Monitor Supabase
- [ ] Check API usage in Supabase Dashboard → Reports
- [ ] Verify no RLS policy violations
- [ ] Monitor database size

### 12.4 Monitor Uptime
- [ ] Check uptime monitoring service
- [ ] Verify no downtime alerts
- [ ] Response times <500ms

### 12.5 User Feedback
- [ ] Monitor support email
- [ ] Check social media mentions
- [ ] Look for bug reports

---

## Rollback Plan (In Case of Emergency)

If critical issues arise:

### Quick Rollback
1. In Vercel Dashboard → Deployments
2. Find last stable deployment
3. Click "..." → "Promote to Production"
4. Takes effect immediately

### Database Rollback (Use Sparingly!)
1. In Supabase Dashboard → Settings → Backups
2. Select backup point
3. Click "Restore"
4. **WARNING:** This will lose data created after backup

### Contact Support
- **Vercel:** support@vercel.com or in-dashboard chat
- **Supabase:** support@supabase.io or Discord
- **Stripe:** https://support.stripe.com/

---

## Success Criteria

Your production deployment is successful when:

- ✅ All checklist items above are completed
- ✅ Full user journey works (signup → bid → payment → slot appears)
- ✅ Displacement and refunds work correctly
- ✅ Admin dashboard is accessible and functional
- ✅ All 4 languages work without errors
- ✅ Mobile experience is smooth
- ✅ Lighthouse scores >85 across the board
- ✅ No critical errors in logs (first 24 hours)
- ✅ Legal pages are complete (no placeholders)
- ✅ Monitoring and alerts are active

---

## Estimated Costs (Monthly)

| Service | Free Tier | Paid Tier | Recommended |
|---------|-----------|-----------|-------------|
| **Vercel** | Free (hobby) | $20/month (Pro) | Pro for production |
| **Supabase** | Free (500MB, 50k users) | $25/month (Pro) | Free to start, upgrade if needed |
| **Stripe** | Transaction fees only | 1.4% + €0.25 per EU card | Pay-as-you-go |
| **Domain** | - | €10-20/year | Required |
| **Sentry** | Free (5k errors/month) | $26/month (Team) | Free to start |
| **Uptime Monitoring** | Free | $7-15/month | Free tier sufficient |
| **Liability Insurance** | - | €40-160/month | Recommended |
| **Total (Minimum)** | ~€2/month + Stripe fees | - | - |
| **Total (Recommended)** | ~€70-120/month + fees | - | Includes Pro plans |

---

## Support & Resources

### Documentation
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Stripe: https://stripe.com/docs
- Vercel: https://vercel.com/docs

### Project Documentation
- `README.md` - Project overview and setup
- `AUFTRAG_1_COMPLETED.md` - Foundation implementation
- `AUFTRAG_2_COMPLETED.md` - Core logic implementation
- `AUFTRAG_3_COMPLETED.md` - Production readiness report
- `LEGAL_COMPLIANCE.md` - Legal requirements guide

### Community
- Next.js Discord: https://nextjs.org/discord
- Supabase Discord: https://discord.supabase.com/
- Stripe Discord: https://stripe.com/discord

---

## Final Notes

**Congratulations on reaching production!**

Remember:
- Start with test transactions before accepting real payments
- Monitor closely in the first 24-48 hours
- Have a rollback plan ready
- Keep backups of all credentials
- Update legal pages before public launch
- Consider liability insurance for platform operation

**This checklist should take 2-4 hours for technical setup.** Legal compliance and business registration may add 1-2 weeks depending on your jurisdiction.

---

**Last Updated:** 2026-04-16
**Version:** 1.0
**Next Review:** After first production deployment

