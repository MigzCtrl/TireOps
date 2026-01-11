-- =====================================================
-- CREATE YOUR SHOP AND PROFILE
-- =====================================================
-- Run this AFTER the combined migration completes successfully
-- This creates your shop and links your user account to it

-- STEP 1: Create your shop
-- Replace the values below with your actual shop details
INSERT INTO public.shops (name, email, phone, address, owner_id)
VALUES (
  'My Tire Shop',           -- ← Change this to your shop name
  'owner@example.com',      -- ← Change this to your email
  '555-1234',               -- ← Change this to your phone
  '123 Main St',            -- ← Change this to your address
  auth.uid()                -- ← This auto-gets your user ID
)
RETURNING *;

-- Copy the 'id' value from the result above (it will be a UUID like: 12345678-1234-1234-1234-123456789abc)
-- You'll need it for Step 2

-- STEP 2: Create your profile
-- Replace 'PASTE-SHOP-ID-HERE' with the actual shop ID from Step 1
INSERT INTO public.profiles (id, shop_id, role, full_name, email)
VALUES (
  auth.uid(),                           -- Your user ID (auto-detected)
  'PASTE-SHOP-ID-HERE'::UUID,          -- ← REPLACE with shop ID from Step 1
  'owner',                              -- Your role (owner = full access)
  'Your Full Name',                     -- ← Change this to your name
  'owner@example.com'                   -- ← Change this to your email
)
RETURNING *;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run these queries to verify everything worked:

-- Check your shop was created
SELECT * FROM public.shops WHERE owner_id = auth.uid();

-- Check your profile was created
SELECT * FROM public.profiles WHERE id = auth.uid();

-- =====================================================
-- ALL DONE!
-- =====================================================
-- You can now log out and log back in
-- The app will load your shop and profile automatically
