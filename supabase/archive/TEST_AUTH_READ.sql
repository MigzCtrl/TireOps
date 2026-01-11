-- Test if authenticated user can read their profile
-- This simulates what the AuthContext is trying to do

-- First, who is the current authenticated user?
SELECT
  'Current Auth User' as test,
  auth.uid() as user_id,
  auth.email() as email;

-- Can we read the profile using auth.uid()?
SELECT
  'Read Own Profile' as test,
  id,
  shop_id,
  role,
  full_name,
  email
FROM public.profiles
WHERE id = auth.uid();

-- What does get_user_shop_id() return?
SELECT
  'Get User Shop ID' as test,
  public.get_user_shop_id() as shop_id;

-- Can we read the shop?
SELECT
  'Read Own Shop' as test,
  id,
  name,
  owner_id
FROM public.shops
WHERE id IN (
  SELECT shop_id FROM public.profiles WHERE id = auth.uid()
);
