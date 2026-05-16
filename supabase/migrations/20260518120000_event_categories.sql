-- Event categories: admin-managed labels; events link via junction table

-- ---------------------------------------------------------------------------
-- event_categories
-- ---------------------------------------------------------------------------
CREATE TABLE public.event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  gradient text NOT NULL DEFAULT 'from-blue-600 to-cyan-600',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_categories_valid_slug CHECK (trim(slug) <> '' AND slug = lower(slug)),
  CONSTRAINT event_categories_valid_label CHECK (trim(label) <> '')
);

CREATE INDEX event_categories_sort_idx ON public.event_categories (sort_order, label);

CREATE OR REPLACE FUNCTION public.event_categories_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER event_categories_set_updated_at_trg
BEFORE UPDATE ON public.event_categories
FOR EACH ROW
EXECUTE FUNCTION public.event_categories_set_updated_at();

-- ---------------------------------------------------------------------------
-- event_category_links (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE public.event_category_links (
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.event_categories (id) ON DELETE RESTRICT,
  PRIMARY KEY (event_id, category_id)
);

CREATE INDEX event_category_links_category_idx ON public.event_category_links (category_id);
CREATE INDEX event_category_links_event_idx ON public.event_category_links (event_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_category_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_categories_select_public ON public.event_categories
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY event_categories_insert_admin ON public.event_categories
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY event_categories_update_admin ON public.event_categories
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY event_categories_delete_admin ON public.event_categories
FOR DELETE TO authenticated
USING (public.is_admin());

CREATE POLICY event_category_links_select_public ON public.event_category_links
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY event_category_links_insert_owner_or_admin ON public.event_category_links
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = event_id
      AND e.organizer_id = auth.uid()
      AND public.is_approved_organizer()
  )
);

CREATE POLICY event_category_links_delete_owner_or_admin ON public.event_category_links
FOR DELETE TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = event_category_links.event_id
      AND e.organizer_id = auth.uid()
      AND public.is_approved_organizer()
  )
);

CREATE POLICY event_category_links_update_admin ON public.event_category_links
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed default categories (slugs match prior sidebar / inference labels)
-- ---------------------------------------------------------------------------
INSERT INTO public.event_categories (slug, label, gradient, sort_order) VALUES
  ('tech', 'Tech', 'from-purple-600 to-indigo-600', 10),
  ('music', 'Music', 'from-pink-600 to-rose-600', 20),
  ('sports', 'Sports', 'from-green-600 to-emerald-600', 30),
  ('workshops', 'Workshops', 'from-amber-600 to-orange-600', 40),
  ('career', 'Career', 'from-violet-600 to-purple-600', 50),
  ('campus', 'Campus', 'from-blue-600 to-cyan-600', 60);
