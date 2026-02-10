
-- Add attachments column to issues
ALTER TABLE public.issues ADD COLUMN attachments text[] DEFAULT '{}';

-- Create storage bucket for issue attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('issue-attachments', 'issue-attachments', true);

-- Storage policies
CREATE POLICY "Anyone can view issue attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'issue-attachments');

CREATE POLICY "Authenticated users can upload issue attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'issue-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own issue attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'issue-attachments' AND auth.role() = 'authenticated');
