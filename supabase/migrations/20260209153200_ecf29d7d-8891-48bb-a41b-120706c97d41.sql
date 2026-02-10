
-- Fix: Drop and recreate trigger function without SET role
-- Instead, we'll make the policies permissive and add a service-role bypass

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_signup();

-- The issue is RLS blocks even SECURITY DEFINER functions
-- Solution: Add permissive policies for the trigger's operations
-- The trigger runs as the function owner but RLS still applies in Supabase

-- Add a policy that allows inserts when called from the trigger context
-- We'll use a simpler approach: make insert policies permissive

-- Drop restrictive insert policies
DROP POLICY IF EXISTS "Users without org can create an organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owners can manage roles" ON public.user_roles;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Users without org can create an organization"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (public.get_user_organization_id(auth.uid()) IS NULL);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can manage roles insert"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id(auth.uid()) 
    AND public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Owners can manage roles update"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id(auth.uid()) 
    AND public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Owners can manage roles delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id(auth.uid()) 
    AND public.has_role(auth.uid(), 'owner')
  );

-- Now create the trigger function using supabase_admin role approach
-- SECURITY DEFINER + owned by postgres should bypass RLS
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_name TEXT;
  _org_slug TEXT;
  _new_org_id UUID;
  _user_full_name TEXT;
BEGIN
  _user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  _org_name := COALESCE(NEW.raw_user_meta_data->>'org_name', 'My Organization');
  _org_slug := LOWER(REGEXP_REPLACE(_org_name, '[^a-z0-9]+', '-', 'gi')) || '-' || EXTRACT(EPOCH FROM now())::BIGINT;

  INSERT INTO public.organizations (name, slug)
  VALUES (_org_name, _org_slug)
  RETURNING id INTO _new_org_id;

  INSERT INTO public.profiles (user_id, organization_id, full_name)
  VALUES (NEW.id, _new_org_id, _user_full_name);

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (NEW.id, 'owner', _new_org_id);

  RETURN NEW;
END;
$$;

-- Change ownership to postgres to ensure it bypasses RLS
ALTER FUNCTION public.handle_new_user_signup() OWNER TO postgres;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();
