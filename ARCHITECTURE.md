# TireOps Architecture & Workflow Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Directory Structure](#directory-structure)
4. [Database Schema](#database-schema)
5. [User Workflows](#user-workflows)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [API Reference](#api-reference)
8. [Component Map](#component-map)

---

## System Overview

**TireOps** is a multi-tenant SaaS application for tire shop management built with:

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes, Server Actions |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth (email/password) |
| Payments | Stripe (subscriptions, checkout) |
| Email | Resend |
| SMS | Twilio |
| Hosting | Vercel |

---

## Architecture Diagram

```
+-----------------------------------------------------------------------------+
|                              CLIENT (Browser)                                |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +--------------+  +--------------+  +--------------+  +--------------+    |
|  |   Landing    |  |    Auth      |  |  Dashboard   |  |   Public     |    |
|  |    Page      |  |  (Login/     |  |   Pages      |  |  Booking     |    |
|  |     /        |  |  Register)   |  |              |  |  /book/[slug]|    |
|  +--------------+  +--------------+  +--------------+  +--------------+    |
|                                                                             |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                           MIDDLEWARE (middleware.ts)                         |
|  +-----------------------------------------------------------------------+  |
|  |  - Auth check (Supabase session)                                      |  |
|  |  - Public routes: /, /login, /register, /book/*, /terms, /privacy    |  |
|  |  - Protected routes: /customers, /inventory, /work-orders, etc.      |  |
|  |  - Redirect logic for auth state                                      |  |
|  +-----------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                              NEXT.JS APP ROUTER                              |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-----------------------------+    +-------------------------------+      |
|  |        PAGES (UI)           |    |        API ROUTES             |      |
|  +-----------------------------+    +-------------------------------+      |
|  | /                  Landing  |    | /api/stripe/checkout  Payments|      |
|  | /login             Auth     |    | /api/stripe/portal    Billing |      |
|  | /register          Auth     |    | /api/stripe/webhook   Webhooks|      |
|  | /onboarding        Setup    |    | /api/booking/[slug]/slots     |      |
|  | /customers         CRUD     |    | /api/booking/[slug]/create    |      |
|  | /customers/[id]    Detail   |    | /api/email/send       Email   |      |
|  | /inventory         CRUD     |    | /api/sms/send         SMS     |      |
|  | /work-orders       CRUD     |    +-------------------------------+      |
|  | /analytics         Reports  |                                           |
|  | /settings          Config   |    +-------------------------------+      |
|  | /invoice/[id]      Print    |    |      SERVER ACTIONS           |      |
|  | /pricing           Plans    |    +-------------------------------+      |
|  | /book/[slug]       Public   |    | /app/actions/customers.ts     |      |
|  | /terms             Legal    |    | /app/actions/vehicles.ts      |      |
|  | /privacy           Legal    |    +-------------------------------+      |
|  +-----------------------------+                                           |
|                                                                             |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                            CONTEXTS & STATE                                  |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-------------------------+    +-----------------------------------+      |
|  |     AuthContext         |    |         ThemeContext              |      |
|  +-------------------------+    +-----------------------------------+      |
|  | - user (Supabase User)  |    | - theme (dark/light)              |      |
|  | - profile (Profile)     |    | - toggleTheme()                   |      |
|  | - shop (Shop)           |    +-----------------------------------+      |
|  | - needsOnboarding       |                                               |
|  | - loading               |                                               |
|  | - signIn/signOut        |                                               |
|  +-------------------------+                                               |
|                                                                             |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                           EXTERNAL SERVICES                                  |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +---------------+  +---------------+  +---------------+  +-------------+  |
|  |   SUPABASE    |  |    STRIPE     |  |    RESEND     |  |   TWILIO    |  |
|  +---------------+  +---------------+  +---------------+  +-------------+  |
|  | - PostgreSQL  |  | - Checkout    |  | - Email Send  |  | - SMS Send  |  |
|  | - Auth        |  | - Portal      |  | - Templates   |  | - Templates |  |
|  | - RLS         |  | - Webhooks    |  |               |  |             |  |
|  | - Realtime    |  | - Customers   |  |               |  |             |  |
|  +---------------+  +---------------+  +---------------+  +-------------+  |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

## Directory Structure

```
src/
|-- app/                          # Next.js App Router
|   |-- layout.tsx                # Root layout (providers, fonts)
|   |-- page.tsx                  # Landing/Dashboard (auth-dependent)
|   |-- error.tsx                 # Error boundary
|   |-- global-error.tsx          # Global error handler
|   |
|   |-- login/page.tsx            # Login page
|   |-- register/page.tsx         # Registration page
|   |-- onboarding/page.tsx       # First-time setup wizard
|   |
|   |-- customers/                # Customer management
|   |   |-- page.tsx              # Customer list
|   |   |-- [id]/page.tsx         # Customer detail
|   |   +-- _components/          # Customer-specific components
|   |
|   |-- inventory/page.tsx        # Inventory management
|   |
|   |-- work-orders/              # Work order management
|   |   |-- page.tsx
|   |   +-- _components/
|   |
|   |-- analytics/page.tsx        # Analytics dashboard
|   |-- settings/page.tsx         # Shop settings
|   |-- invoice/[orderId]/page.tsx # Printable invoice
|   |-- invite/[token]/page.tsx   # Team invite acceptance
|   |
|   |-- book/[shopSlug]/page.tsx  # Public customer booking
|   |-- pricing/page.tsx          # Pricing plans
|   |-- terms/page.tsx            # Terms of service
|   |-- privacy/page.tsx          # Privacy policy
|   |
|   |-- api/                      # API Routes
|   |   |-- stripe/
|   |   |   |-- checkout/route.ts
|   |   |   |-- portal/route.ts
|   |   |   +-- webhook/route.ts
|   |   |-- booking/[shopSlug]/
|   |   |   |-- slots/route.ts
|   |   |   +-- create/route.ts
|   |   |-- email/send/route.ts
|   |   +-- sms/send/route.ts
|   |
|   +-- actions/                  # Server Actions
|       |-- customers.ts
|       +-- vehicles.ts
|
|-- components/                   # Shared components
|   |-- ui/                       # shadcn/ui components
|   |   |-- button.tsx
|   |   |-- input.tsx
|   |   |-- dialog.tsx
|   |   |-- select.tsx
|   |   |-- calendar.tsx
|   |   +-- ...
|   |-- DashboardLayout.tsx       # Main app layout with sidebar
|   |-- LandingPage.tsx           # Marketing landing page
|   |-- OnboardingWizard.tsx      # Setup wizard component
|   |-- DateTimePicker.tsx        # Date/time selector
|   +-- ...
|
|-- contexts/                     # React Contexts
|   |-- AuthContext.tsx           # User/shop state
|   +-- ThemeContext.tsx          # Dark/light mode
|
|-- hooks/                        # Custom React hooks
|   |-- use-debounce.ts
|   |-- use-filters.ts
|   |-- use-pagination.ts
|   |-- use-sort.ts
|   +-- use-toast.ts
|
|-- lib/                          # Utilities & services
|   |-- supabase/
|   |   |-- client.ts             # Browser client
|   |   |-- server.ts             # Server client
|   |   +-- migrations.ts         # DB migration helpers
|   |-- stripe.ts                 # Stripe utilities
|   |-- email.ts                  # Resend email service
|   |-- twilio.ts                 # Twilio SMS service
|   |-- utils.ts                  # General utilities
|   +-- validations/schemas.ts    # Zod schemas
|
|-- types/                        # TypeScript types
|   +-- database.ts               # DB entity types
|
+-- middleware.ts                 # Auth middleware
```

---

## Database Schema

```
+-----------------------------------------------------------------------------+
|                              DATABASE ENTITIES                               |
+-----------------------------------------------------------------------------+

+------------------+       +------------------+       +------------------+
|      SHOPS       |       |     PROFILES     |       |    CUSTOMERS     |
+------------------+       +------------------+       +------------------+
| id (PK)          |<--+   | id (PK)          |       | id (PK)          |
| name             |   |   | user_id (FK)     |       | shop_id (FK)     |--+
| address          |   |   | shop_id (FK)     |-------| name             |  |
| phone            |   |   | email            |       | email            |  |
| email            |   +---| full_name        |       | phone            |  |
| tax_rate         |       | role             |       | address          |  |
| currency         |       +------------------+       | tire_size        |  |
| booking_enabled  |                                  | notes            |  |
| booking_settings |                                  | order_count      |  |
| slug             |                                  +------------------+  |
| onboarding_done  |                                           |            |
| stripe_cust_id   |                                           |            |
+------------------+                                           v            |
        |                                             +------------------+  |
        |                                             |     VEHICLES     |  |
        |                                             +------------------+  |
        |                                             | id (PK)          |  |
        |                                             | customer_id (FK) |<-+
        |                                             | shop_id (FK)     |
        |                                             | year, make       |
        |                                             | model, trim      |
        |                                             | tire_size, plate |
        |                                             | vin, notes       |
        |                                             +------------------+
        |
        |         +------------------+       +------------------+
        |         |   WORK_ORDERS    |       |    INVENTORY     |
        |         +------------------+       +------------------+
        +-------->| id (PK)          |       | id (PK)          |<---------+
                  | shop_id (FK)     |       | shop_id (FK)     |          |
                  | customer_id (FK) |       | brand            |          |
                  | tire_id (FK)     |-------| model            |          |
                  | status           |       | size             |          |
                  | service_type     |       | price            |          |
                  | scheduled_date   |       | quantity         |          |
                  | scheduled_time   |       | sku              |          |
                  | notes            |       | min_quantity     |          |
                  | total_amount     |       +------------------+          |
                  +------------------+                                     |
                           |                                               |
                           v                                               |
                  +------------------+                                     |
                  | WORK_ORDER_ITEMS |                                     |
                  +------------------+                                     |
                  | id (PK)          |                                     |
                  | work_order_id(FK)|                                     |
                  | tire_id (FK)     |-------------------------------------+
                  | quantity         |
                  | unit_price       |
                  | subtotal         |
                  +------------------+

                  +------------------+
                  |      TASKS       |
                  +------------------+
                  | id (PK)          |
                  | shop_id (FK)     |
                  | user_id (FK)     |
                  | title            |
                  | completed        |
                  +------------------+


ROW LEVEL SECURITY (RLS):
-------------------------
All tables have RLS enabled with policies that ensure:
- Users can only access data for their shop_id
- shop_id is automatically set on INSERT based on user profile
- SELECT/UPDATE/DELETE filtered by shop_id match
```

---

## User Workflows

### 1. New User Registration Flow

```
+---------+     +---------+     +---------+     +---------+     +---------+
| Landing |---->|Register |---->|Onboard- |---->| Select  |---->|Dashboard|
|  Page   |     |  Page   |     |   ing   |     |  Plan   |     |         |
+---------+     +---------+     +---------+     +---------+     +---------+
     |               |               |               |               |
   Visit /      Create account   Setup shop     Choose tier     Start using
               (email/password)  name, phone,   (Free/Pro/      the app
                Creates:         first order    Enterprise)
                - auth.users
                - shops
                - profiles
```

### 2. Customer Booking Flow (Public)

```
+-------------+     +-------------+     +-------------+     +-------------+
|   Visit     |---->|   Select    |---->|   Choose    |---->|   Enter     |
|/book/[slug] |     |   Service   |     | Date & Time |     |   Details   |
+-------------+     +-------------+     +-------------+     +-------------+
                                                                   |
                                                                   v
                                                            +-------------+
                                                            | Confirmation|
                                                            |  + Email    |
                                                            |  + SMS      |
                                                            +-------------+

API Calls:
- GET /api/booking/[slug]/slots - Get available time slots
- POST /api/booking/[slug]/create - Create booking (work order)
```

### 3. Work Order Lifecycle

```
+----------+     +------------+     +----------+     +----------+
| PENDING  |---->|IN_PROGRESS |---->|COMPLETED |     |CANCELLED |
+----------+     +------------+     +----------+     +----------+
     |                |                  |                ^
  Created by      Technician        Service done     Can cancel
  staff or        starts work       Invoice ready    at any stage
  online booking
```

### 4. Daily Shop Operations

```
Morning:
+----------+     +----------+     +----------+
|  Login   |---->| Dashboard|---->|  Check   |
|          |     | Overview |     | Calendar |
+----------+     +----------+     +----------+
                      |
          +-----------+-----------+
          v                       v
    +----------+           +----------+
    |  Review  |           |  Check   |
    | Pending  |           |Low Stock |
    |  Orders  |           |  Alerts  |
    +----------+           +----------+

Throughout Day:
+----------+     +----------+     +----------+     +----------+
|  Create  |---->|  Update  |---->| Generate |---->|   Send   |
|  Orders  |     |  Status  |     | Invoices |     | Notifs   |
+----------+     +----------+     +----------+     +----------+
```

---

## Data Flow Diagrams

### Authentication Flow

```
+--------+     +------------+     +------------+     +------------+
|  User  |---->| Supabase   |---->| Middleware |---->|AuthContext |
|        |     |   Auth     |     |            |     |            |
+--------+     +------------+     +------------+     +------------+
    |               |                   |                  |
    |   1. Login    |                   |                  |
    |-------------->|                   |                  |
    |               |  2. Session       |                  |
    |               |----------------->|                   |
    |               |                   |  3. Check auth   |
    |               |                   |----------------->|
    |               |                   |  4. Load profile |
    |               |<------------------------------------|
    |               |  5. User + Shop   |                  |
    |<----------------------------------------------------|
```

### Data Query Flow (Example: Customers Page)

```
+-------------+     +-------------+     +-------------+     +-------------+
|  Customers  |     | AuthContext |     |  Supabase   |     |  Database   |
|    Page     |     |             |     |   Client    |     | (PostgreSQL)|
+-------------+     +-------------+     +-------------+     +-------------+
      |                   |                   |                    |
      |  1. Get shop_id   |                   |                    |
      |------------------>|                   |                    |
      |<------------------|                   |                    |
      |                   |                   |                    |
      |  2. Query customers                   |                    |
      |-------------------------------------->|                    |
      |                   |                   |  3. SELECT with    |
      |                   |                   |     RLS filter     |
      |                   |                   |------------------->|
      |                   |                   |<-------------------|
      |<--------------------------------------|                    |
      |  4. Render list   |                   |                    |
```

---

## API Reference

### Stripe APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/stripe/checkout | POST | Create Stripe checkout session |
| /api/stripe/portal | POST | Create billing portal session |
| /api/stripe/webhook | POST | Handle Stripe webhooks |

### Booking APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/booking/[shopSlug]/slots | GET | Get available time slots |
| /api/booking/[shopSlug]/create | POST | Create a new booking |

### Notification APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/email/send | POST | Send email via Resend |
| /api/sms/send | POST | Send SMS via Twilio |

---

## Component Map

### Layout Components

```
+-----------------------------------------------------------------------------+
|                           DashboardLayout                                    |
+-----------------------------------------------------------------------------+
|  +-------------+  +-----------------------------------------------------+  |
|  |   Sidebar   |  |                  Main Content                        |  |
|  |             |  |  +-------------------------------------------------+|  |
|  | - Dashboard |  |  |              Page Component                     ||  |
|  | - Customers |  |  |                                                 ||  |
|  | - Inventory |  |  |  (customers/page.tsx, inventory/page.tsx,       ||  |
|  | - Orders    |  |  |   work-orders/page.tsx, etc.)                   ||  |
|  | - Analytics |  |  |                                                 ||  |
|  | - Settings  |  |  +-------------------------------------------------+|  |
|  +-------------+  +-----------------------------------------------------+  |
+-----------------------------------------------------------------------------+
```

### Reusable Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Button | ui/button.tsx | Styled button variants |
| Input | ui/input.tsx | Form input field |
| Select | ui/select.tsx | Dropdown selector |
| Dialog | ui/dialog.tsx | Modal dialogs |
| Calendar | ui/calendar.tsx | Date picker |
| DateTimePicker | DateTimePicker.tsx | Combined date/time selector |
| Table | ui/table.tsx | Data tables |
| Badge | ui/badge.tsx | Status badges |
| Toast/Toaster | ui/toast.tsx | Notifications |

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# Resend
RESEND_API_KEY=re_xxx
EMAIL_FROM=TireOps <notifications@tireops.xyz>
```

---

## Quick Reference: Where to Find Things

| Need to... | Look in... |
|------------|------------|
| Add a new page | src/app/[route]/page.tsx |
| Add an API endpoint | src/app/api/[route]/route.ts |
| Modify auth logic | src/contexts/AuthContext.tsx + src/middleware.ts |
| Add a database type | src/types/database.ts |
| Add a UI component | src/components/ui/ |
| Add a custom hook | src/hooks/ |
| Modify email templates | src/lib/email.ts |
| Modify SMS templates | src/lib/twilio.ts |
| Add Supabase queries | src/lib/queries/ |
| Add validation schemas | src/lib/validations/schemas.ts |

---

*Last Updated: January 2025*
