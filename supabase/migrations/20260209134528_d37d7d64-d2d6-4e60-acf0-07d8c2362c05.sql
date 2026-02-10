
-- Create a function that handles new user setup after signup
-- This runs as SECURITY DEFINER so it bypasses RLS
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_name TEXT;
  org_slug TEXT;
  new_org_id UUID;
  user_full_name TEXT;
BEGIN
  -- Extract metadata from the signup
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  org_name := COALESCE(NEW.raw_user_meta_data->>'org_name', 'My Organization');
  org_slug := LOWER(REGEXP_REPLACE(org_name, '[^a-z0-9]+', '-', 'gi')) || '-' || EXTRACT(EPOCH FROM now())::BIGINT;

  -- Create organization
  INSERT INTO public.organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  -- Create profile
  INSERT INTO public.profiles (user_id, organization_id, full_name)
  VALUES (NEW.id, new_org_id, user_full_name);

  -- Assign owner role
  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (NEW.id, 'owner', new_org_id);

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();
