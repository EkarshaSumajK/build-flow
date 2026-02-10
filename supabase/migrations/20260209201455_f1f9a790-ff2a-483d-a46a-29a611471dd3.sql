
-- Client portal access tokens for sharing read-only project views
CREATE TABLE public.client_portal_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  client_name TEXT NOT NULL,
  client_email TEXT,
  permissions TEXT[] NOT NULL DEFAULT ARRAY['progress', 'photos', 'reports'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_portal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage tokens in their org"
ON public.client_portal_tokens
FOR ALL
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE TRIGGER update_client_portal_tokens_updated_at
BEFORE UPDATE ON public.client_portal_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
