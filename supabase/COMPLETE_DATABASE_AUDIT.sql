-- =====================================================
-- COMPLETE DATABASE AUDIT
-- =====================================================
-- This shows EVERYTHING in your database so we can understand what exists

-- 1. ALL USERS (from auth.users)
SELECT
  '=== ALL USERS ===' as section,
  id as user_id,
  email,
  created_at,
  confirmed_at IS NOT NULL as email_confirmed
FROM auth.users
ORDER BY created_at DESC;

-- 2. ALL SHOPS
SELECT
  '=== ALL SHOPS ===' as section,
  id as shop_id,
  name as shop_name,
  owner_id,
  email as shop_email,
  phone,
  created_at
FROM public.shops
ORDER BY created_at DESC;

-- 3. ALL PROFILES
SELECT
  '=== ALL PROFILES ===' as section,
  id as user_id,
  shop_id,
  role,
  full_name,
  email,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- 4. MATCH: Users → Profiles → Shops
SELECT
  '=== COMPLETE MAPPING ===' as section,
  u.email as user_email,
  u.id as user_id,
  p.role,
  p.full_name,
  s.name as shop_name,
  s.id as shop_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.shops s ON p.shop_id = s.id
ORDER BY u.created_at DESC;

-- 5. CURRENT LOGGED IN USER
SELECT
  '=== YOUR CURRENT USER ===' as section,
  id as user_id,
  email,
  'This is YOU right now' as note
FROM auth.users
WHERE id = '27ab31b3-02ba-4de6-af57-fa8528935962'::UUID;

-- 6. ORPHANED SHOPS (shops without profiles)
SELECT
  '=== ORPHANED SHOPS ===' as section,
  s.id as shop_id,
  s.name as shop_name,
  s.owner_id,
  'No profile exists for this owner_id' as issue
FROM public.shops s
LEFT JOIN public.profiles p ON s.owner_id = p.id
WHERE p.id IS NULL;
