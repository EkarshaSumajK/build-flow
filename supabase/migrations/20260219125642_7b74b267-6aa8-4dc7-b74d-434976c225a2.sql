
-- Allow owners to delete child organizations
CREATE POLICY "Owners can delete child organizations"
ON public.organizations
FOR DELETE
USING (
  parent_organization_id = get_user_organization_id(auth.uid())
  AND has_role(auth.uid(), 'owner')
);
