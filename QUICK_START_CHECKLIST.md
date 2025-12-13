# Quick Start Checklist

Use this checklist to get your Tire Shop MVP running. Check off each item as you complete it.

## Phase 1: Prerequisites
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm 9+ installed (`npm --version`)
- [ ] Supabase account created (https://supabase.com)
- [ ] Text editor installed (VS Code recommended)

## Phase 2: Supabase Setup
- [ ] Created new Supabase project named "tire-shop-mvp"
- [ ] Saved database password securely
- [ ] Copied Project URL from Settings → API
- [ ] Copied anon public key from Settings → API
- [ ] Copied service_role key from Settings → API
- [ ] Ran SCHEMA.sql in SQL Editor (no errors)
- [ ] Ran RLS_POLICIES.sql in SQL Editor (no errors)
- [ ] Ran SEED_DATA.sql in SQL Editor (optional)
- [ ] Disabled "Email confirmations" in Auth settings

## Phase 3: Project Setup
- [ ] Opened terminal/command prompt
- [ ] Navigated to `D:\Tire-Shop-MVP`
- [ ] Ran `npm install` (completed successfully)
- [ ] Created `.env.local` file
- [ ] Added NEXT_PUBLIC_SUPABASE_URL to `.env.local`
- [ ] Added NEXT_PUBLIC_SUPABASE_ANON_KEY to `.env.local`
- [ ] Added SUPABASE_SERVICE_ROLE_KEY to `.env.local`

## Phase 4: Create First User
- [ ] Opened Supabase Dashboard → Authentication → Users
- [ ] Clicked "Add User" → "Create new user"
- [ ] Entered email address
- [ ] Entered password
- [ ] Checked "Auto Confirm User"
- [ ] Clicked "Create user"
- [ ] Copied the User UID

## Phase 5: Create User Profile
- [ ] Opened Supabase SQL Editor
- [ ] Created shop (if not using seed data)
- [ ] Created profile with correct user UID
- [ ] Ran the query successfully

## Phase 6: Start Application
- [ ] Ran `npm run dev` in terminal
- [ ] Saw "Local: http://localhost:3000" message
- [ ] No errors in terminal

## Phase 7: Login & Test
- [ ] Opened http://localhost:3000 in browser
- [ ] Redirected to login page
- [ ] Entered email and password
- [ ] Successfully logged in
- [ ] Saw dashboard with sidebar

## Phase 8: Verify Functionality
- [ ] Dashboard loads without errors
- [ ] Can see "Today's Work Orders" section
- [ ] Can see "Low Stock" section
- [ ] Sidebar navigation works
- [ ] Can click "Customers" link
- [ ] Can click "New Customer" button

## Troubleshooting Checklist

If something isn't working, check:

- [ ] `.env.local` exists in project root (not in src/)
- [ ] All three environment variables are set
- [ ] No extra spaces in environment variables
- [ ] User profile was created in database
- [ ] shop_id in profile matches shop table
- [ ] Supabase project is active (check dashboard)
- [ ] No browser console errors (press F12)
- [ ] No terminal errors
- [ ] Using correct email/password to login

## Next Steps After Setup

Once everything is working:

1. **Add More Users**
   - [ ] Create staff user in Supabase Auth
   - [ ] Create profile with role='staff'
   - [ ] Test staff login

2. **Add Your Data**
   - [ ] Add real customers
   - [ ] Add vehicle information
   - [ ] Add tire inventory
   - [ ] Create test work order

3. **Customize**
   - [ ] Update shop name in database
   - [ ] Adjust tax rate in SCHEMA.sql function
   - [ ] Add your logo to sidebar
   - [ ] Customize colors in tailwind.config.ts

## Quick Command Reference

```bash
# Navigate to project
cd D:\Tire-Shop-MVP

# Install dependencies
npm install

# Start development server
npm run dev

# Stop server
Ctrl + C

# Build for production
npm run build

# Run production build
npm run start
```

## Quick File Locations

- **Environment variables**: `D:\Tire-Shop-MVP\.env.local`
- **Database schema**: `D:\Tire-Shop-MVP\documentation\SCHEMA.sql`
- **Setup guide**: `D:\Tire-Shop-MVP\documentation\SETUP_GUIDE.md`
- **Full docs**: `D:\Tire-Shop-MVP\PROJECT_STRUCTURE.md`

## Support Resources

- **Detailed Setup**: See `INSTALLATION.md` or `documentation/SETUP_GUIDE.md`
- **Project Structure**: See `PROJECT_STRUCTURE.md`
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

## Common Issues & Solutions

### "Not authenticated" error
**Solution**: Check that user profile exists in database with correct user UID

### "Profile not found"
**Solution**: Run the profile creation SQL query with your user UID

### Can't start server
**Solution**: Make sure no other app is using port 3000, or use `npm run dev -- -p 3001`

### Build errors
**Solution**: Delete `node_modules` and `.next`, then run `npm install` again

### Login doesn't work
**Solution**: Check `.env.local` has correct credentials, check browser console for errors

---

**Estimated Time to Complete**: 30-45 minutes

**Need Help?** Check `INSTALLATION.md` for detailed step-by-step instructions.
