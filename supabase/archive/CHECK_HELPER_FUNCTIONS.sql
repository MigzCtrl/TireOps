-- Check if the helper functions exist
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('get_user_shop_id', 'can_edit', 'is_owner', 'is_staff', 'is_viewer')
ORDER BY proname;
