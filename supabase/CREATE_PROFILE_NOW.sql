-- =====================================================
-- CREATE YOUR PROFILE NOW
-- =====================================================
-- This will create your shop and profile with the correct user ID

DO $$
DECLARE
    new_shop_id UUID;
    my_user_id UUID := '27ab31b3-02ba-4de6-af57-fa8528935962'::UUID;
BEGIN
    -- Create shop
    INSERT INTO public.shops (name, email, phone, address, owner_id)
    VALUES (
        'My Tire Shop',              -- ← CHANGE THIS to your shop name
        'owner@tireshop.com',        -- ← CHANGE THIS to your email
        '555-1234',                  -- ← CHANGE THIS to your phone
        '123 Main Street',           -- ← CHANGE THIS to your address
        my_user_id
    )
    RETURNING id INTO new_shop_id;

    -- Create profile
    INSERT INTO public.profiles (id, shop_id, role, full_name, email)
    VALUES (
        my_user_id,
        new_shop_id,
        'owner',
        'Your Full Name',            -- ← CHANGE THIS to your name
        'owner@tireshop.com'         -- ← CHANGE THIS to your email
    );

    RAISE NOTICE 'SUCCESS! Shop ID: %, User ID: %', new_shop_id, my_user_id;
END $$;

-- Verify it worked
SELECT
  'YOUR PROFILE' as status,
  id,
  shop_id,
  role,
  full_name,
  email
FROM public.profiles
WHERE id = '27ab31b3-02ba-4de6-af57-fa8528935962'::UUID;

SELECT
  'YOUR SHOP' as status,
  id,
  name,
  owner_id
FROM public.shops
WHERE owner_id = '27ab31b3-02ba-4de6-af57-fa8528935962'::UUID;
