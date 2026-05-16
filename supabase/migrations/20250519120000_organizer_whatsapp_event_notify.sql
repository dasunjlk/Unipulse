-- Organizer WhatsApp contact + Meta/n8n delivery bookkeeping

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at timestamptz;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_whatsapp_e164_chk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_whatsapp_e164_chk
  CHECK (
    whatsapp_number IS NULL
    OR whatsapp_number ~ '^\+[1-9]\d{7,14}$'
  );

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS whatsapp_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_whatsapp_number_idx
  ON public.profiles (whatsapp_number)
  WHERE whatsapp_number IS NOT NULL;

-- Auth trigger: mirror auth.users -> profiles (includes WhatsApp fields)
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
  wa_num text;
  wa_opt_raw text;
  wa_opt_ts timestamptz;
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

  wa_num := nullif(trim(coalesce(NEW.raw_user_meta_data->>'whatsapp_number', '')), '');
  wa_opt_raw := nullif(trim(coalesce(NEW.raw_user_meta_data->>'whatsapp_opt_in_at', '')), '');

  wa_opt_ts := NULL;
  IF wa_opt_raw IS NOT NULL THEN
    BEGIN
      wa_opt_ts := wa_opt_raw::timestamptz;
    EXCEPTION
      WHEN OTHERS THEN
        wa_opt_ts := NULL;
    END;
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    university_id,
    club_name,
    role,
    account_status,
    manual_interests,
    whatsapp_number,
    whatsapp_opt_in_at
  )
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', ''),
    nullif(NEW.raw_user_meta_data->>'university_id', ''),
    nullif(NEW.raw_user_meta_data->>'club_name', ''),
    role_text::public.user_role,
    acc,
    interests,
    wa_num,
    wa_opt_ts
  );

  RETURN NEW;
END;
$$;
