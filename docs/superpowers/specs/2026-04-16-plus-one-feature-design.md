# +1 Feature — Design Spec
**Date:** 2026-04-16
**Scope:** Allow the sender of a spur to enable a "+1" mode, letting original YES'd recipients each invite up to 2 of their own friends into the ephemeral group chat — with SMS notification, a scoped history view, and a system message divider.

---

## Decision Log

| Question | Decision |
|---|---|
| Who enables +1? | Sender toggles it on the spur; any YES'd original recipient can then use it |
| Cap | 2 friends per inviting person (not a shared pool) |
| Can +1 guests invite? | No — only original recipients can invite |
| SMS notification | Yes — same `send-spur` edge function, single-recipient mode |
| History for +1 guests | Only messages from `joined_at` onward; "X added you" system message as entry point |

---

## 1. Data Model

### `spurs` — 1 new column
```sql
plus_one_enabled  boolean  not null  default false
```
Sender flips this. Checked in RLS and client-side to gate the UI.

### `spur_recipients` — 2 new columns
```sql
invited_by_id  uuid  references public.users(id)  -- null for original recipients
joined_at      timestamptz  not null  default now()
```
- `invited_by_id IS NULL` → original recipient
- `invited_by_id = <user_id>` → added as a +1 by that person
- Cap enforcement: `count(*) where spur_id = X and invited_by_id = current_user_id < 2`
- History cutoff: filter messages where `created_at >= myRecipientRow.joined_at`

### `spur_messages` — 1 new column
```sql
type  text  not null  default 'text'
  check (type in ('text', 'system'))
```
System messages use the inviter's `sender_id` and `content` like `"Joel added Sam to the chat"`. Rendered centered and muted — no avatar, no bubble, no timestamp.

---

## 2. Migration (`supabase/migrations/20240009_plus_one.sql`)

```sql
alter table public.spurs
  add column plus_one_enabled boolean not null default false;

alter table public.spur_recipients
  add column invited_by_id uuid references public.users(id),
  add column joined_at timestamptz not null default now();

alter table public.spur_messages
  add column type text not null default 'text'
    check (type in ('text', 'system'));
```

---

## 3. RLS Policy

Enforced at the DB layer — not just frontend:

```sql
create policy "recipients can add plus ones"
on public.spur_recipients for insert
with check (
  -- spur must have plus_one_enabled
  exists (
    select 1 from public.spurs
    where id = spur_id and plus_one_enabled = true
  )
  -- inviter must be an original YES'd recipient
  and exists (
    select 1 from public.spur_recipients existing
    where existing.spur_id = spur_recipients.spur_id
      and existing.recipient_id = auth.uid()
      and existing.status = 'yes'
      and existing.invited_by_id is null
  )
  -- inviter hasn't already used both +1 slots
  and (
    select count(*) from public.spur_recipients used
    where used.spur_id = spur_recipients.spur_id
      and used.invited_by_id = auth.uid()
  ) < 2
);
```

---

## 4. Edge Function (`supabase/functions/send-spur/index.ts`)

Add optional `recipient_id` param. Existing behavior (SMS all) is the default:

```ts
// If recipient_id provided, SMS only that one person (for +1 adds)
// Otherwise SMS all recipients (original send flow — unchanged)
const targets = body.recipient_id
  ? recipients.filter(r => r.id === body.recipient_id)
  : recipients
```

Backward compatible — no breaking change to the original send flow.

---

## 5. New Component: `PlusOneSheet.jsx`

Bottom sheet that slides up over SpurChat. Self-contained — owns its own data fetching and insertion.

**Props:** `{ spurId, spurRecipients, currentUser, onClose }`

**Internal flow:**
1. On mount, query `friendships` where `(user_id = me OR friend_id = me) AND status = 'accepted'` — **not** the simplified `users` query used in Home/Friends for the demo. This is the only place that enforces friends-only.
2. Filter out anyone already in `spurRecipients` (by `recipient_id`).
3. Derive `myPlusOneCount = spurRecipients.filter(r => r.invited_by_id === currentUser.id).length`.
4. Render friend list with staggered `animate-fadeUp` (`animationDelay: index * 40ms`, capped at 5).
5. Each row has a `+` button, disabled when `myPlusOneCount >= 2`.
6. **On add:**
   - Insert `spur_recipients` row: `{ spur_id, recipient_id, invited_by_id: me, joined_at: now() }`
   - Invoke `send-spur` with `{ spur_id, recipient_id: newRow.id }` for single SMS
   - Insert system message: `{ spur_id, sender_id: me, type: 'system', content: "${myName} added ${friendName} to the chat" }`
7. Sheet calls `onClose` after 2 adds or manual dismiss.
8. Exit animation: `animate-popOut` applied for 150ms before unmount.

**Friend picker query (important):**
```js
const { data } = await supabase
  .from('friendships')
  .select('user_id, friend_id, user:users!user_id(id,name), friend:users!friend_id(id,name)')
  .eq('status', 'accepted')
  .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
// Then resolve to the other person in each pair
```

---

## 6. SpurChat Changes

