-- =====================================================
-- FIX CIRCULAR DEPENDENCY IN RLS POLICIES
-- =====================================================

-- Remove the problematic circular policy
DROP POLICY IF EXISTS "Users can view shop profiles" ON public.profiles;

-- Remove the other circular policy
DROP POLICY IF EXISTS "Owners can manage shop profiles" ON public.profiles;

-- Keep only the simple, working policies
-- (These already exist, just verifying they're there)

-- Verify what policies remain
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
