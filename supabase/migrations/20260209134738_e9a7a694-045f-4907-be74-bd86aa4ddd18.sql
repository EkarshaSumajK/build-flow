
-- The trigger function runs as SECURITY DEFINER but RLS still applies to table owner
-- We need to temporarily disable RLS check within the function by using a different approach
-- Drop and recreate the function to insert via raw SQL that bypasses RLS

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_signup();

-- Recreate with explicit SET to bypass RLS
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET role = 'postgres'
AS $$
DECLARE
  org_name TEXT;
  org_slug TEXT;
  new_org_id UUID;
  user_full_name TEXT;
BEGIN
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  org_name := COALESCE(NEW.raw_user_meta_data->>'org_name', 'My Organization');
  org_slug := LOWER(REGEXP_REPLACE(org_name, '[^a-z0-9]+', '-', 'gi')) || '-' || EXTRACT(EPOCH FROM now())::BIGINT;

  INSERT INTO public.organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (user_id, organization_id, full_name)
  VALUES (NEW.id, new_org_id, user_full_name);

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (NEW.id, 'owner', new_org_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();
