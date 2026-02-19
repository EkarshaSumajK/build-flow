
-- Junction table to link org-wide workers to specific projects
CREATE TABLE public.project_workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, worker_id)
);

-- Enable RLS
ALTER TABLE public.project_workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view project workers"
ON public.project_workers FOR SELECT
USING (can_access_org(auth.uid(), organization_id));

CREATE POLICY "Org members can manage project workers"
ON public.project_workers FOR ALL
USING (can_access_org(auth.uid(), organization_id));
