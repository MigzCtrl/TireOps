-- =====================================================
-- Add shop_id to tasks table for multi-tenant isolation
-- =====================================================
-- Currently tasks are only user-scoped. For a tire shop
-- management system, tasks should be shop-scoped so all
-- staff can see and manage shop tasks collaboratively.

-- 1. ADD shop_id COLUMN
-- =====================================================

-- Add shop_id column (nullable initially for migration)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;

-- 2. POPULATE shop_id FOR EXISTING TASKS
-- =====================================================

-- Set shop_id for existing tasks based on user's profile
UPDATE public.tasks
SET shop_id = (
    SELECT shop_id
    FROM public.profiles
    WHERE profiles.id = tasks.user_id
)
WHERE shop_id IS NULL;

-- 3. MAKE shop_id REQUIRED
-- =====================================================

-- Now make shop_id NOT NULL (all existing rows now have values)
ALTER TABLE public.tasks
ALTER COLUMN shop_id SET NOT NULL;

-- 4. ADD INDEX FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tasks_shop_id ON public.tasks(shop_id);

-- 5. DROP OLD USER-SCOPED RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users manage own tasks" ON public.tasks;

-- 6. CREATE NEW SHOP-SCOPED RLS POLICIES
-- =====================================================

-- SELECT: All users in a shop can view shop tasks
CREATE POLICY "View shop tasks"
    ON public.tasks FOR SELECT
    USING (shop_id = public.user_shop_id());

-- INSERT: Owner and Staff can create shop tasks
CREATE POLICY "Create shop tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (
        shop_id = public.user_shop_id()
        AND public.can_edit()
    );

-- UPDATE: Owner and Staff can update shop tasks
CREATE POLICY "Update shop tasks"
    ON public.tasks FOR UPDATE
    USING (shop_id = public.user_shop_id())
    WITH CHECK (
        shop_id = public.user_shop_id()
        AND public.can_edit()
    );

-- DELETE: Owner and Staff can delete shop tasks
CREATE POLICY "Delete shop tasks"
    ON public.tasks FOR DELETE
    USING (
        shop_id = public.user_shop_id()
        AND public.can_edit()
    );

-- 7. VERIFY RLS IS ENABLED
-- =====================================================

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TASKS SHOP ISOLATION COMPLETE
-- =====================================================
-- Tasks are now shop-scoped instead of user-scoped.
-- All users in a shop can view/manage shop tasks.
-- Frontend will need update to use shop_id instead of user_id.
