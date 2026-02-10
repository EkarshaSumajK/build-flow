
-- ========== ENUMS ==========
CREATE TYPE public.project_status AS ENUM ('active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE public.task_status AS ENUM ('not_started', 'in_progress', 'completed', 'blocked');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.material_request_status AS ENUM ('pending', 'approved', 'rejected', 'fulfilled');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'half_day', 'overtime');
CREATE TYPE public.issue_category AS ENUM ('safety', 'quality', 'delay', 'material', 'labour', 'other');
CREATE TYPE public.issue_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.issue_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- ========== PROJECTS ==========
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  client_name TEXT,
  status project_status NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget NUMERIC(15,2) DEFAULT 0,
  spent NUMERIC(15,2) DEFAULT 0,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== PROJECT MEMBERS ==========
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'site_engineer',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- ========== TASKS ==========
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'not_started',
  priority task_priority NOT NULL DEFAULT 'medium',
  assignee_id UUID REFERENCES auth.users(id),
  parent_task_id UUID REFERENCES public.tasks(id),
  start_date DATE,
  due_date DATE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== TASK COMMENTS ==========
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- ========== MATERIALS ==========
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'nos',
  standard_rate NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== MATERIAL REQUESTS (INDENTS) ==========
CREATE TABLE public.material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  unit_price NUMERIC(12,2),
  status material_request_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  required_date DATE,
  notes TEXT,
  requested_by UUID REFERENCES auth.users(id) NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_material_requests_updated_at
  BEFORE UPDATE ON public.material_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== STOCK ENTRIES ==========
CREATE TABLE public.stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'in' CHECK (entry_type IN ('in', 'out')),
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;

-- ========== WORKERS ==========
CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  trade TEXT,
  daily_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  contractor TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== ATTENDANCE ==========
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  overtime_hours NUMERIC(4,1) DEFAULT 0,
  deduction NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (worker_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ========== ISSUES ==========
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category issue_category NOT NULL DEFAULT 'other',
  severity issue_severity NOT NULL DEFAULT 'medium',
  status issue_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== ISSUE COMMENTS ==========
CREATE TABLE public.issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.issue_comments ENABLE ROW LEVEL SECURITY;

-- ========== RLS POLICIES ==========

-- Projects: org-scoped
CREATE POLICY "Org members can view projects" ON public.projects
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can create projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Owners can delete projects" ON public.projects
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()) AND public.has_role(auth.uid(), 'owner'));

-- Project Members
CREATE POLICY "Org members can view project members" ON public.project_members
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id(auth.uid())));

CREATE POLICY "Org members can manage project members" ON public.project_members
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id(auth.uid())));

-- Tasks: org-scoped
CREATE POLICY "Org members can view tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can create tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can delete tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Task Comments
CREATE POLICY "Org members can view task comments" ON public.task_comments
  FOR SELECT TO authenticated
  USING (task_id IN (SELECT id FROM public.tasks WHERE organization_id = public.get_user_organization_id(auth.uid())));

CREATE POLICY "Authenticated users can create task comments" ON public.task_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON public.task_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Materials: org-scoped
CREATE POLICY "Org members can view materials" ON public.materials
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can manage materials" ON public.materials
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Material Requests
CREATE POLICY "Org members can view material requests" ON public.material_requests
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can create material requests" ON public.material_requests
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can update material requests" ON public.material_requests
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Stock Entries
CREATE POLICY "Org members can view stock" ON public.stock_entries
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can manage stock" ON public.stock_entries
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Workers
CREATE POLICY "Org members can view workers" ON public.workers
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can manage workers" ON public.workers
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Attendance
CREATE POLICY "Org members can view attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can manage attendance" ON public.attendance
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Issues
CREATE POLICY "Org members can view issues" ON public.issues
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can create issues" ON public.issues
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can update issues" ON public.issues
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can delete issues" ON public.issues
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Issue Comments
CREATE POLICY "Org members can view issue comments" ON public.issue_comments
  FOR SELECT TO authenticated
  USING (issue_id IN (SELECT id FROM public.issues WHERE organization_id = public.get_user_organization_id(auth.uid())));

CREATE POLICY "Authenticated users can create issue comments" ON public.issue_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own issue comments" ON public.issue_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
