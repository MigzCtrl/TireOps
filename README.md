# Tire Shop MVP - Complete Implementation

A comprehensive tire shop management system built with Next.js 14, Supabase, and TypeScript.

## Features

- **Customer Management**: Track customer information, contact details, and service history
- **Vehicle Tracking**: Maintain detailed vehicle records linked to customers
- **Inventory Management**: Real-time tire inventory with stock tracking
- **Work Orders**: Create and manage service appointments with automatic inventory deduction
- **Multi-user Support**: Role-based access (Owner/Staff) with secure authentication
- **Real-time Updates**: Powered by Supabase for instant data synchronization

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **UI Components**: Lucide React icons
- **Date Handling**: date-fns

## Project Structure

```
D:\Tire-Shop-MVP\
├── documentation/          # Setup guides and documentation
│   ├── SETUP_GUIDE.md     # Step-by-step setup instructions
│   ├── SCHEMA.sql         # Database schema
│   ├── RLS_POLICIES.sql   # Row Level Security policies
│   └── SEED_DATA.sql      # Sample data for testing
├── database/              # Database-related files
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (auth)/       # Authentication pages
│   │   ├── (dashboard)/  # Protected dashboard pages
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/       # React components
│   │   ├── forms/        # Form components
│   │   ├── layout/       # Layout components (Sidebar, etc.)
│   │   └── ui/           # Reusable UI components
│   ├── actions/          # Server actions
│   │   ├── customers.ts
│   │   ├── inventory.ts
│   │   └── work-orders.ts
│   └── lib/              # Utilities and types
│       ├── supabase/     # Supabase clients
│       └── types.ts      # TypeScript types
├── .env.local           # Environment variables (create this)
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## Quick Start

1. **Prerequisites**
   - Node.js >= 18.x
   - npm >= 9.x
   - A Supabase account (free tier works)

2. **Setup**
   ```bash
   cd D:\Tire-Shop-MVP
   # Follow instructions in documentation/SETUP_GUIDE.md
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Configure Environment**
   - Copy `.env.example` to `.env.local`
   - Add your Supabase credentials

5. **Run Development Server**
   ```bash
   npm run dev
   ```

6. **Open Browser**
   - Navigate to http://localhost:3000

## Documentation

See the `documentation/` folder for:
- Complete setup instructions
- Database schema details
- Security policies
- API documentation

## License

Private/Internal Use Only
