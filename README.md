# spur

**Spontaneous plans, not scheduled ones.**

Spur is a mobile-first social app that makes it effortless to do things with people you actually want to see. Instead of coordinating over texts and calendar invites, you fire a spur — a quick message to your friends — and they reply YES or NO by text, right from their lock screen. No app required to respond.

---

## The pitch

Most friend groups have a coordination problem: someone wants to hang, nobody wants to be the one to send the awkward "is anyone free?" text, and the moment passes. Spur removes that friction.

You open the app, pick your friends, type a plan (or don't), and hit send. Your friends get an SMS. They reply YES or NO from their phone. You see the results live. You're not scheduling — you're spurring.

**The target user**: people aged 18–28 who have a friend group but struggle to actually make plans happen. The people who say "we should do this" and then don't.

---

## What it does

- **Spurs** — short, spontaneous invites sent over SMS to your friends. Each spur has a message, a sender, and a group of recipients.
- **YES / NO replies** — recipients respond by text. No app install required to RSVP. Twilio handles the SMS layer.
- **Live chat** — once a spur is sent, there's a live group chat inside the app where everyone can coordinate.
- **Friends** — a friends list with pending requests and an "Active now" view showing who's online.
- **History** — a log of all past spurs you've sent or received.
- **Archive / Leave** — recipients can leave a spur chat; senders can archive old spurs.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite v8 (ESM) |
| Styling | Tailwind CSS v4 via PostCSS |
| Routing | react-router-dom v6 |
| Backend | Supabase (Postgres + Auth + Realtime + Edge Functions) |
| SMS | Twilio (outbound via Messaging Service, inbound via webhook) |
| Edge Functions | Deno runtime (TypeScript) |

---

## Project structure

```
spur-web/
├── src/
│   ├── App.jsx                  # AuthContext, routing, RequireAuth guard
│   ├── index.css                # Design tokens (CSS vars), Tailwind utilities
│   ├── lib/
│   │   ├── supabase.js          # Singleton Supabase client
│   │   └── cn.js                # twMerge + clsx utility
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── components/
│   │   ├── AvatarCircle.jsx     # Color-hashed avatar initials
│   │   ├── FriendChip.jsx       # Tappable avatar chip for friend picker
│   │   ├── FriendRow.jsx        # Friend list row (accept / ignore)
│   │   ├── MessageBubble.jsx    # Chat message (own vs. others)
│   │   ├── NavBar.jsx           # Bottom nav (Home / Friends / History + theme toggle)
│   │   ├── PushToast.jsx        # Slide-in toast for incoming spurs
│   │   ├── SpurCard.jsx         # Spur preview card on Home + History
│   │   └── TypePill.jsx         # Spur type badge (hangout / food / etc.)
│   └── views/
│       ├── PasswordGate.jsx     # Beta password gate (localStorage)
│       ├── Auth.jsx             # Phone OTP auth + name registration
│       ├── Home.jsx             # Send a spur + incoming spur feed
│       ├── SpurChat.jsx         # Live group chat for a spur
│       ├── Friends.jsx          # Friends list, pending requests, active now
│       └── History.jsx          # Archive of past spurs
├── supabase/
│   ├── migrations/              # SQL migrations (applied in order)
│   └── functions/
│       ├── send-spur/           # Edge function: sends SMS to recipients via Twilio
│       └── twilio-webhook/      # Edge function: handles inbound SMS replies
└── CLAUDE.md                    # Instructions for Claude Code
```

---

## Database schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Internal PK |
| `auth_uid` | uuid | Links to `auth.users` |
| `name` | text | Display name |
| `phone` | text | Unique, E.164 format |
| `created_at` | timestamptz | |

### `friendships`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `user_id` | uuid | Requester |
| `friend_id` | uuid | Recipient of request |
| `status` | text | `pending` or `accepted` |

### `spurs`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `sender_id` | uuid | |
| `type` | text | `hangout`, `food`, `store_run`, `library` |
| `message` | text | Free-text spur message |
| `last_message` | text | Denormalized for card preview |
| `last_message_at` | timestamptz | |
| `sender_unread_count` | int | Unread badge for sender |
| `archived` | bool | Sender-side archive |

### `spur_recipients`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `spur_id` | uuid | |
| `recipient_id` | uuid | |
| `status` | text | `pending`, `seen`, `yes`, `no`, `left` |
| `unread_count` | int | Per-recipient unread badge |
| `archived` | bool | Recipient-side archive |

### `spur_messages`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `spur_id` | uuid | |
| `sender_id` | uuid | |
| `content` | text | |
| `created_at` | timestamptz | |

All tables have RLS enabled. Migrations are in `supabase/migrations/`.

---

## Supabase setup

### Remote project
Project ref: `zdvyvfzveabcwlfhntzi`

### Realtime publications
The following tables broadcast changes via Supabase Realtime:
- `spur_messages` — live chat
- `spur_recipients` — RSVP status updates + incoming spur toasts
- `spurs` — last message preview updates on Home
- `friendships` — live friend request notifications

### Auth
Supabase phone auth (OTP via SMS). Users verify their phone number to sign up. A `public.users` profile row is created on first sign-in via the app.

---

## Edge functions

### `send-spur` (`verify_jwt = true`)
Called from the frontend when a spur is sent. Receives `{ spurId }`, fetches recipients with phone numbers, sends an SMS via Twilio Messaging Service with a YES/NO reply link.

### `twilio-webhook` (`verify_jwt = false`)
Twilio cannot attach JWTs — intentionally unauthenticated. Receives inbound SMS replies, parses YES/NO, and updates `spur_recipients.status` accordingly.

### Secrets (set via CLI)
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
supabase secrets set TWILIO_ACCOUNT_SID=ACcfa0bb4614c3334046a387d94b7302d5
supabase secrets set TWILIO_AUTH_TOKEN=<token>
supabase secrets set TWILIO_MESSAGING_SERVICE_SID=MG112a9868dc2daa546c35a7588b3a17e9
supabase secrets set APP_BASE_URL=<deployed-domain>
```

---

## Local development

### Prerequisites
- Node.js 20+
- Supabase CLI
- A Twilio account (for SMS testing)

### Frontend
```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
```

### Local Supabase stack
```bash
supabase start         # API: http://127.0.0.1:54321  Studio: http://127.0.0.1:54323
supabase db reset      # Apply all migrations + seeds
```

### Required env vars (`.env`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Design system

All colors are defined as CSS custom properties in `src/index.css`. No hex values live in component files.

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#08090A` | Page background |
| `--surface` | `#111318` | Cards, nav |
| `--surface-2` | `#1C2030` | Inputs, secondary cards |
| `--blue` | `#3B6FE8` | Primary action |
| `--blue-mid` | `#4B7FF0` | Gradient midpoint |
| `--blue-light` | `#7BAAF7` | Active nav, links |
| `--green` | `#22c55e` | Yes / online / accept |
| `--red` | `#ef4444` | No / decline / logout |
| `--muted` | `#5B6380` | Secondary text |
| `--border` | `#2A2F45` | Default border |

Light theme is toggled via `data-theme="light"` on `document.documentElement` (NavBar theme toggle).

---

## Beta access

The app is gated by a password (`PasswordGate.jsx`). Once entered, access is stored in `localStorage` under `spur_authed`. This is a simple beta gate — not a security mechanism.
