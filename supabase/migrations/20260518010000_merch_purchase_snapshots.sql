-- Denormalize buyer + item presentation fields on each purchase (organizers cannot SELECT other profiles under RLS).

ALTER TABLE public.merch_purchases
  ADD COLUMN IF NOT EXISTS buyer_full_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS buyer_university_id text,
  ADD COLUMN IF NOT EXISTS item_type text,
  ADD COLUMN IF NOT EXISTS item_image_url text;

DROP FUNCTION IF EXISTS public.purchase_merch(uuid, text, integer, text);

CREATE OR REPLACE FUNCTION public.purchase_merch(
  p_event_id uuid,
  p_item_id text,
  p_quantity integer DEFAULT 1,
  p_size text DEFAULT NULL
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
  item_type_val text;
  item_image_url_val text;
  q integer := greatest(coalesce(p_quantity, 1), 1);
  sizes_len integer;
  normalized_size text;
  buyer_name text;
  buyer_u_id text;
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

  SELECT pr.full_name, pr.university_id
  INTO buyer_name, buyer_u_id
  FROM public.profiles pr
  WHERE pr.id = auth.uid();

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
  item_type_val := nullif(trim(item->>'item_type'), '');
  item_image_url_val := nullif(trim(item->>'image_url'), '');
  sizes_len := jsonb_array_length(coalesce(item->'sizes', '[]'::jsonb));

  IF sizes_len > 0 THEN
    IF p_size IS NULL OR trim(p_size) = '' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'size_required');
    END IF;
    normalized_size := trim(p_size);
    IF NOT (coalesce(item->'sizes', '[]'::jsonb) @> to_jsonb(normalized_size)) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_size');
    END IF;
  ELSE
    normalized_size := NULL;
  END IF;

  INSERT INTO public.merch_purchases (
    event_id,
    student_id,
    item_id,
    item_name,
    price,
    quantity,
    size,
    buyer_full_name,
    buyer_university_id,
    item_type,
    item_image_url
  )
  VALUES (
    p_event_id,
    auth.uid(),
    p_item_id,
    item_name,
    item_price,
    q,
    normalized_size,
    coalesce(nullif(trim(buyer_name), ''), 'Student'),
    nullif(trim(buyer_u_id), ''),
    item_type_val,
    item_image_url_val
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_merch(uuid, text, integer, text) TO authenticated;
