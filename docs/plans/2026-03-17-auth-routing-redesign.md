# Auth & Routing Redesign

**Date:** 2026-03-17
**Status:** Approved

## Problem

The current auth model uses three independent state values (`loading`, `session`, `user`) that produce 8 theoretical combinations, most of which have no explicit handler. Two critical failure modes:

1. **Stuck spinner** — `onAuthStateChange` triggers an async `public.users` DB fetch; if the fetch hangs (stale JWT, network timeout), `loading` never becomes `false` and the user sees "spur." forever.
2. **session-but-no-profile gap** — After a data wipe, a user has a valid Supabase auth session but no `public.users` row. The app routes them to `/auth`'s phone step instead of the name registration step.
3. **SMS deep links broken** — Tapping a spur link from an SMS drops the path on the floor during auth redirect.

## Design

### Auth State Enum

Replace `{ loading: bool, session, user }` with a single `authStatus` string exported from `AuthContext`:

| Value | Meaning | Route behavior |
|---|---|---|
| `'initializing'` | Supabase hasn't resolved its local session check yet | Spinner |
| `'unauthed'` | No session | `/auth?step=phone` |
| `'needs-profile'` | Session valid, no `public.users` row | `/auth?step=name` |
| `'ready'` | Session + profile confirmed | Render children |

`AuthContext` exports `{ authStatus, user, setUser }`.

### App.jsx — Two-phase auth

**Phase 1 (sync):** `onAuthStateChange` fires immediately from localStorage on mount. If no session → `'unauthed'`. If session exists → start Phase 2.

**Phase 2 (async, non-blocking):** Fetch the `public.users` profile row in the background.
- Success → `'ready'`
- PGRST116 (no row) → `'needs-profile'`
- Any other error OR 3-second timeout → sign out → `'unauthed'`

Phase 1 resolves synchronously so the UI is never blocked on a network call. The spinner only shows during the brief localStorage read, not a DB round-trip.

### RequireAuth

```
authStatus === 'initializing'   → spinner
authStatus === 'unauthed'       → Navigate /auth?step=phone[&from=<path>]
authStatus === 'needs-profile'  → Navigate /auth?step=name
authStatus === 'ready'          → render children
```

The `from` query param captures the original path so deep links are replayed after auth completes.

### Auth.jsx — Step routing

Reads `?step=` from the URL:
- `step=phone` (default) → phone entry form
- `step=name` → name registration form directly (skips OTP, session already exists)

On successful auth completion, reads `?from=` and navigates there instead of `/home`.

### Deep link flow

```
User taps SMS: /spur/abc123
RequireAuth   → authStatus='unauthed' → /auth?step=phone&from=/spur/abc123
Verify OTP    → authStatus='ready'
Auth.jsx      → navigate('/spur/abc123', { replace: true })
```

## Files Changed

| File | Change |
|---|---|
| `src/context/AuthContext.jsx` | Export `authStatus` enum instead of `loading`/`session`; update `RequireAuth` |
| `src/App.jsx` | Split `onAuthStateChange` into two phases; add 3s timeout on profile fetch |
| `src/views/Auth.jsx` | Read `?step=` and `?from=` query params; handle `step=name` entry point |
