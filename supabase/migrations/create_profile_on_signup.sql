-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_shop_id UUID;
BEGIN
  -- Create a new shop for the user
  INSERT INTO public.shops (name, owner_id, email)
  VALUES (
    'My Tire Shop',  -- Default shop name
    NEW.id,
    NEW.email
  )
  RETURNING id INTO new_shop_id;

  -- Create a profile for the user
  INSERT INTO public.profiles (id, shop_id, role, full_name, email)
  VALUES (
    NEW.id,
    new_shop_id,
    'owner',  -- First user is always the owner
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call function on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fix existing user without profile (kaisnewmail@gmail.com)
DO $$
DECLARE
  user_id UUID := 'c6370b2e-a88e-4852-acf0-e691ddedf65b';
  user_email TEXT := 'kaisnewmail@gmail.com';
  new_shop_id UUID;
BEGIN
  -- Check if profile already exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    -- Create shop
    INSERT INTO public.shops (name, owner_id, email)
    VALUES ('My Tire Shop', user_id, user_email)
    RETURNING id INTO new_shop_id;

    -- Create profile
    INSERT INTO public.profiles (id, shop_id, role, full_name, email)
    VALUES (user_id, new_shop_id, 'owner', 'User', user_email);

    RAISE NOTICE 'Profile created for user %', user_email;
  ELSE
    RAISE NOTICE 'Profile already exists for user %', user_email;
  END IF;
END $$;
