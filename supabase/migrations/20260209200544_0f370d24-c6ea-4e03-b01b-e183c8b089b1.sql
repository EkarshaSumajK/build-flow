
-- 1. Photo Progress Tracking
CREATE TABLE public.photo_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  location TEXT NOT NULL,
  description TEXT,
  photo_url TEXT NOT NULL,
  taken_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  taken_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.photo_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view photo progress" ON public.photo_progress FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Org members can manage photo progress" ON public.photo_progress FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Storage bucket for photo progress
INSERT INTO storage.buckets (id, name, public) VALUES ('photo-progress', 'photo-progress', true);
CREATE POLICY "Anyone can view photo progress" ON storage.objects FOR SELECT USING (bucket_id = 'photo-progress');
CREATE POLICY "Auth users can upload photo progress" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photo-progress' AND auth.role() = 'authenticated');
CREATE POLICY "Auth users can delete photo progress" ON storage.objects FOR DELETE USING (bucket_id = 'photo-progress' AND auth.role() = 'authenticated');

-- 2. Inventory Transfers
CREATE TABLE public.inventory_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  from_project_id UUID NOT NULL REFERENCES public.projects(id),
  to_project_id UUID NOT NULL REFERENCES public.projects(id),
  material_id UUID NOT NULL REFERENCES public.materials(id),
  quantity NUMERIC NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  transferred_by UUID NOT NULL,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view transfers" ON public.inventory_transfers FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Org members can manage transfers" ON public.inventory_transfers FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- 3. Meeting Minutes
CREATE TABLE public.meeting_minutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location TEXT,
  attendees TEXT[] DEFAULT '{}',
  agenda TEXT,
  notes TEXT,
  action_items JSONB DEFAULT '[]',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view meetings" ON public.meeting_minutes FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Org members can manage meetings" ON public.meeting_minutes FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- 4. Equipment Tracking
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  equipment_type TEXT NOT NULL DEFAULT 'general',
  model TEXT,
  serial_number TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  daily_rate NUMERIC DEFAULT 0,
  current_project_id UUID REFERENCES public.projects(id),
  last_maintenance DATE,
  next_maintenance DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view equipment" ON public.equipment FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Org members can manage equipment" ON public.equipment FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

CREATE TABLE public.equipment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID REFERENCES public.projects(id),
  log_type TEXT NOT NULL DEFAULT 'usage',
  description TEXT,
  hours_used NUMERIC,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view equipment logs" ON public.equipment_logs FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Org members can manage equipment logs" ON public.equipment_logs FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- 5. Safety Management
CREATE TABLE public.safety_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  title TEXT NOT NULL,
  incident_type TEXT NOT NULL DEFAULT 'near_miss',
  severity TEXT NOT NULL DEFAULT 'low',
  description TEXT,
  location TEXT,
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reported_by UUID NOT NULL,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'reported',
  corrective_action TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view safety incidents" ON public.safety_incidents FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Org members can manage safety incidents" ON public.safety_incidents FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

CREATE TABLE public.toolbox_talks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  topic TEXT NOT NULL,
  description TEXT,
  conducted_by UUID NOT NULL,
  conducted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  attendee_count INTEGER DEFAULT 0,
  attendee_names TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.toolbox_talks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view toolbox talks" ON public.toolbox_talks FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Org members can manage toolbox talks" ON public.toolbox_talks FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- 6. Team Chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID REFERENCES public.projects(id),
  channel TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  sender_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view chat" ON public.chat_messages FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Org members can send chat" ON public.chat_messages FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
