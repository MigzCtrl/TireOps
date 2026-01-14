---
name: add-feature
description: Guide for adding new features to TireOps. Use when implementing new pages, API routes, or components.
---

# Adding Features to TireOps

> **First:** Read [ARCHITECTURE.md](../../ARCHITECTURE.md) for full system context.

## Before Starting
1. Read ARCHITECTURE.md for system overview
2. Check existing patterns in similar features
3. Plan the implementation

## Adding a New Page
1. Create `src/app/[route]/page.tsx`
2. Use `DashboardLayout` wrapper
3. Get auth: `const { profile, shop } = useAuth()`
4. Filter queries by `shop_id`

## Adding an API Route
1. Create `src/app/api/[route]/route.ts`
2. Use lazy Supabase initialization
3. Validate input with Zod
4. Return proper error responses

## Adding Components
1. Use shadcn/ui from `src/components/ui/`
2. Use theme variables (text-text, bg-bg)
3. Follow existing patterns

## Database Changes
1. Update `src/types/database.ts`
2. Add migration SQL to `src/lib/supabase/migrations.ts`
3. Run in Supabase dashboard

## Checklist
- [ ] RLS: Data filtered by shop_id
- [ ] Types: Added to database.ts
- [ ] Auth: Protected routes check user
- [ ] Styles: Using theme variables
- [ ] Errors: Proper error handling
