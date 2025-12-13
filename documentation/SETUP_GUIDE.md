# Tire Shop MVP - Complete Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Database Configuration](#database-configuration)
4. [Next.js Project Setup](#nextjs-project-setup)
5. [Environment Configuration](#environment-configuration)
6. [Running the Application](#running-the-application)
7. [Creating Your First User](#creating-your-first-user)
8. [Deployment](#deployment)

## Prerequisites

### Required Software
```bash
# Check your versions
node --version  # Should be >= 18.x
npm --version   # Should be >= 9.x
git --version   # Any recent version
```

If you need to install Node.js, download from: https://nodejs.org/

## Supabase Setup

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign in or create a free account
3. Click "New Project"
4. Fill in the details:
   - **Name**: `tire-shop-mvp`
   - **Database Password**: Generate a strong password (SAVE THIS!)
   - **Region**: Choose closest to your location (e.g., US East)
   - **Pricing Plan**: Free tier is fine for MVP
5. Click "Create new project"
6. Wait ~2 minutes for project initialization

### Step 2: Get Your Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy and save these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Starts with `eyJhbGc...`
   - **service_role key**: Starts with `eyJhbGc...` (keep this secret!)

## Database Configuration

### Step 3: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open the file `D:\Tire-Shop-MVP\documentation\SCHEMA.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run** (bottom right)
7. You should see "Success. No rows returned"

### Step 4: Apply RLS Policies

1. Still in SQL Editor, click **New Query**
2. Open the file `D:\Tire-Shop-MVP\documentation\RLS_POLICIES.sql`
3. Copy and paste contents
4. Click **Run**
5. Verify success

### Step 5: Add Seed Data (Optional)

1. Click **New Query** again
2. Open `D:\Tire-Shop-MVP\documentation\SEED_DATA.sql`
3. Copy and paste
4. Click **Run**
5. This creates a demo shop and sample data

### Step 6: Configure Authentication

1. Go to **Authentication** → **Providers** in Supabase
2. Ensure **Email** is enabled
3. For MVP testing, disable email confirmation:
   - Go to **Authentication** → **Settings**
   - Scroll to "Email Auth"
   - **Uncheck** "Enable email confirmations"
   - Click **Save**

   > **Note**: In production, set up SMTP and enable email confirmations

## Next.js Project Setup

### Step 7: Initialize Next.js

```bash
# Navigate to project folder
cd D:\Tire-Shop-MVP

# Create Next.js app
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# When prompted:
# ✔ Would you like to use TypeScript? Yes
# ✔ Would you like to use ESLint? Yes
# ✔ Would you like to use Tailwind CSS? Yes
# ✔ Would you like to use `src/` directory? Yes
# ✔ Would you like to use App Router? Yes
# ✔ Would you like to customize the default import alias? No
```

### Step 8: Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr date-fns lucide-react
npm install -D @types/node
```

## Environment Configuration

### Step 9: Create Environment File

Create a file named `.env.local` in the project root:

```bash
# In D:\Tire-Shop-MVP\.env.local
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Replace the placeholder values with the credentials from Step 2.

**Example**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 10: Verify File Structure

Ensure all source files are in place:
```
D:\Tire-Shop-MVP\
├── src\
│   ├── lib\
│   │   ├── supabase\
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   └── types.ts
│   ├── middleware.ts
│   └── (all other files as provided)
```

## Running the Application

### Step 11: Start Development Server

```bash
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in X.Xs
```

### Step 12: Access the Application

Open your browser to: http://localhost:3000

You should be redirected to the login page.

## Creating Your First User

### Step 13: Create Owner Account

Since we don't have a signup page (internal app), create users via Supabase:

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Fill in:
   - **Email**: your-email@example.com
   - **Password**: your-secure-password
   - **Auto Confirm User**: Check this box
4. Click **Create user**
5. Copy the **User UID** (you'll need this next)

### Step 14: Create Profile

1. Go to **SQL Editor**
2. Run this query (replace the UUIDs with your values):

```sql
-- First, create or use the demo shop
-- If you ran seed data, the shop ID is: 11111111-1111-1111-1111-111111111111
-- Otherwise create one:
INSERT INTO shops (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'My Tire Shop');

-- Then create your user profile
INSERT INTO profiles (id, shop_id, full_name, role) VALUES
  ('paste-user-uid-here', '11111111-1111-1111-1111-111111111111', 'John Owner', 'owner');
```

3. Click **Run**

### Step 15: Login

1. Go back to http://localhost:3000/login
2. Enter your email and password
3. Click **Sign In**
4. You should see the dashboard!

## Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts and add environment variables when asked
```

In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add all three variables from `.env.local`
3. Redeploy

### Option 2: Other Platforms

The app can be deployed to any platform supporting Next.js 14:
- Railway
- Render
- DigitalOcean App Platform
- AWS Amplify

## Troubleshooting

### "Not authenticated" errors
- Check your `.env.local` file has correct credentials
- Verify you created a profile for your user
- Clear browser cookies and try logging in again

### Database connection errors
- Verify Supabase project is running (check dashboard)
- Check credentials in `.env.local` match Supabase API settings
- Ensure you ran all SQL scripts in order

### Build errors
- Run `npm install` again
- Delete `node_modules` and `.next` folders, then reinstall
- Check Node.js version is >= 18

### RLS policy errors
- Verify you ran the RLS_POLICIES.sql script
- Check that your user has a profile in the profiles table
- Verify the shop_id in your profile matches a shop in the shops table

## Next Steps

1. Create additional staff users following Steps 13-14 (use role='staff')
2. Add your first real customer
3. Import your inventory
4. Create your first work order
5. Customize the tax rate in the database function if needed

## Support

For issues or questions:
- Check the troubleshooting section above
- Review Supabase logs: Dashboard → Logs
- Check browser console for errors (F12)
