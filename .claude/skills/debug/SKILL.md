---
name: debug
description: Debug issues in TireOps. Use when encountering errors, bugs, or unexpected behavior.
---

# Debugging TireOps

> **First:** Read [ARCHITECTURE.md](../../ARCHITECTURE.md) for full system context.

## Common Issues

### "No shop found" / Auth Errors
- Check AuthContext loaded before accessing shop
- Verify user has profile with shop_id
- Check RLS policies in Supabase

### Build Errors
- Run `npm run build` to see errors
- Check TypeScript types in database.ts
- Verify imports are correct

### Supabase Errors
- Check Supabase dashboard logs
- Verify RLS policies allow the operation
- Check if columns exist (run migrations)

### API Route Errors
- Use lazy Supabase initialization
- Check environment variables
- Validate input with Zod

## Debug Steps
1. Check browser console for errors
2. Check terminal for server errors
3. Check Supabase dashboard for DB errors
4. Verify environment variables are set

## Key Files
- `src/middleware.ts` - Auth redirects
- `src/contexts/AuthContext.tsx` - User state
- `src/lib/supabase/` - Database clients
- `.env.local` - Environment variables

## Commands
```bash
npm run dev      # Start dev server
npm run build    # Check for build errors
npm run test     # Run tests
```
