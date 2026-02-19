
-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view accessible organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update accessible organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete child organizations" ON public.organizations;

-- Create a SECURITY DEFINER function to get user's org id without hitting RLS
CREATE OR REPLACE FUNCTION public.get_user_org_id_direct(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Create a SECURITY DEFINER function to check if user is owner
CREATE OR REPLACE FUNCTION public.is_owner_direct(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner'
  );
$$;

-- SELECT: user can see own org + child orgs of own org (if owner) + sibling orgs
CREATE POLICY "Users can view accessible organizations"
ON public.organizations
FOR SELECT
USING (
  id = get_user_org_id_direct(auth.uid())
  OR (
    parent_organization_id = get_user_org_id_direct(auth.uid())
    AND is_owner_direct(auth.uid())
  )
  OR (
    parent_organization_id IS NOT NULL
    AND parent_organization_id = (
      SELECT o.parent_organization_id FROM public.organizations o
      WHERE o.id = get_user_org_id_direct(auth.uid())
    )
  )
);

-- Hmm, the last clause still references organizations. Let me use a SECURITY DEFINER function for that too.
DROP POLICY "Users can view accessible organizations" ON public.organizations;

CREATE OR REPLACE FUNCTION public.get_user_parent_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT parent_organization_id FROM public.organizations WHERE id = (
    SELECT organization_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
  );
$$;

-- SELECT: see own org, child orgs (if owner), sibling orgs (share same parent)
CREATE POLICY "Users can view accessible organizations"
ON public.organizations
FOR SELECT
USING (
  id = get_user_org_id_direct(auth.uid())
  OR (
    parent_organization_id = get_user_org_id_direct(auth.uid())
    AND is_owner_direct(auth.uid())
  )
  OR (
    parent_organization_id IS NOT NULL
    AND get_user_parent_org_id(auth.uid()) IS NOT NULL
    AND parent_organization_id = get_user_parent_org_id(auth.uid())
  )
);

-- UPDATE: owners can update own org + child orgs
CREATE POLICY "Owners can update accessible organizations"
ON public.organizations
FOR UPDATE
USING (
  is_owner_direct(auth.uid())
  AND (
    id = get_user_org_id_direct(auth.uid())
    OR parent_organization_id = get_user_org_id_direct(auth.uid())
  )
);

-- INSERT: new signup (no org yet) or owner creating child org
CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  get_user_org_id_direct(auth.uid()) IS NULL
  OR (
    parent_organization_id = get_user_org_id_direct(auth.uid())
    AND is_owner_direct(auth.uid())
  )
);

-- DELETE: owners can delete child orgs
CREATE POLICY "Owners can delete child organizations"
ON public.organizations
FOR DELETE
USING (
  parent_organization_id = get_user_org_id_direct(auth.uid())
  AND is_owner_direct(auth.uid())
);
