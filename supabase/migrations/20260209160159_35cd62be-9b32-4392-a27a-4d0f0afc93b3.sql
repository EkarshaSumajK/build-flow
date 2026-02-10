
-- Worker-Task assignments table
CREATE TABLE public.worker_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(worker_id, task_id)
);

ALTER TABLE public.worker_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view worker assignments"
ON public.worker_assignments FOR SELECT
USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can manage worker assignments"
ON public.worker_assignments FOR ALL
USING (organization_id = get_user_organization_id(auth.uid()));
