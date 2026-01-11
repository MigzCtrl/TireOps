-- =====================================================
-- DIAGNOSTIC QUERY - Check Profile and RLS Setup
-- =====================================================
-- Run this in Supabase SQL Editor to diagnose the loading issue

-- 1. Check if your profile exists
SELECT
  'Profile Check' as test,
  id,
  shop_id,
  role,
  full_name,
  email
FROM public.profiles
WHERE id = '27ab31b3-02ba-4de6-af57-fa8528935962'::UUID;

-- 2. Check if your shop exists
SELECT
  'Shop Check' as test,
  id,
  name,
  owner_id
FROM public.shops
WHERE owner_id = '27ab31b3-02ba-4de6-af57-fa8528935962'::UUID;

-- 3. Check RLS policies on profiles table
SELECT
  'RLS Policies on profiles' as test,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles';

-- 4. Check if RLS is enabled on profiles table
SELECT
  'RLS Status on profiles' as test,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profiles';

-- 5. Test if current user can read profiles
-- This simulates what the app is trying to do
SELECT
  'Can I read my profile?' as test,
  count(*) as profile_count
FROM public.profiles
WHERE id = auth.uid();
