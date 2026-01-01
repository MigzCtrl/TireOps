-- =====================================================
-- MANUAL SHOP & PROFILE SETUP (2 steps)
-- =====================================================

-- STEP 1: Get your user ID
-- Run this first to find your user ID:
SELECT id, email FROM auth.users;

-- Copy the 'id' value (UUID) from your user row
-- You'll paste it in STEP 2

-- =====================================================

-- STEP 2: Create shop and profile
-- Replace the values below, then run:

DO $$
DECLARE
    new_shop_id UUID;
    my_user_id UUID := 'PASTE-YOUR-USER-ID-HERE'::UUID;  -- ← PASTE your user ID from STEP 1
BEGIN
    -- Create shop
    INSERT INTO public.shops (name, email, phone, address, owner_id)
    VALUES (
        'My Tire Shop',           -- ← CHANGE THIS
        'owner@example.com',      -- ← CHANGE THIS
        '555-1234',               -- ← CHANGE THIS
        '123 Main St',            -- ← CHANGE THIS
        my_user_id
    )
    RETURNING id INTO new_shop_id;

    -- Create profile
    INSERT INTO public.profiles (id, shop_id, role, full_name, email)
    VALUES (
        my_user_id,
        new_shop_id,
        'owner',
        'Your Full Name',         -- ← CHANGE THIS
        'owner@example.com'       -- ← CHANGE THIS
    );

    RAISE NOTICE 'Success! Shop ID: %, User ID: %', new_shop_id, my_user_id;
END $$;

-- =====================================================
-- STEP 3: Verify
-- =====================================================
SELECT
    s.name as shop_name,
    s.email as shop_email,
    p.full_name,
    p.role,
    p.id as user_id
FROM public.shops s
JOIN public.profiles p ON s.id = p.shop_id;
