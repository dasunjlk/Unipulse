-- Merch purchases: optional size (for wearable items with configured sizes).
-- purchase_merch: validate p_size when item has non-empty sizes array.

ALTER TABLE public.merch_purchases
  ADD COLUMN IF NOT EXISTS size text;

DROP FUNCTION IF EXISTS public.purchase_merch(uuid, text, integer);

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
  q integer := greatest(coalesce(p_quantity, 1), 1);
  sizes_len integer;
  normalized_size text;
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

  INSERT INTO public.merch_purchases (event_id, student_id, item_id, item_name, price, quantity, size)
  VALUES (p_event_id, auth.uid(), p_item_id, item_name, item_price, q, normalized_size);

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_merch(uuid, text, integer, text) TO authenticated;
