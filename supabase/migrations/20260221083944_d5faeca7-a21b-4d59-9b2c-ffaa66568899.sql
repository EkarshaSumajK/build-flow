
CREATE OR REPLACE FUNCTION public.auto_assign_org_members_to_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  SELECT NEW.id, ur.user_id, ur.role
  FROM public.user_roles ur
  WHERE ur.organization_id = NEW.organization_id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_members_on_project_create
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_org_members_to_project();
