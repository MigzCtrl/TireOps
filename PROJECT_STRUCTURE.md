# Tire Shop MVP - Project Structure

## Overview

This document provides a complete overview of the project organization and where to find everything.

## Directory Structure

```
D:\Tire-Shop-MVP\
│
├── 📁 documentation/                  # All documentation and SQL files
│   ├── SETUP_GUIDE.md                # Complete step-by-step setup guide
│   ├── SCHEMA.sql                    # Database tables, indexes, and functions
│   ├── RLS_POLICIES.sql              # Row Level Security policies
│   └── SEED_DATA.sql                 # Sample data for testing
│
├── 📁 src/                           # Application source code
│   │
│   ├── 📁 app/                       # Next.js App Router pages
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page (redirects to dashboard)
│   │   ├── globals.css               # Global styles
│   │   │
│   │   ├── 📁 (auth)/                # Authentication routes (no sidebar)
│   │   │   └── 📁 login/
│   │   │       └── page.tsx          # Login page
│   │   │
│   │   └── 📁 (dashboard)/           # Protected dashboard routes (with sidebar)
│   │       ├── layout.tsx            # Dashboard layout with sidebar
│   │       ├── 📁 dashboard/
│   │       │   └── page.tsx          # Dashboard home (today's orders, alerts)
│   │       ├── 📁 customers/
│   │       │   ├── page.tsx          # Customer list
│   │       │   ├── 📁 new/
│   │       │   │   └── page.tsx      # New customer form
│   │       │   └── 📁 [id]/
│   │       │       └── page.tsx      # Customer details (to be created)
│   │       ├── 📁 vehicles/
│   │       │   └── page.tsx          # Vehicle list (to be created)
│   │       ├── 📁 inventory/
│   │       │   └── page.tsx          # Inventory list (to be created)
│   │       └── 📁 work-orders/
│   │           ├── page.tsx          # Work orders list (to be created)
│   │           ├── 📁 new/
│   │           │   └── page.tsx      # New work order form
│   │           └── 📁 [id]/
│   │               └── page.tsx      # Work order details (to be created)
│   │
│   ├── 📁 components/                # React components
│   │   ├── 📁 forms/
│   │   │   ├── CustomerForm.tsx      # Customer create/edit form
│   │   │   └── WorkOrderForm.tsx     # Work order creation form
│   │   ├── 📁 layout/
│   │   │   └── Sidebar.tsx           # Dashboard sidebar navigation
│   │   └── 📁 ui/
│   │       └── (reusable components) # Add your UI components here
│   │
│   ├── 📁 actions/                   # Server Actions (API layer)
│   │   ├── customers.ts              # Customer CRUD operations
│   │   ├── inventory.ts              # Inventory CRUD operations
│   │   └── work-orders.ts            # Work order operations
│   │
│   ├── 📁 lib/                       # Utilities and shared code
│   │   ├── types.ts                  # TypeScript type definitions
│   │   └── 📁 supabase/
│   │       ├── client.ts             # Browser Supabase client
│   │       ├── server.ts             # Server Supabase client
│   │       └── middleware.ts         # Auth middleware utilities
│   │
│   └── middleware.ts                 # Next.js middleware (auth protection)
│
├── 📄 Configuration Files
│   ├── package.json                  # Dependencies and scripts
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── next.config.js                # Next.js configuration
│   ├── tailwind.config.ts            # Tailwind CSS configuration
│   ├── postcss.config.mjs            # PostCSS configuration
│   ├── .eslintrc.json                # ESLint configuration
│   ├── .gitignore                    # Git ignore rules
│   ├── .env.example                  # Environment variables template
│   └── .env.local                    # Your environment variables (CREATE THIS)
│
└── 📄 Documentation
    ├── README.md                      # Project overview
    ├── INSTALLATION.md                # Quick installation guide
    ├── PROJECT_STRUCTURE.md           # This file
    └── documentation/                 # Detailed docs and SQL files
```

## Key Files Explained

### Application Entry Points

**`src/app/layout.tsx`**
- Root layout wrapping entire application
- Imports global CSS
- Sets up fonts

**`src/app/page.tsx`**
- Landing page
- Redirects authenticated users to dashboard

**`src/app/(dashboard)/layout.tsx`**
- Dashboard layout with sidebar
- Protects all dashboard routes (requires authentication)

### Authentication

**`src/app/(auth)/login/page.tsx`**
- Login form
- Uses Supabase Auth

**`src/middleware.ts`**
- Protects routes
- Redirects unauthenticated users to login
- Manages session cookies

### Data Layer (Server Actions)

**`src/actions/customers.ts`**
- `getCustomers()` - List customers with search
- `getCustomer(id)` - Get single customer
- `createCustomer()` - Add new customer
- `updateCustomer()` - Update customer
- `searchCustomerByPhone()` - Quick phone search

