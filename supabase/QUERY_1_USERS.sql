-- Query 1: Show all users
SELECT
  id as user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC;
