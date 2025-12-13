# Quick Installation Guide

This guide will help you get the Tire Shop MVP up and running on your Windows machine.

## Prerequisites Checklist

Before starting, make sure you have:
- [ ] Node.js 18 or higher installed
- [ ] npm 9 or higher installed
- [ ] A Supabase account (free at https://supabase.com)
- [ ] A text editor (VS Code recommended)

## Step 1: Verify Prerequisites

Open Command Prompt and run:
```bash
node --version
npm --version
```

Both should return version numbers. If not, install Node.js from https://nodejs.org/

## Step 2: Navigate to Project

```bash
cd D:\Tire-Shop-MVP
```

## Step 3: Install Dependencies

```bash
npm install
```

This will take 2-5 minutes and install all required packages.

## Step 4: Setup Supabase

### 4.1 Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - Name: tire-shop-mvp
   - Database Password: (generate and save this)
   - Region: Choose your closest region
4. Click "Create new project" and wait ~2 minutes

### 4.2 Get Your Credentials

1. In your project, go to Settings → API
2. You'll need three values:
   - **Project URL**
   - **anon public** key
   - **service_role** key (keep secret!)

### 4.3 Run Database Setup

1. In Supabase, go to SQL Editor
2. Click "New Query"
3. Open `D:\Tire-Shop-MVP\documentation\SCHEMA.sql` in Notepad
4. Copy all content and paste into SQL Editor
5. Click "Run"
6. Repeat for `D:\Tire-Shop-MVP\documentation\RLS_POLICIES.sql`
7. Repeat for `D:\Tire-Shop-MVP\documentation\SEED_DATA.sql` (optional, adds sample data)

### 4.4 Configure Authentication

1. In Supabase, go to Authentication → Settings
2. Scroll to "Email Auth"
3. **Uncheck** "Enable email confirmations" (for MVP testing)
4. Click Save

## Step 5: Configure Environment Variables

Create a new file called `.env.local` in `D:\Tire-Shop-MVP`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Replace the values with your actual credentials from Step 4.2.

## Step 6: Create Your First User

Since this is an internal app, create users through Supabase:

1. In Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Fill in:
   - Email: your-email@example.com
   - Password: your-secure-password
   - Check "Auto Confirm User"
4. Click "Create user"
5. **Copy the User UID** from the user list

### 6.1 Create Profile for User

1. Go to SQL Editor
2. Run this query (replace the UUID with your user UID):

```sql
-- Create shop (if not done via seed data)
INSERT INTO shops (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'My Tire Shop');

-- Create profile (replace 'paste-user-uid-here' with your user UUID)
INSERT INTO profiles (id, shop_id, full_name, role) VALUES
  ('paste-user-uid-here', '11111111-1111-1111-1111-111111111111', 'John Owner', 'owner');
```

3. Click "Run"

## Step 7: Start the Application

In Command Prompt:

```bash
npm run dev
```

You should see:
```
▲ Next.js 15.0.3
- Local:        http://localhost:3000
- Ready in 3.5s
```

## Step 8: Login

1. Open your browser to http://localhost:3000
2. You'll be redirected to the login page
3. Enter the email and password from Step 6
4. Click "Sign In"
5. You should see the dashboard!

## Troubleshooting

### "Not authenticated" error
- Check that your `.env.local` file has the correct credentials
- Verify you created a profile for your user in Step 6.1
- Try logging out and back in

### "Profile not found" error
- You forgot Step 6.1 - create the profile in the database
- Make sure the user UUID matches exactly

### Can't connect to database
- Check your Supabase project is running (green status in dashboard)
- Verify the credentials in `.env.local` are correct
- Check your internet connection

### Build/Install errors
- Delete `node_modules` folder
- Delete `package-lock.json`
- Run `npm install` again
- Make sure you're using Node.js 18 or higher

## Next Steps

After successful login:

1. **Add More Users**: Repeat Step 6 for staff members (use role='staff')
2. **Add Customers**: Click "Customers" → "Add Customer"
3. **Add Inventory**: Click "Inventory" → "Add Item"
4. **Create Work Orders**: Click "New Work Order" button

## File Structure Reference

```
D:\Tire-Shop-MVP\
├── documentation/           # All setup guides and SQL files
│   ├── SETUP_GUIDE.md      # Detailed setup instructions
│   ├── SCHEMA.sql          # Database schema
│   ├── RLS_POLICIES.sql    # Security policies
│   └── SEED_DATA.sql       # Sample data
├── src/
│   ├── app/                # Next.js pages
│   ├── components/         # React components
│   ├── actions/            # Server actions (API layer)
│   └── lib/                # Utilities and types
├── .env.local             # Your environment variables (YOU CREATE THIS)
├── package.json           # Dependencies
└── README.md              # Project overview
```

## Support

- For detailed setup instructions, see `documentation/SETUP_GUIDE.md`
- For database schema details, see `documentation/SCHEMA.sql`
- Check the browser console (F12) for detailed error messages

## Production Deployment

When ready to deploy:

1. Push code to GitHub
2. Connect to Vercel (https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

See `documentation/SETUP_GUIDE.md` for detailed deployment instructions.
