-- Create storage bucket for generated assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('bunker-assets', 'bunker-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to all files in the bucket
CREATE POLICY "Public read access for bunker assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'bunker-assets');

-- Allow service role to upload (edge functions use service role)
CREATE POLICY "Service role can upload bunker assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bunker-assets');

CREATE POLICY "Service role can update bunker assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'bunker-assets');

CREATE POLICY "Service role can delete bunker assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'bunker-assets');