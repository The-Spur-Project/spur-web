# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR on http://localhost:5173)
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

### Supabase (local development)

```bash
supabase start                             # Start local Supabase stack
supabase stop                              # Stop local stack
supabase functions serve send-spur         # Serve a single edge function locally
supabase functions deploy send-spur        # Deploy edge function to remote
supabase functions deploy twilio-webhook   # Deploy twilio-webhook to remote
supabase db reset                          # Reset local DB and re-run migrations + seeds
supabase db push                           # Push local migrations to remote
```

Local Supabase services when running: API at `http://127.0.0.1:54321`, Studio at `http://127.0.0.1:54323`.

## Architecture

**React frontend** (`src/`) — single-page app built with React 19 + Vite.

**Dependencies**: `react-router-dom` v6 (routing), `date-fns` (time formatting), `lucide-react` (icons), `@supabase/supabase-js` (backend), Tailwind CSS v4 via PostCSS.

**Routing** uses `react-router-dom` v6 `BrowserRouter` + `Routes`. Routes: `/` (PasswordGate), `/auth` (Auth), `/home` (Home), `/spur/:id` (SpurChat), `/friends` (Friends), `/history` (History).

**Auth pattern** — `AuthContext` in `src/App.jsx` wraps the whole app. It provides `{ session, user, setUser, loading }`. Subscribe to `supabase.auth.onAuthStateChange` once in App, then fetch the `public.users` profile row. The `RequireAuth` wrapper redirects unauthenticated users to `/auth`.

**Route guards**: `<RequireAuth>` in App.jsx — redirects to `/auth` if no session. Password gate uses `localStorage.setItem('spur_authed', 'true')` to remember beta access.

**Supabase backend** (`supabase/`) — two Edge Functions (Deno runtime):
- `send-spur` — sends Twilio SMS to each recipient. `verify_jwt = true`.
- `twilio-webhook` — receives inbound Twilio webhook replies (YES/NO). `verify_jwt = false` intentionally — Twilio cannot attach Supabase JWTs.

Edge function configs are declared in `supabase/config.toml` with their own `deno.json` import maps.

**Database tables**: `users`, `friendships`, `spurs`, `spur_recipients`, `spur_messages`. All have RLS enabled. Migrations in `supabase/migrations/`.

**Realtime**: `spur_recipients` and `spur_messages` tables are added to `supabase_realtime` publication. Use `supabase.channel()` in useEffect, and always clean up: `return () => supabase.removeChannel(channelRef.current)`.

## Key conventions

- JS/JSX only (no TypeScript in frontend). ESLint is configured for `.js`/`.jsx`; unused vars named with uppercase or `_` prefix are allowed.
- Edge Functions use TypeScript (`.ts`) with Deno runtime — use `jsr:@supabase/supabase-js@2` imports.
- Supabase client singleton at `src/lib/supabase.js`. Env vars prefixed `VITE_` for frontend.
- Store env vars in `.env` (gitignored). See `.env.example` for required keys.
- Tailwind CSS v4: import with `@import "tailwindcss"` in CSS (not v3 `@tailwind` directives).
- CSS custom properties in `src/index.css` define the design system (`--bg`, `--surface`, `--blue`, etc.).
- `NavBar` is hidden on `/`, `/auth`, and `/spur/:id` routes.

## Edge function secrets (set via CLI)

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
supabase secrets set TWILIO_ACCOUNT_SID=ACcfa0bb4614c3334046a387d94b7302d5
supabase secrets set TWILIO_AUTH_TOKEN=<token>
supabase secrets set TWILIO_MESSAGING_SERVICE_SID=MG112a9868dc2daa546c35a7588b3a17e9
supabase secrets set APP_BASE_URL=<deployed-domain>
```
