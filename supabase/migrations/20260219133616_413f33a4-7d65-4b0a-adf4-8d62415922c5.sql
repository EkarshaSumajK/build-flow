
-- Add project_code column
ALTER TABLE public.projects ADD COLUMN project_code text UNIQUE;

-- Create a sequence for project codes
CREATE SEQUENCE IF NOT EXISTS project_code_seq START 1;

-- Backfill existing projects with codes
UPDATE public.projects 
SET project_code = 'PRJ-' || LPAD(nextval('project_code_seq')::text, 4, '0')
WHERE project_code IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.projects ALTER COLUMN project_code SET NOT NULL;

-- Set default for new projects
ALTER TABLE public.projects ALTER COLUMN project_code SET DEFAULT 'PRJ-' || LPAD(nextval('project_code_seq')::text, 4, '0');

-- Create function to auto-generate project code on insert
CREATE OR REPLACE FUNCTION public.generate_project_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.project_code IS NULL OR NEW.project_code = '' THEN
    NEW.project_code := 'PRJ-' || LPAD(nextval('project_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER set_project_code
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.generate_project_code();
