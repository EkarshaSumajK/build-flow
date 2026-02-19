
-- Add email and temp_password columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temp_password text;

-- Backfill email from auth.users for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

-- Update the handle_new_user_signup function to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org_name TEXT;
  _org_slug TEXT;
  _new_org_id UUID;
  _user_full_name TEXT;
BEGIN
  _org_name := COALESCE(NEW.raw_user_meta_data->>'org_name', '');

  -- If org_name is empty, this user is being created by an admin (edge function)
  -- Skip automatic org/profile/role creation
  IF _org_name = '' THEN
    RETURN NEW;
  END IF;

  _user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  _org_slug := LOWER(REGEXP_REPLACE(_org_name, '[^a-z0-9]+', '-', 'gi')) || '-' || EXTRACT(EPOCH FROM now())::BIGINT;

  INSERT INTO public.organizations (name, slug)
  VALUES (_org_name, _org_slug)
  RETURNING id INTO _new_org_id;

  INSERT INTO public.profiles (user_id, organization_id, full_name, email)
  VALUES (NEW.id, _new_org_id, _user_full_name, NEW.email);

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (NEW.id, 'owner', _new_org_id);

  RETURN NEW;
END;
$function$;
