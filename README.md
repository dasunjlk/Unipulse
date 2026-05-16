# UniPulse

Mobile-first event platform scaffold: **Next.js (App Router) + Supabase + n8n hooks**.

## Prerequisites

- Node 18+
- [Docker Desktop](https://docs.docker.com/desktop/) (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase` works)

## Environment

Copy [.env.example](.env.example) to `.env.local` and fill in keys from local Supabase (`supabase start` prints API URL and anon/service keys).

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server user-scoped client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin client (auth admin API, onboard callback inserts) |
| `N8N_BASE_URL` | Base URL for outbound webhooks (ngrok in dev) |
| `N8N_SHARED_SECRET` | Shared HMAC secret (Next.js ↔ n8n) |
| `N8N_MAGIC_UPLOAD_URL` | Optional override for Phase 1 PDF extract webhook |
| `N8N_MERCH_CHECKOUT_URL` | Optional override for Phase 3 student merch purchase webhook |

## Database & seed

```bash
npx supabase start
npm run db:reset   # migrations + seed.sql
```

## Hosted Supabase (cloud DB)

Your Next app connects to whichever project URLs/keys live in `.env.local`. After pulling new migrations, apply them **to that remote project** — otherwise features that depend on new tables/policies (e.g. campus map `locations`, `campus-map` bucket) will 400 against PostgREST.

**Option A — CLI (`supabase` v2+, PAT-only link)**

1. [Create an access token](https://supabase.com/dashboard/account/tokens) (starts with `sbp_`).
2. Put it in `.env.local`:
   ```
   SUPABASE_ACCESS_TOKEN=sbp_...
   # optional if your project ref differs from the default UniPulse staging ref:
   # SUPABASE_PROJECT_REF=your_twenty_char_ref
   ```
3. From the repo root:
   ```bash
   npm run db:push:cloud
   ```
   This runs `supabase link`, executes [`scripts/ensure-grid-for-seed.sql`](scripts/ensure-grid-for-seed.sql) (sets `grid_n` to **at least 10** so campus seed pins in migration [`20250518120000`](supabase/migrations/20250518120000_campus_locations.sql) succeed), then `supabase db push`.

**Option B — SQL Editor**

If you prefer the dashboard: paste and run **[`supabase/cloud_apply_bundle.sql`](supabase/cloud_apply_bundle.sql)** once (it includes `DELETE FROM public.events`; registration rows CASCADE). Afterwards, when you switch back to the CLI on that project, reconcile migration history (`supabase migration repair`, etc.) so `db push` doesn’t attempt to replay the same SQL.

**Smoke-test** after either option: restart `npm run dev` and hit `GET /api/locations` — should return 200 JSON, not PostgREST `PGRST205`.

Default **seed admin** (login only; never via signup UI):

- Email: `admin@unipulse.local`
- Password: `ChangeMe_SeedAdmin123` (match [`supabase/seed.sql`](supabase/seed.sql) and `.env.example`)

After schema changes, regenerate types (optional; repo includes hand-maintained types):

```bash
npm run gen:types
```

## Auth model

- **Students**: University ID + password → synthetic email `<normalized-id>@students.unipulse.local` via [`lib/auth/student-email.ts`](lib/auth/student-email.ts). Approved immediately.
- **Organizers**: Real email + password; `account_status = pending` until an admin approves.
- **Admins**: Created only via seed/SQL; use email + password on `/login`.
- **Guests**: No profile; can browse public events and call **open-event upvote** RPC.

RLS + API guards enforce **approved organizers** for event mutations and **students** for registrations / merch RPCs.

## API surface (summary)

| Area | Route |
|------|--------|
| Auth | `POST /api/auth/signup/student`, `POST /api/auth/signup/organizer`, `POST /api/auth/login/student`, `POST /api/auth/login`, `POST /api/auth/logout` |
| Events | `GET/POST /api/events`, `GET/PATCH/DELETE /api/events/[id]` |
| Campus map | `GET /api/locations` |
| Engagement | `PATCH /api/events/[id]/upvote`, `POST /api/events/[id]/register`, `GET /api/events/[id]/ics` (+ `?format=google`) |
| Merch (V1 mock) | `POST /api/events/[id]/merch/purchase`, `POST /api/events/[id]/merch/export-manifest` |
| Onboarding | `POST /api/onboard` (multipart file → Storage → n8n), `POST /api/onboard/callback` (HMAC JSON → draft event) |
| Admin | `GET /api/admin/organizers/pending`, `POST .../approve`, `POST .../reject`, `GET/PATCH /api/admin/config`, `POST /api/admin/locations`, `PATCH /api/admin/locations/[id]`, `DELETE /api/admin/locations/[id]`, `POST/DELETE /api/admin/map/background` |

## n8n

Outbound helpers live in [`lib/n8n.ts`](lib/n8n.ts). Merch **checkout** (student completed purchase) posts JSON from [`lib/n8n-merch-checkout.ts`](lib/n8n-merch-checkout.ts) to `N8N_MERCH_CHECKOUT_URL` (default: production `.../webhook/merch-checkout`). Expected paths under `N8N_BASE_URL`:

- `/webhook/proposal-uploaded`
- `/webhook/organizer-approved`
- `/webhook/event-published`
- `/webhook/merch-manifest-export`

Calls are **non-throwing** (slow tunnels must not break the UI). Inbound callbacks must send header `X-N8N-Signature` (hex HMAC-SHA256 of raw body with `N8N_SHARED_SECRET`). See [`lib/auth/hmac.ts`](lib/auth/hmac.ts).

Local tunnel example: `ngrok http 5678` → paste HTTPS origin into `N8N_BASE_URL`.

## Test UI (scaffold)

Plain pages under `app/` exercise the APIs before your designer UI lands. Look for `SCAFFOLD` comments.

## TODO (V2.0 roadmap)

- Stripe for merch + pinned promos  
- Facebook Graph publishing from social caption staging  
- Behavioral interest tagging  
- Automated PDF certificates / feedback workflow depth  
- Rich gallery / community timeline  

*(See spec § Version 2.0.)*

## Scripts

- `npm run dev` — Next.js dev server  
- `npm run build` — production build  
- `npm run lint` — ESLint  
- `npm run db:push:cloud` — `supabase link` + `db push` for hosted DB (needs `SUPABASE_ACCESS_TOKEN=sbp_...` in `.env.local`)  
