-- =====================================================
-- CHECK IF YOUR DATA ACTUALLY EXISTS
-- =====================================================
-- Run this to see if shop and profile were really created

-- Check profiles table (as admin, bypassing RLS)
SELECT
  'PROFILES TABLE' as table_name,
  id,
  shop_id,
  role,
  full_name,
  email,
  created_at
FROM public.profiles
WHERE id = '27ab31b3-02ba-4de6-af57-fa8528935962'::UUID;

-- Check shops table (as admin)
SELECT
  'SHOPS TABLE' as table_name,
  id,
  name,
  owner_id,
  email,
  created_at
FROM public.shops
WHERE owner_id = '27ab31b3-02ba-4de6-af57-fa8528935962'::UUID;

-- Count total profiles
SELECT 'TOTAL PROFILES' as info, count(*) as count FROM public.profiles;

-- Count total shops
SELECT 'TOTAL SHOPS' as info, count(*) as count FROM public.shops;
