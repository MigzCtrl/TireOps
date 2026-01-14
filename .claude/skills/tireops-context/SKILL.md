---
name: tireops-context
description: Provides context about the TireOps codebase architecture, database schema, and project structure. Use when starting work, asking about how things work, or needing to understand the system.
---

# TireOps Project Context

> **First:** Read [ARCHITECTURE.md](../../ARCHITECTURE.md) for full system diagrams and documentation.

## Tech Stack
- Next.js 16 (App Router) + React + TypeScript
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind CSS + shadcn/ui
- Stripe (payments), Resend (email), Twilio (SMS)

## Key Directories
- `src/app/` - Pages and API routes
- `src/components/` - React components
- `src/contexts/AuthContext.tsx` - User/shop state
- `src/lib/` - Utilities (supabase, email, twilio, stripe)
- `src/types/database.ts` - TypeScript types

## Multi-Tenant Architecture
- All data filtered by `shop_id`
- RLS policies enforce isolation
- Get shop_id from AuthContext: `const { profile } = useAuth()`

## Theme Variables
- `text-text`, `text-text-muted` for text
- `bg-bg`, `bg-bg-light` for backgrounds
- `border-border-muted` for borders
- `text-primary`, `text-success`, `text-danger`, `text-warning`, `text-info`
