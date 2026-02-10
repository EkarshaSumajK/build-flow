
-- 1. Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Org members can insert notifications" ON public.notifications FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- 2. Vendors table
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  pan_number TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view vendors" ON public.vendors FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Org members can insert vendors" ON public.vendors FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Org members can update vendors" ON public.vendors FOR UPDATE USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Org members can delete vendors" ON public.vendors FOR DELETE USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

-- 3. Worker schedules table
CREATE TABLE public.worker_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  worker_id UUID NOT NULL REFERENCES public.workers(id),
  shift TEXT NOT NULL DEFAULT 'day',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.worker_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view schedules" ON public.worker_schedules FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Org members can insert schedules" ON public.worker_schedules FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Org members can update schedules" ON public.worker_schedules FOR UPDATE USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Org members can delete schedules" ON public.worker_schedules FOR DELETE USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

-- 4. Custom report configs table
CREATE TABLE public.report_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.report_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view reports" ON public.report_configs FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Org members can insert reports" ON public.report_configs FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Org members can update reports" ON public.report_configs FOR UPDATE USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Org members can delete reports" ON public.report_configs FOR DELETE USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

-- 5. Add photo_urls to inspections for photo attachments
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

-- Create inspection-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-photos', 'inspection-photos', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Authenticated users can upload inspection photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'inspection-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view inspection photos" ON storage.objects FOR SELECT USING (bucket_id = 'inspection-photos');

-- Trigger for updated_at on vendors
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_report_configs_updated_at BEFORE UPDATE ON public.report_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
