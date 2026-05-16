-- UniPulse initial schema: enums, tables, RPCs, RLS, storage buckets

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('student', 'organizer', 'admin');
CREATE TYPE public.account_status AS ENUM ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  university_id text,
  club_name text,
  role public.user_role NOT NULL DEFAULT 'student',
  account_status public.account_status NOT NULL DEFAULT 'approved',
  manual_interests text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_account_status_rule CHECK (
    role = 'organizer'::public.user_role OR account_status = 'approved'::public.account_status
  )
);

CREATE INDEX profiles_role_account_status_idx ON public.profiles (role, account_status);

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  proposal_file_url text,
  start_at timestamptz,
  end_at timestamptz,
  venue text,
  grid_row integer NOT NULL DEFAULT 0,
  grid_col integer NOT NULL DEFAULT 0,
  is_open_event boolean NOT NULL DEFAULT true,
  is_pinned boolean NOT NULL DEFAULT false,
  upvote_count integer NOT NULL DEFAULT 0,
  ticket_capacity integer NOT NULL DEFAULT 0,
  merch_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_draft boolean NOT NULL DEFAULT false,
  social_caption_staging text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_ticket_capacity_nonneg CHECK (ticket_capacity >= 0)
);

CREATE INDEX events_grid_idx ON public.events (grid_row, grid_col);
CREATE INDEX events_start_idx ON public.events (start_at);

CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, student_id)
);

CREATE INDEX registrations_event_idx ON public.registrations (event_id);

CREATE TABLE public.merch_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  item_id text NOT NULL,
  item_name text NOT NULL,
  price numeric(12, 2) NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  purchase_date timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX merch_purchases_event_idx ON public.merch_purchases (event_id);

CREATE TABLE public.app_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  grid_n integer NOT NULL DEFAULT 10 CHECK (grid_n >= 1 AND grid_n <= 99),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_config (id, grid_n) VALUES (1, 10);

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER): avoid RLS recursion
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_organizer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'organizer'::public.user_role
      AND p.account_status = 'approved'::public.account_status
  );
$$;

-- ---------------------------------------------------------------------------
-- Auth trigger: mirror auth.users -> profiles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_text text;
  acc public.account_status;
  interests text[];
BEGIN
  role_text := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  IF role_text = 'organizer' THEN
    acc := 'pending'::public.account_status;
  ELSE
    acc := 'approved'::public.account_status;
  END IF;

  SELECT coalesce(array_agg(x ORDER BY ordinality), '{}'::text[])
  INTO interests
  FROM jsonb_array_elements_text(coalesce(NEW.raw_user_meta_data->'manual_interests', '[]'::jsonb))
    WITH ORDINALITY AS t(x, ordinality);

  INSERT INTO public.profiles (id, full_name, university_id, club_name, role, account_status, manual_interests)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', ''),
    nullif(NEW.raw_user_meta_data->>'university_id', ''),
    nullif(NEW.raw_user_meta_data->>'club_name', ''),
    role_text::public.user_role,
    acc,
    interests
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_upvote(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.events
  SET upvote_count = upvote_count + 1
  WHERE id = p_event_id AND is_open_event = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_for_event(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev public.events%ROWTYPE;
  cnt integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = 'student'::public.user_role
      AND pr.account_status = 'approved'::public.account_status
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_student');
  END IF;

  SELECT * INTO ev FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;

  IF ev.is_open_event THEN
    RETURN jsonb_build_object('ok', false, 'error', 'open_event_use_upvote');
  END IF;

  SELECT count(*) INTO cnt FROM public.registrations WHERE event_id = p_event_id;

  IF ev.ticket_capacity > 0 AND cnt >= ev.ticket_capacity THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sold_out');
  END IF;

  INSERT INTO public.registrations (event_id, student_id)
  VALUES (p_event_id, auth.uid());

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_merch(
  p_event_id uuid,
  p_item_id text,
  p_quantity integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  item_price numeric(12, 2);
  item_name text;
  q integer := greatest(coalesce(p_quantity, 1), 1);
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = 'student'::public.user_role
      AND pr.account_status = 'approved'::public.account_status
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_student');
  END IF;

  SELECT elem
  INTO item
  FROM public.events e,
       jsonb_array_elements(e.merch_items) AS elem
  WHERE e.id = p_event_id
    AND elem->>'id' = p_item_id
  LIMIT 1;

  IF item IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_item');
  END IF;

  item_price := (item->>'price')::numeric(12, 2);
  item_name := coalesce(item->>'name', 'Item');

  INSERT INTO public.merch_purchases (event_id, student_id, item_id, item_name, price, quantity)
  VALUES (p_event_id, auth.uid(), p_item_id, item_name, item_price, q);

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_upvote(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_for_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_merch(uuid, text, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merch_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_own_or_admin ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_update_own ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY profiles_admin_update ON public.profiles
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- events: hide drafts from public; organizer sees own drafts; admin sees all
CREATE POLICY events_select_public ON public.events
FOR SELECT TO anon, authenticated
USING (
  NOT is_draft
  OR organizer_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY events_insert_organizer ON public.events
FOR INSERT TO authenticated
WITH CHECK (
  organizer_id = auth.uid()
  AND public.is_approved_organizer()
);

CREATE POLICY events_update_owner ON public.events
FOR UPDATE TO authenticated
USING (organizer_id = auth.uid() AND public.is_approved_organizer())
WITH CHECK (organizer_id = auth.uid() AND public.is_approved_organizer());

CREATE POLICY events_delete_owner ON public.events
FOR DELETE TO authenticated
USING (organizer_id = auth.uid() AND public.is_approved_organizer());

-- registrations
CREATE POLICY registrations_select_own ON public.registrations
FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.is_admin());

CREATE POLICY registrations_select_event_owner ON public.registrations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = registrations.event_id
      AND e.organizer_id = auth.uid()
      AND public.is_approved_organizer()
  )
);

CREATE POLICY registrations_insert_student ON public.registrations
FOR INSERT TO authenticated
WITH CHECK (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = 'student'::public.user_role
      AND pr.account_status = 'approved'::public.account_status
  )
);

-- merch_purchases
CREATE POLICY merch_select_own ON public.merch_purchases
FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.is_admin());

CREATE POLICY merch_select_event_owner ON public.merch_purchases
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = merch_purchases.event_id
      AND e.organizer_id = auth.uid()
      AND public.is_approved_organizer()
  )
);

CREATE POLICY merch_insert_student ON public.merch_purchases
FOR INSERT TO authenticated
WITH CHECK (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = 'student'::public.user_role
      AND pr.account_status = 'approved'::public.account_status
  )
);

-- app_config
CREATE POLICY app_config_select_public ON public.app_config
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY app_config_update_admin ON public.app_config
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage buckets & policies
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposals', 'proposals', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('merch-assets', 'merch-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY proposals_insert_own ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'proposals'
  AND coalesce((storage.foldername(name))[1], '') = auth.uid()::text
  AND public.is_approved_organizer()
);

CREATE POLICY proposals_select_own ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'proposals'
  AND coalesce((storage.foldername(name))[1], '') = auth.uid()::text
);

CREATE POLICY proposals_select_admin ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'proposals' AND public.is_admin());

CREATE POLICY merch_assets_insert_organizer ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'merch-assets'
  AND public.is_approved_organizer()
);

CREATE POLICY merch_assets_public_read ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'merch-assets');
