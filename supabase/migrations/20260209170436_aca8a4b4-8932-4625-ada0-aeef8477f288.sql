
-- ==========================================
-- 1. DRAWINGS TABLE (Drawing Management)
-- ==========================================
CREATE TABLE public.drawings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  drawing_number TEXT,
  category TEXT NOT NULL DEFAULT 'architectural',
  revision INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  uploaded_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view drawings" ON public.drawings
  FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can manage drawings" ON public.drawings
  FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

CREATE TRIGGER update_drawings_updated_at
  BEFORE UPDATE ON public.drawings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 2. CHECKLISTS / SITE INSPECTIONS
-- ==========================================
CREATE TABLE public.checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'quality',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view checklist templates" ON public.checklist_templates
  FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can manage checklist templates" ON public.checklist_templates
  FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.checklist_templates(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'quality',
  status TEXT NOT NULL DEFAULT 'pending',
  inspector_id UUID NOT NULL,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_result TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inspections" ON public.inspections
  FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can manage inspections" ON public.inspections
  FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

CREATE TRIGGER update_inspections_updated_at
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 3. CLIENT BILLING (RA BILLS)
-- ==========================================
CREATE TABLE public.ra_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_from DATE,
  period_to DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  retention_percent NUMERIC DEFAULT 5,
  retention_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ra_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view RA bills" ON public.ra_bills
  FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can manage RA bills" ON public.ra_bills
  FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

CREATE TRIGGER update_ra_bills_updated_at
  BEFORE UPDATE ON public.ra_bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ra_bill_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.ra_bills(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'nos',
  quantity NUMERIC NOT NULL DEFAULT 0,
  rate NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  previous_quantity NUMERIC DEFAULT 0,
  current_quantity NUMERIC NOT NULL DEFAULT 0,
  cumulative_quantity NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE public.ra_bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view RA bill items" ON public.ra_bill_items
  FOR SELECT USING (bill_id IN (SELECT id FROM public.ra_bills WHERE organization_id = get_user_organization_id(auth.uid())));

CREATE POLICY "Org members can manage RA bill items" ON public.ra_bill_items
  FOR ALL USING (bill_id IN (SELECT id FROM public.ra_bills WHERE organization_id = get_user_organization_id(auth.uid())));

-- ==========================================
-- 4. DOCUMENT MANAGEMENT
-- ==========================================
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder TEXT NOT NULL DEFAULT 'General',
  title TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by UUID NOT NULL,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view documents" ON public.documents
  FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can manage documents" ON public.documents
  FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 5. STORAGE BUCKETS
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('drawings', 'drawings', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

CREATE POLICY "Authenticated users can upload drawings" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'drawings' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view drawings" ON storage.objects
  FOR SELECT USING (bucket_id = 'drawings');

CREATE POLICY "Authenticated users can delete drawings" ON storage.objects
  FOR DELETE USING (bucket_id = 'drawings' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
