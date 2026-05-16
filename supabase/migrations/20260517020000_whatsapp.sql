-- WhatsApp contact fields on profiles + extend auth sync trigger

ALTER TABLE public.profiles
  ADD COLUMN whatsapp_number text,
  ADD COLUMN whatsapp_consent boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_whatsapp_number_format_chk
  CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^94\d{9}$');

CREATE UNIQUE INDEX profiles_whatsapp_number_uniq ON public.profiles (whatsapp_number)
  WHERE whatsapp_number IS NOT NULL;

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
  consent_raw text;
  consent_bool boolean;
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

  consent_raw := NEW.raw_user_meta_data->>'whatsapp_consent';
  IF consent_raw IS NULL THEN
    consent_bool := false;
  ELSE
    consent_bool := consent_raw IN ('true', 't', '1', 'yes', 'TRUE');
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
    whatsapp_consent
  )
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', ''),
    nullif(NEW.raw_user_meta_data->>'university_id', ''),
    nullif(NEW.raw_user_meta_data->>'club_name', ''),
    role_text::public.user_role,
    acc,
    interests,
    nullif(trim(coalesce(NEW.raw_user_meta_data->>'whatsapp_number', '')), ''),
    consent_bool
  );

  RETURN NEW;
END;
$$;
