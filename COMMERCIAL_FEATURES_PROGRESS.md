# TireOps - Commercial Features Implementation Progress

## Status Tracker

Last Updated: January 13, 2026

### Implementation Order

| # | Feature | Status | Files Changed |
|---|---------|--------|---------------|
| 1 | Sentry error monitoring | ✅ Complete | sentry.*.config.ts, next.config.js, global-error.tsx |
| 2 | Invoice print styles | ✅ Complete | globals.css, invoice/[orderId]/page.tsx |
| 3 | Terms of Service page | ✅ Complete | src/app/terms/page.tsx |
| 4 | Privacy Policy page | ✅ Complete | src/app/privacy/page.tsx |
| 5 | PDF export for invoices | ✅ Complete | invoice/[orderId]/page.tsx, html2pdf.js |
| 6 | Stripe subscription billing | ✅ Complete | src/lib/stripe.ts, api/stripe/*, pricing/page.tsx |
| 7 | Email notifications (Resend) | ✅ Complete | src/lib/email.ts, api/email/send/route.ts |
| 8 | SMS reminders (Twilio) | ✅ Complete | src/lib/twilio.ts, api/sms/send/route.ts |
| 9 | Onboarding flow | ✅ Complete | src/app/onboarding/page.tsx, AuthContext.tsx, DashboardLayout.tsx |
| 10 | Customer booking page | ✅ Complete | src/app/book/[shopSlug]/page.tsx, api/booking/*, settings/page.tsx |

---

## Feature 1: Sentry Error Monitoring

### What It Does
- Captures JavaScript errors in production
- Sends alerts when things break
- Tracks error frequency and user impact

### Implementation Steps
1. Install @sentry/nextjs package
2. Run Sentry wizard to configure
3. Add Sentry config files
4. Test error reporting

### Files Created/Modified
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `next.config.ts` (wrapped with Sentry)
- `.env.local` (add SENTRY_DSN)

### Environment Variables Needed
```
SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=tireops
```

---

## Feature 2: Invoice Print Styles

### What It Does
- Makes invoice page print-friendly
- Hides navigation, shows only invoice content
- Proper page breaks and margins

### Files Modified
- `src/app/invoice/[orderId]/page.tsx`
- `src/app/globals.css` (print media queries)

---

## Feature 3: Terms of Service

### What It Does
- Legal page required for SaaS
- Covers user responsibilities, liability, etc.

### Files Created
- `src/app/terms/page.tsx`

---

## Feature 4: Privacy Policy

### What It Does
- Required for GDPR/CCPA compliance
- Explains data collection and usage

### Files Created
- `src/app/privacy/page.tsx`

---

## Feature 5: PDF Export

### What It Does
- Generate downloadable PDF invoices
- Uses react-pdf or html2pdf

### Files Modified
- `src/app/invoice/[orderId]/page.tsx`
- New: PDF generation utility

### Packages Added
- `@react-pdf/renderer` or `html2pdf.js`

---

## Feature 6: Stripe Subscription Billing

### What It Does
- Monthly subscriptions for shop owners
- Pricing tiers (Basic $29, Pro $79, Enterprise $149)
- Customer portal for managing subscriptions

### Files Created
- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/portal/route.ts`
- `src/app/pricing/page.tsx`
- `src/lib/stripe.ts`

### Database Changes
- Add `subscriptions` table
- Add `subscription_status` to `shops` table

### Environment Variables
```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_BASIC=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_ENTERPRISE=price_xxx
```

---

## Feature 7: Email Notifications (Resend)

### What It Does
- Order confirmations
- Appointment reminders
- Low stock alerts
- Team invitations

### Files Created
- `src/lib/email.ts`
- `src/app/api/email/send/route.ts`
- Email templates in `src/emails/`

### Environment Variables
```
RESEND_API_KEY=re_xxx
EMAIL_FROM=notifications@tireops.com
```

---

## Feature 8: SMS Reminders (Twilio)

### What It Does
- Appointment reminders 24h and 1h before
- Order status updates
- Opt-in/opt-out management

### Files Created
- `src/lib/twilio.ts`
- `src/app/api/sms/send/route.ts`
- `src/app/api/sms/webhook/route.ts`

### Database Changes
- Add `sms_opt_in` to customers table
- Add `sms_reminders` table for scheduling

### Environment Variables
```
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Feature 9: Onboarding Flow

### What It Does
- Step-by-step wizard for new shop owners
- Set up shop profile (name, contact info, address)
- Add first customer (optional)
- Create first work order (optional)
- Automatic redirect for owners who haven't completed onboarding

### Files Created/Modified
- `src/app/onboarding/page.tsx` - Main onboarding wizard page
- `src/components/OnboardingWizard.tsx` - Reusable wizard component
- `src/contexts/AuthContext.tsx` - Added `needsOnboarding` flag
- `src/components/DashboardLayout.tsx` - Added onboarding redirect
- `src/middleware.ts` - Added onboarding to public paths
- `src/types/database.ts` - Added `onboarding_completed` to Shop type
- `src/lib/supabase/migrations.ts` - Added migration helper

### Database Changes
- Add `onboarding_completed` boolean to `shops` table (default: false)

### Migration SQL
```sql
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Mark existing shops as completed (they're already set up)
UPDATE shops SET onboarding_completed = true WHERE onboarding_completed IS NULL;
```

### How It Works
1. New shop owners are redirected to `/onboarding` automatically
2. Step 1: Fill in shop profile (required)
3. Step 2: Add first customer (optional, can skip)
4. Step 3: Create first work order (optional, can skip)
5. On completion, `onboarding_completed` is set to `true`
6. Users are redirected to the main dashboard

---

## Feature 10: Customer Booking Page

### What It Does
- Public booking page for customers (no login required)
- Shows available time slots based on business hours
- Automatic slot availability based on existing appointments
- Collects customer info (name, phone, email, vehicle)
- Sends confirmation SMS and email
- Creates customer and work order automatically

### Files Created/Modified
- `src/app/book/[shopSlug]/page.tsx` - Public booking wizard
- `src/app/api/booking/[shopSlug]/slots/route.ts` - Available slots API
- `src/app/api/booking/[shopSlug]/create/route.ts` - Booking creation API
- `src/app/settings/page.tsx` - Added "Booking" tab for settings
- `src/contexts/AuthContext.tsx` - Added booking fields to Shop type
- `src/types/database.ts` - Added BookingSettings type
- `src/middleware.ts` - Added /book to public paths
- `src/lib/supabase/migrations.ts` - Added booking migration SQL

### Database Changes
- Add `slug` VARCHAR(100) UNIQUE - for booking URL
- Add `booking_enabled` BOOLEAN - toggle online booking
- Add `booking_settings` JSONB - business hours, services, slot duration

### Migration SQL
```sql
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS booking_settings JSONB DEFAULT '{
  "business_hours": {
    "monday": {"open": "08:00", "close": "17:00", "enabled": true},
    ...
  },
  "slot_duration": 60,
  "buffer_time": 15,
  "max_days_ahead": 30,
  "services": ["Tire Installation", "Tire Rotation", ...]
}'::jsonb;

UPDATE shops SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);
```

### How It Works
1. Shop owner enables booking in Settings > Booking tab
2. Sets a unique URL slug (e.g., "big-boy-tires")
3. Customers visit `/book/big-boy-tires`
4. Step 1: Select service, date, and time slot
5. Step 2: Enter contact info
6. On submit:
   - Customer is created (or found by phone)
   - Work order is created with "pending" status
   - SMS confirmation sent to customer
   - Email confirmation sent (if email provided)
7. Customer sees confirmation with appointment details

---

## Resume Instructions

If you need to continue after a reset:

1. Open this file: `D:\Tire-Shop-MVP\COMMERCIAL_FEATURES_PROGRESS.md`
2. Check which feature is "In Progress"
3. Tell Claude: "Continue from Feature X in COMMERCIAL_FEATURES_PROGRESS.md"
4. Claude will pick up where we left off

---

## Commits Made

| Date | Commit Message | Features |
|------|----------------|----------|
| | | |

