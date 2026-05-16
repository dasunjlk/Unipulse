-- =============================================================================
-- UniPulse — consolidated migration for HOSTED Supabase (run ONCE from Studio)
-- =============================================================================
--
-- Prerequisites:
--   • Base schema migration 20250516120000_init.sql is already applied.
--
-- Contents (same as repo migrations, in order):
--   • 20250517120000_event_moderation_registrations_delete.sql
--   • 20250518120000_campus_locations.sql
--
-- Warnings:
--   • Deletes ALL rows from public.events (registration rows CASCADE).
--   • Adds NOT NULL location_id + trigger so future events must pin to locations.
--
-- After running this manually, align CLI history once you use supabase CLI:
--   See README “Hosted Supabase migrations”.
-- =============================================================================

-- --- 20250517120000_event_moderation_registrations_delete.sql ---
-- Allow students to remove their own event registration (unregister)
CREATE POLICY registrations_delete_own ON public.registrations
FOR DELETE TO authenticated
USING (student_id = auth.uid());

-- Moderate campus-wide listings: admins update/delete any event
CREATE POLICY events_update_admin ON public.events
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY events_delete_admin ON public.events
FOR DELETE TO authenticated
USING (public.is_admin());

-- --- 20250518120000_campus_locations.sql ---
-- Campus map: admin-defined locations, events pin to locations, optional background image

-- ---------------------------------------------------------------------------
-- Locations table
-- ---------------------------------------------------------------------------
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  grid_row integer NOT NULL CHECK (grid_row >= 0),
  grid_col integer NOT NULL CHECK (grid_col >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grid_row, grid_col),
  UNIQUE (code),
  CONSTRAINT locations_valid_name CHECK (trim(name) <> ''),
  CONSTRAINT locations_valid_code CHECK (trim(code) <> '')
);

CREATE INDEX locations_sort_idx ON public.locations (grid_row, grid_col);

-- Locations must stay inside current campus grid dimensions
CREATE OR REPLACE FUNCTION public.locations_within_grid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  SELECT ac.grid_n INTO n FROM public.app_config ac WHERE ac.id = 1;
  IF n IS NULL THEN
    RAISE EXCEPTION 'app_config missing';
  END IF;
  IF NEW.grid_row >= n OR NEW.grid_col >= n THEN
    RAISE EXCEPTION 'location (%,%) is outside campus grid (%x%)',
      NEW.grid_row, NEW.grid_col, n, n;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER locations_within_grid_trg
BEFORE INSERT OR UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.locations_within_grid();

CREATE OR REPLACE FUNCTION public.locations_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER locations_set_updated_at_trg
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.locations_set_updated_at();

-- Cannot shrink campus grid below any occupied cell index
CREATE OR REPLACE FUNCTION public.app_config_guard_grid_n()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.grid_n IS DISTINCT FROM NEW.grid_n AND NEW.grid_n < OLD.grid_n THEN
    IF EXISTS (
      SELECT 1
      FROM public.locations loc
      WHERE loc.grid_row >= NEW.grid_n OR loc.grid_col >= NEW.grid_n
    ) THEN
      RAISE EXCEPTION 'cannot shrink grid_n to %: one or more locations would fall outside the grid',
        NEW.grid_n;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER app_config_guard_grid_n_trg
BEFORE UPDATE ON public.app_config
FOR EACH ROW
EXECUTE FUNCTION public.app_config_guard_grid_n();

ALTER TABLE public.app_config
ADD COLUMN IF NOT EXISTS map_background_url text;

-- Seed locations before events reference them
INSERT INTO public.locations (name, code, grid_row, grid_col)
VALUES
  ('Main Quad', 'MQ', 2, 3),
  ('Lecture Hall A', 'LH', 5, 7),
  ('Student Union', 'SU', 1, 1),
  ('Central Library', 'LB', 8, 2),
  ('Great Lawn', 'GL', 4, 9);

-- ---------------------------------------------------------------------------
-- Wipe existing events (dev-focused); dependents cascade via FK
-- ---------------------------------------------------------------------------
DELETE FROM public.events;

-- ---------------------------------------------------------------------------
-- Events → locations (grid_row/col synced from chosen location)
-- ---------------------------------------------------------------------------
ALTER TABLE public.events
ADD COLUMN location_id uuid REFERENCES public.locations (id)
ON DELETE RESTRICT;

COMMENT ON COLUMN public.events.location_id IS 'Required for new rows; FK sync keeps grid_row/grid_col aligned.';

ALTER TABLE public.events ALTER COLUMN location_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.events_sync_grid_from_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r integer;
  c integer;
BEGIN
  IF NEW.location_id IS NULL THEN
    RAISE EXCEPTION 'events.location_id is required';
  END IF;

  SELECT loc.grid_row, loc.grid_col
  INTO r, c
  FROM public.locations loc
  WHERE loc.id = NEW.location_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid location_id %', NEW.location_id;
  END IF;

  NEW.grid_row := r;
  NEW.grid_col := c;
  RETURN NEW;
END;
$$;

-- Always derive grid coords from location_id so clients cannot spoof cell indices
CREATE TRIGGER events_sync_grid_trg
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.events_sync_grid_from_location();

-- ---------------------------------------------------------------------------
-- Storage: optional campus background image for map UI
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('campus-map', 'campus-map', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY campus_map_assets_public_read ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'campus-map');

CREATE POLICY campus_map_assets_admin_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'campus-map'
  AND public.is_admin()
);

CREATE POLICY campus_map_assets_admin_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'campus-map'
  AND public.is_admin()
);

CREATE POLICY campus_map_assets_admin_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'campus-map'
  AND public.is_admin()
);

-- ---------------------------------------------------------------------------
-- RLS on locations (read for everyone; write admins only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY locations_select_public ON public.locations
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY locations_insert_admin ON public.locations
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY locations_update_admin ON public.locations
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY locations_delete_admin ON public.locations
FOR DELETE TO authenticated
USING (public.is_admin());
