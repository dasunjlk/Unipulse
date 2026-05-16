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

## Database & seed

```bash
npx supabase start
npm run db:reset   # migrations + seed.sql
```

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
| Engagement | `PATCH /api/events/[id]/upvote`, `POST /api/events/[id]/register`, `GET /api/events/[id]/ics` (+ `?format=google`) |
| Merch (V1 mock) | `POST /api/events/[id]/merch/purchase`, `POST /api/events/[id]/merch/export-manifest` |
| Onboarding | `POST /api/onboard` (multipart file → Storage → n8n), `POST /api/onboard/callback` (HMAC JSON → draft event) |
| Admin | `GET /api/admin/organizers/pending`, `POST .../approve`, `POST .../reject`, `GET/PATCH /api/admin/config` |

## n8n

Outbound helpers live in [`lib/n8n.ts`](lib/n8n.ts). Expected paths under `N8N_BASE_URL`:

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