**`src/actions/inventory.ts`**
- `getInventory()` - List inventory with search
- `getInventoryBySize()` - Filter by tire size
- `getLowStockItems()` - Get items with low stock
- `createInventoryItem()` - Add new item
- `updateInventoryItem()` - Update item
- `deleteInventoryItem()` - Delete item (owner only)

**`src/actions/work-orders.ts`**
- `getWorkOrders()` - List work orders
- `getTodaysWorkOrders()` - Today's appointments
- `getWorkOrder(id)` - Get single work order with details
- `createWorkOrder()` - Create work order (atomic, decrements inventory)
- `updateWorkOrderStatus()` - Change work order status

### Supabase Clients

**`src/lib/supabase/client.ts`**
- Browser client for client components
- Use in "use client" components

**`src/lib/supabase/server.ts`**
- Server client for server components and actions
- Use in Server Components and Server Actions
- Includes service role client for admin operations

**`src/lib/supabase/middleware.ts`**
- Session management utilities
- Used by Next.js middleware

### Type Definitions

**`src/lib/types.ts`**
- TypeScript interfaces for all database tables
- Ensures type safety throughout the app

## Database Schema

Located in `documentation/SCHEMA.sql`:

### Tables

1. **shops** - Tire shop locations
2. **profiles** - User profiles (extends Supabase auth)
3. **customers** - Customer information
4. **vehicles** - Customer vehicles
5. **inventory** - Tire inventory
6. **work_orders** - Service appointments
7. **work_order_lines** - Line items on work orders

### Key Functions

- `create_work_order_with_lines()` - Atomic work order creation
- `get_user_shop_id()` - Get current user's shop
- `is_owner()` - Check if user is owner

### Security (RLS Policies)

- Users can only see data from their own shop
- Staff can view/edit but not delete inventory
- All operations are scoped to user's shop automatically

## Component Architecture

### Form Components

**CustomerForm** (`src/components/forms/CustomerForm.tsx`)
- Used for both create and edit
- Handles form submission
- Shows validation errors

**WorkOrderForm** (`src/components/forms/WorkOrderForm.tsx`)
- Complex form with multiple sections
- Customer/vehicle selection
- Dynamic line items
- Real-time total calculation
- Inventory filtering by vehicle tire size

### Layout Components

**Sidebar** (`src/components/layout/Sidebar.tsx`)
- Navigation menu
- Active route highlighting
- Logout button

## Data Flow

```
User Interaction
    ↓
Page Component (Server Component)
    ↓
Server Action (src/actions/)
    ↓
Supabase Client (src/lib/supabase/server.ts)
    ↓
Database (via RLS policies)
    ↓
Data Returned
    ↓
Page Re-renders
```

## Adding New Features

### To add a new page:

1. Create file in `src/app/(dashboard)/your-page/page.tsx`
2. Add navigation link in `src/components/layout/Sidebar.tsx`
3. Create server actions in `src/actions/your-feature.ts`
4. Add types to `src/lib/types.ts` if needed

### To add a new form:

1. Create component in `src/components/forms/YourForm.tsx`
2. Add server action for submission
3. Create page that uses the form

### To add database table:

1. Add SQL to `documentation/SCHEMA.sql`
2. Add RLS policies to `documentation/RLS_POLICIES.sql`
3. Add TypeScript types to `src/lib/types.ts`
4. Create server actions in `src/actions/`

## Configuration

### Environment Variables (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=          # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Public API key
SUPABASE_SERVICE_ROLE_KEY=         # Private API key (keep secret!)
```

### Important npm Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Run production build
npm run lint     # Run ESLint
```

## Missing Pages (To Be Implemented)

These pages are referenced but not yet created:

- `src/app/(dashboard)/customers/[id]/page.tsx` - Customer details
- `src/app/(dashboard)/vehicles/page.tsx` - Vehicle list
- `src/app/(dashboard)/inventory/page.tsx` - Inventory list
- `src/app/(dashboard)/work-orders/page.tsx` - Work orders list
- `src/app/(dashboard)/work-orders/[id]/page.tsx` - Work order details

You can create these following the same patterns as the existing pages.

## Best Practices

1. **Always use Server Actions** for data mutations
2. **Use Server Components** by default (they're faster)
3. **Only use "use client"** when you need interactivity
4. **Keep business logic** in Server Actions, not components
5. **Use TypeScript types** from `src/lib/types.ts`
6. **Test RLS policies** before deploying to production

## Useful Development Tips

1. Check browser console (F12) for client-side errors
2. Check terminal for server-side errors
3. Use Supabase dashboard to inspect database
4. Use Supabase logs to debug auth issues
5. Clear cookies if you have auth issues

## Getting Help

- **Installation**: See `INSTALLATION.md`
- **Detailed Setup**: See `documentation/SETUP_GUIDE.md`
- **Database Schema**: See `documentation/SCHEMA.sql`
- **Security Policies**: See `documentation/RLS_POLICIES.sql`
