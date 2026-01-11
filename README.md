# TireOps

A modern, multi-tenant SaaS web application for tire shop owners to manage their entire business operations.

## Features

### Dashboard
- Real-time business metrics (revenue, pending orders, low stock alerts, appointments)
- Interactive monthly calendar with appointment indicators
- Quick tasks todo list with real-time sync across users
- Quick action buttons for common workflows

### Work Orders
- Create, edit, and delete work orders
- Schedule appointments with 5-minute interval precision (5 AM - 9 PM)
- Automatic double-booking conflict detection
- Link orders to customers and their vehicles
- Add tires/items from inventory with quantity selection
- Status tracking (pending, in progress, completed, cancelled)
- Automatic total calculation with configurable tax rates
- Real-time inventory updates when adding tires to orders

### Customer Management
- Customer profiles with contact information
- Multiple vehicles per customer
- Complete work order history per customer
- Search and filtering capabilities

### Inventory Management
- Full tire catalog (brand, model, size, price, quantity)
- Real-time stock level tracking
- Configurable low stock alerts
- Atomic inventory updates to prevent race conditions

### Analytics
- Revenue tracking and trends
- Order statistics
- Performance metrics

### Settings & Administration
- Shop profile management
- Team member invitations via email
- Role-based permissions (owner, staff, viewer)
- Shop configuration (tax rate, currency, business hours)

### Multi-Tenant Architecture
- Complete data isolation per shop
- Row-Level Security (RLS) on all database tables
- Secure team invitation system with expiring tokens

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| React 19 | UI library |
| TypeScript | Type-safe development |
| Tailwind CSS | Utility-first styling with custom OKLCH color system |
| shadcn/ui | Accessible component library |
| Framer Motion | Animations and transitions |
| Lucide React | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| Next.js API Routes | Serverless API endpoints |
| Server Actions | Type-safe server mutations |
| Zod | Schema validation |

### Database & Auth
| Technology | Purpose |
|------------|---------|
| Supabase | PostgreSQL database with realtime subscriptions |
| Supabase Auth | Authentication (email/password, magic links) |
| Row-Level Security | Database-level authorization |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Vercel | Frontend hosting and serverless functions |
| Supabase Cloud | Database and auth hosting |

## Project Structure

```
tireops/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── actions/              # Server Actions
│   │   │   ├── customers.ts
│   │   │   └── vehicles.ts
│   │   ├── analytics/            # Analytics page
│   │   ├── customers/
│   │   │   ├── [id]/             # Customer detail page
│   │   │   │   └── _components/  # Customer detail components
│   │   │   └── _components/      # Customer list components
│   │   ├── inventory/            # Inventory management
│   │   ├── invite/[token]/       # Team invitation acceptance
│   │   ├── invoice/[orderId]/    # Invoice generation
│   │   ├── login/                # Login page
│   │   ├── register/             # Registration page
│   │   ├── settings/             # Shop settings
│   │   ├── work-orders/
│   │   │   └── _components/      # Work order components
│   │   ├── globals.css           # Global styles with CSS variables
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Dashboard
│   │
│   ├── components/
│   │   ├── shared/               # Shared components
│   │   │   └── notifications/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── DashboardLayout.tsx   # Main app layout with sidebar
│   │   ├── DateTimePicker.tsx    # Custom date/time picker
│   │   └── Dropdown.tsx          # Custom dropdown component
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx       # Auth state management
│   │   └── ThemeContext.tsx      # Theme (dark/light) management
│   │
│   ├── hooks/
│   │   ├── use-debounce.ts       # Debounce hook
│   │   ├── use-filters.ts        # Filter state hook
│   │   ├── use-modal.ts          # Modal state hook
│   │   ├── use-pagination.ts     # Pagination hook
│   │   └── use-sort.ts           # Sort state hook
│   │
│   ├── lib/
│   │   ├── queries/              # Database query functions
│   │   │   ├── customer.queries.ts
│   │   │   └── vehicle.queries.ts
│   │   ├── services/             # Business logic layer
│   │   │   ├── customer.service.ts
│   │   │   └── vehicle.service.ts
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser Supabase client
│   │   │   ├── client.server.ts  # Server Supabase client
│   │   │   └── auth.ts           # Auth helpers
│   │   ├── validations/
│   │   │   └── schemas.ts        # Zod validation schemas
│   │   └── utils.ts              # Utility functions
│   │
│   ├── types/
│   │   └── database.ts           # TypeScript types
│   │
│   └── middleware.ts             # Auth middleware
│
├── supabase/
│   ├── archive/                  # Archived SQL scripts
│   ├── migrations/               # Database migrations
│   │   └── README.md             # Migration documentation
│   └── SCHEMA.md                 # Database schema documentation
│
├── public/                       # Static assets
├── ARCHITECTURE.md               # Architecture documentation
├── DESIGN_SYSTEM.md              # Design system documentation
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind configuration
└── package.json
```

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `shops` | Shop/business information |
| `profiles` | User profiles linked to shops with roles |
| `customers` | Customer records per shop |
| `vehicles` | Customer vehicles |
| `work_orders` | Service appointments and jobs |
| `work_order_items` | Items/tires on each work order |
| `inventory` | Tire stock per shop |
| `tasks` | Todo list items per shop |
| `shop_invitations` | Team invitation tokens |

See [SCHEMA.md](./supabase/SCHEMA.md) for complete database documentation.

## User Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full access - create, read, update, delete all data. Manage team members. |
| **Staff** | Can create and edit work orders, customers, inventory. Cannot delete or manage team. |
| **Viewer** | Read-only access to all data. |

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/MigzCtrl/tireops.git
cd tireops
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open the app**

Navigate to [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |

## License

Private - All rights reserved.

## Author

Built by MigzCtrl
