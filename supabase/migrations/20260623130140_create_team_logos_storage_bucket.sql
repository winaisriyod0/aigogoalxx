
-- Create public storage bucket for team logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('team-logos', 'team-logos', true, 2097152, ARRAY['image/png','image/jpeg','image/webp','image/gif','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: public read
CREATE POLICY "team_logos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'team-logos');

-- Authenticated can upload/update/delete
CREATE POLICY "team_logos_auth_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-logos');

CREATE POLICY "team_logos_auth_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'team-logos');

CREATE POLICY "team_logos_auth_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'team-logos');
