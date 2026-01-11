-- =====================================================
-- AUTOMATIC SHOP & PROFILE SETUP
-- =====================================================
-- Just edit the values below and run once!

DO $$
DECLARE
    new_shop_id UUID;
BEGIN
    -- Create shop and capture the ID
    INSERT INTO public.shops (name, email, phone, address, owner_id)
    VALUES (
        'My Tire Shop',           -- ← CHANGE THIS to your shop name
        'owner@example.com',      -- ← CHANGE THIS to your email
        '555-1234',               -- ← CHANGE THIS to your phone
        '123 Main St',            -- ← CHANGE THIS to your address
        auth.uid()
    )
    RETURNING id INTO new_shop_id;

    -- Create profile using the shop ID from above
    INSERT INTO public.profiles (id, shop_id, role, full_name, email)
    VALUES (
        auth.uid(),
        new_shop_id,              -- ← Automatically uses shop ID from above
        'owner',
        'Your Full Name',         -- ← CHANGE THIS to your name
        'owner@example.com'       -- ← CHANGE THIS to your email
    );

    -- Show success message
    RAISE NOTICE 'Success! Shop ID: %', new_shop_id;
END $$;

-- Now verify it worked:
SELECT
    s.name as shop_name,
    s.email as shop_email,
    p.full_name,
    p.role
FROM public.shops s
JOIN public.profiles p ON s.id = p.shop_id
WHERE s.owner_id = auth.uid();