### New state
```js
const [plusOneSheetOpen, setPlusOneSheetOpen] = useState(false)
```

### New derived values
```js
const plusOneEnabled = spur?.plus_one_enabled ?? false
const isOriginalRecipient = myRecipientRow && myRecipientRow.invited_by_id === null
const myPlusOneCount = recipients.filter(r => r.invited_by_id === user.id).length
const canAddPlusOne = plusOneEnabled && isOriginalRecipient && myRsvp === 'yes'
  && !isExpired && !isLocked && myPlusOneCount < 2
```

### Realtime: subscribe to `spurs` UPDATE
Add a third `.on()` listener for `UPDATE` on `spurs` filtered by `id=eq.${id}` to catch `plus_one_enabled` flipping live. Update `spur` state on receipt.

### Message history cutoff for +1 guests
```js
const isGuest = myRecipientRow?.invited_by_id !== null
const visibleMessages = isGuest
  ? annotatedMessages.filter(m =>
      new Date(m.created_at) >= new Date(myRecipientRow.joined_at)
    )
  : annotatedMessages
```
System messages (`type = 'system'`) are always visible once past the cutoff.

### Sender toggle (in header)
When `isSender && !isExpired && !myArchived`, render a toggle pill alongside the existing Archive/Delete buttons:
```
[+1 OFF] → tap → [+1 ON]
```
- Tap calls `supabase.from('spurs').update({ plus_one_enabled: !plusOneEnabled }).eq('id', id)`
- `animate-pop` on the pill when it turns ON (via `key` flip)
- Disabling does not eject already-added guests

### UserPlus button (in recipients strip)
When `canAddPlusOne`, render a `UserPlus` icon (lucide-react) right-aligned in the strip header row. Apply `animate-pop` on mount. Tapping sets `plusOneSheetOpen(true)`.

### Mounting PlusOneSheet
```jsx
{plusOneSheetOpen && (
  <PlusOneSheet
    spurId={id}
    spurRecipients={recipients}
    currentUser={user}
    onClose={() => setPlusOneSheetOpen(false)}
  />
)}
```

---

## 7. MessageBubble Changes

Add `type` prop (default `'text'`). When `type === 'system'`:
- Render as centered, muted, small text row (no avatar, no bubble, no timestamp)
- Apply `animate-fadeUp` with no delay (`animationDelay: 0`) — system events feel immediate, not part of staggered history load
- Example render:
  ```jsx
  if (type === 'system') return (
    <div className="animate-fadeUp my-2 text-center text-[11px] text-(--muted)">
      {message.content}
    </div>
  )
  ```

Regular messages pass through unchanged.

---

## 8. Animation Plan

All required classes already exist from the `feat(ui): polish spur flow` commit **except `slideUp`**.

| Element | Animation | Source |
|---|---|---|
| `PlusOneSheet` mount | `animate-slideUp` | **New — add to `index.css`** |
| `PlusOneSheet` dismiss | `animate-popOut` (150ms) then unmount | Already in CSS |
| Friend rows in picker | `animate-fadeUp`, staggered `index * 40ms` | Already in CSS |
| +1 toggle pill turning ON | `animate-pop` via key flip | Already in CSS |
| `UserPlus` button appearing | `animate-pop` on mount | Already in CSS |
| New recipient avatar in strip | `animate-pop` (keyed by `r.id`, new entries mount fresh) | Already in CSS |
| System message arrival | `animate-fadeUp`, delay 0 | Already in CSS |

### `slideUp` keyframe to add to `index.css`
```css
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.animate-slideUp {
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```
Uses an iOS-style spring easing that feels native on mobile — matching the physical weight of a bottom sheet.

---

## 9. File Change Summary

| File | Change |
|---|---|
| `supabase/migrations/20240009_plus_one.sql` | New migration |
| `supabase/functions/send-spur/index.ts` | Add optional `recipient_id` param |
| `src/index.css` | Add `slideUp` keyframe + `.animate-slideUp` |
| `src/components/PlusOneSheet.jsx` | New component |
| `src/components/MessageBubble.jsx` | Add `type` prop, system message render |
| `src/views/SpurChat.jsx` | Toggle, UserPlus button, sheet mount, history cutoff, spurs Realtime listener |

---

## 10. Success Criteria

- Sender can toggle +1 on/off; toggle state propagates live to all chat participants via Realtime
- YES'd original recipients see the `UserPlus` button appear in real time when sender enables +1
- Friend picker only shows accepted friends not already in the spur
- Each inviting user can add at most 2 friends; the button disables after 2
- +1 guests added as new `spur_recipients` rows receive an SMS
- +1 guests see only messages from `joined_at` onward; history before that is invisible
- "X added Y to the chat" system message appears for all participants in real time
- System message renders without avatar, bubble, or timestamp — centered and muted
- `PlusOneSheet` slides up and exits with `animate-popOut`
- No extra Realtime channels needed — existing `spur-${id}` channel handles all new events
- RLS enforces the 2-per-inviter cap and original-recipient-only rule at DB layer
- +1 guests cannot themselves open the `UserPlus` button (`invited_by_id !== null` check)
