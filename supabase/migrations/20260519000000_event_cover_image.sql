-- Event cover images: DB column + public storage bucket + RLS policies

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS cover_image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-covers', 'event-covers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS event_covers_insert_own ON storage.objects;
DROP POLICY IF EXISTS event_covers_update_own ON storage.objects;
DROP POLICY IF EXISTS event_covers_delete_own ON storage.objects;
DROP POLICY IF EXISTS event_covers_public_read ON storage.objects;

CREATE POLICY event_covers_insert_own ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-covers'
  AND coalesce((storage.foldername(name))[1], '') = auth.uid()::text
  AND public.is_approved_organizer()
);

CREATE POLICY event_covers_update_own ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'event-covers'
  AND coalesce((storage.foldername(name))[1], '') = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'event-covers'
  AND coalesce((storage.foldername(name))[1], '') = auth.uid()::text
);

CREATE POLICY event_covers_delete_own ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'event-covers'
  AND coalesce((storage.foldername(name))[1], '') = auth.uid()::text
);

CREATE POLICY event_covers_public_read ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'event-covers');
