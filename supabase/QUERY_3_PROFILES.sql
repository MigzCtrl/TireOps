-- Query 3: Show all profiles
SELECT
  id as user_id,
  shop_id,
  role,
  full_name,
  email,
  created_at
FROM public.profiles
ORDER BY created_at DESC;
