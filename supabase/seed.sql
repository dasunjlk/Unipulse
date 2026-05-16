-- UniPulse seed: bootstrap admin (login only — never exposed via signup UI).
-- Default credentials match `.env.example`; change password in production.

DO $$
DECLARE
  admin_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@unipulse.local') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      'admin@unipulse.local',
      extensions.crypt('ChangeMe_SeedAdmin123', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Seed Admin","role":"admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      admin_id,
      admin_id::text,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@unipulse.local'),
      'email',
      now(),
      now(),
      now()
    );
  END IF;
END $$;
