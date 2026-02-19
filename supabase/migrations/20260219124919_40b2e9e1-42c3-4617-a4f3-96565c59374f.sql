
-- 1. Add parent_organization_id to organizations (one-level nesting)
ALTER TABLE public.organizations
ADD COLUMN parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL DEFAULT NULL;

-- 2. Create index for fast lookups
CREATE INDEX idx_organizations_parent ON public.organizations(parent_organization_id) WHERE parent_organization_id IS NOT NULL;

-- 3. Function: get all organization IDs a user can access
-- Returns: user's own org + child orgs (if user is owner of a parent org)
CREATE OR REPLACE FUNCTION public.get_accessible_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- User's own org
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id
  UNION
  -- Child orgs (only if user is owner of a parent org)
  SELECT child.id
  FROM public.organizations child
  INNER JOIN public.profiles p ON p.user_id = _user_id
  INNER JOIN public.user_roles ur ON ur.user_id = _user_id AND ur.organization_id = p.organization_id
  WHERE child.parent_organization_id = p.organization_id
    AND ur.role = 'owner'
$$;

-- 4. Function: check if user can access a specific org
CREATE OR REPLACE FUNCTION public.can_access_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_accessible_org_ids(_user_id) WHERE get_accessible_org_ids = _org_id
  )
$$;

-- 5. Update organizations RLS: owners can view child orgs, siblings can view each other
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;

-- New: users can view their own org + child orgs (if owner) + sibling orgs (same parent)
CREATE POLICY "Users can view accessible organizations"
ON public.organizations
FOR SELECT
USING (
  id IN (SELECT get_accessible_org_ids(auth.uid()))
  OR (
    -- Sibling visibility: orgs sharing the same parent, if user's org has a parent
    parent_organization_id IS NOT NULL
    AND parent_organization_id = (
      SELECT o.parent_organization_id FROM public.organizations o
      INNER JOIN public.profiles p ON p.organization_id = o.id
      WHERE p.user_id = auth.uid()
      LIMIT 1
    )
  )
);

-- 6. Allow parent org owners to create child orgs
DROP POLICY IF EXISTS "Users without org can create an organization" ON public.organizations;

CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  -- New user creating first org (no org yet)
  get_user_organization_id(auth.uid()) IS NULL
  OR (
    -- Owner creating a child org under their own org
    parent_organization_id = get_user_organization_id(auth.uid())
    AND has_role(auth.uid(), 'owner')
  )
);

-- 7. Owners can update their org or child orgs
DROP POLICY IF EXISTS "Owners can update their organization" ON public.organizations;

CREATE POLICY "Owners can update accessible organizations"
ON public.organizations
FOR UPDATE
USING (
  has_role(auth.uid(), 'owner')
  AND id IN (SELECT get_accessible_org_ids(auth.uid()))
);
