-- Query 2: Show all shops
SELECT
  id as shop_id,
  name as shop_name,
  owner_id,
  email,
  created_at
FROM public.shops
ORDER BY created_at DESC;
