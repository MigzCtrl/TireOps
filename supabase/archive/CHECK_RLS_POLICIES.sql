-- Check what RLS policies actually exist
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'shops', 'customers', 'inventory', 'work_orders')
ORDER BY tablename, policyname;
