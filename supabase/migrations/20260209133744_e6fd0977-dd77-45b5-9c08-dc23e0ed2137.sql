
-- Drop the overly permissive policy
DROP POLICY "Anyone authenticated can create an organization" ON public.organizations;

-- Replace with a more restrictive policy: only users without an org can create one
CREATE POLICY "Users without org can create an organization"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (public.get_user_organization_id(auth.uid()) IS NULL);
