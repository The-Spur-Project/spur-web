# +1 Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the sender of a spur toggle "+1 mode," after which any YES'd original recipient can invite up to 2 friends into the ephemeral group chat — with SMS notification, a history cutoff, and a real-time "X added Y" system message.

**Architecture:** Schema-first: one migration adds three columns and one RLS policy. The edge function gains a single-recipient mode. A new `PlusOneSheet` component handles friend picking and insertion. `SpurChat` wires the toggle, button, sheet, and history cutoff. `MessageBubble` gains a `type` prop for system events.

**Tech Stack:** React 19, Supabase JS SDK (`@supabase/supabase-js`), Tailwind CSS v4 (custom properties), lucide-react icons, Deno/TypeScript edge functions, Supabase Realtime (postgres_changes).

---

## File Map

| File | Role |
|---|---|
| `supabase/migrations/20240009_plus_one.sql` | Schema: 3 new columns + 1 new RLS INSERT policy |
| `src/index.css` | Add `slideUp` keyframe + `.animate-slideUp` class |
| `supabase/functions/send-spur/index.ts` | Optional `recipient_id` param for single-SMS mode |
| `src/components/MessageBubble.jsx` | Add `type` prop; render system messages centered + muted |
| `src/components/PlusOneSheet.jsx` | New: bottom sheet for picking and adding +1 friends |
| `src/views/SpurChat.jsx` | Sender toggle, UserPlus button, sheet mount, history cutoff, spurs Realtime listener |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20240009_plus_one.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20240009_plus_one.sql

-- Sender can enable +1 invites on a spur
alter table public.spurs
  add column plus_one_enabled boolean not null default false;

-- Track who added a +1 and when they actually joined
alter table public.spur_recipients
  add column invited_by_id uuid references public.users(id),
  add column joined_at timestamptz not null default now();

-- System messages (e.g. "Joel added Sam to the chat") vs regular chat messages
alter table public.spur_messages
  add column type text not null default 'text'
    check (type in ('text', 'system'));

-- Allow a YES'd original recipient to insert new +1 recipients.
-- This is a second INSERT policy on spur_recipients — Postgres OR's multiple
-- INSERT policies, so the existing sender-only policy is untouched.
create policy "spur_recipients_plus_one_insert"
on public.spur_recipients for insert to authenticated
with check (
  -- spur must have plus_one_enabled = true
  exists (
    select 1 from public.spurs
    where id = spur_id and plus_one_enabled = true
  )
  -- the current user must be a YES'd *original* recipient (invited_by_id is null)
  and exists (
    select 1 from public.spur_recipients existing
    where existing.spur_id = spur_recipients.spur_id
      and existing.recipient_id = (select id from public.users where auth_uid = auth.uid())
      and existing.status = 'yes'
      and existing.invited_by_id is null
  )
  -- they haven't already used both +1 slots
  and (
    select count(*) from public.spur_recipients used
    where used.spur_id = spur_recipients.spur_id
      and used.invited_by_id = (select id from public.users where auth_uid = auth.uid())
  ) < 2
);
```

- [ ] **Step 2: Apply the migration locally**

```bash
supabase db reset
```

Expected: migration runs without errors, local Studio shows `plus_one_enabled` on `spurs`, `invited_by_id`/`joined_at` on `spur_recipients`, `type` on `spur_messages`, and new policy in the RLS tab.

- [ ] **Step 3: Verify columns exist**

```bash
supabase db diff --local
```

Expected: no diff (schema matches migrations).

---

## Task 2: Add `slideUp` Animation

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Append `slideUp` keyframe after the existing `popOut` block at the bottom of `index.css`**

The file currently ends after the `.animate-popOut` block. Add:

```css
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.animate-slideUp {
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```

- [ ] **Step 2: Verify dev server picks it up**

```bash
npm run dev
```

Open browser DevTools → Console. No errors. The class `.animate-slideUp` is now available.

---

## Task 3: Edge Function — Single-Recipient SMS

**Files:**
- Modify: `supabase/functions/send-spur/index.ts`

- [ ] **Step 1: Replace the full file with the updated version**

The change: destructure optional `recipient_id` from the body; conditionally filter the Supabase query to that one row when provided.

```ts
/// <reference path="./deno.d.ts" />
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const { spur_id, recipient_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: spur } = await supabase
    .from('spurs')
    .select('*, sender:users!sender_id(name)')
    .eq('id', spur_id)
    .single()

  if (!spur) {
    return new Response(JSON.stringify({ error: 'Spur not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // When recipient_id is provided, SMS only that one spur_recipients row (for +1 adds).
  // Otherwise SMS all recipients — existing send-spur behavior unchanged.
  let recipientsQuery = supabase
    .from('spur_recipients')
    .select('recipient:users!recipient_id(phone, name)')
    .eq('spur_id', spur_id)

  if (recipient_id) {
    recipientsQuery = recipientsQuery.eq('id', recipient_id)
  }

  const { data: recipients } = await recipientsQuery

  const baseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://spur.app'
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
  const messagingSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')!

  let sent = 0
  const errors: string[] = []

  for (const row of (recipients ?? [])) {
    const recipient = row.recipient
    if (!recipient?.phone) {
      errors.push(`Skipped recipient with no phone`)
      continue
    }

    const body =
      `${spur.sender.name} fired a spur 🔥\n` +
      `"${spur.message ?? spur.note ?? ''}"\n` +
      `Jump in: ${baseUrl}/spur/${spur_id}`

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: recipient.phone,
          MessagingServiceSid: messagingSid,
          Body: body,
        }),
      }
    )

    if (res.ok) {
      sent++
    } else {
      const errText = await res.text()
      errors.push(`Failed to SMS ${recipient.name ?? recipient.phone}: ${res.status} ${errText}`)
    }
  }

  return new Response(JSON.stringify({ success: true, sent, errors }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Verify the function serves locally**

```bash
supabase functions serve send-spur
```

Expected: `Serving functions on http://localhost:54321/functions/v1/` with no TypeScript errors.

---

## Task 4: MessageBubble — System Message Type

**Files:**
- Modify: `src/components/MessageBubble.jsx`

- [ ] **Step 1: Replace the full file**

Add `type` prop (default `'text'`). When `type === 'system'`, render a centered muted line with no avatar, no bubble, no timestamp. All existing logic untouched for `type === 'text'`.

```jsx
import { format } from 'date-fns'
import { cn } from '../lib/cn'
import AvatarCircle from './AvatarCircle'

export default function MessageBubble({
  message,
  isOwn,
  senderName,
  showSender = true,
  showTime = true,
  userId,
  type = 'text',
}) {
  if (type === 'system') {
    return (
      <div className="animate-fadeUp my-2 text-center text-[11px] text-(--muted)">
        {message.content}
      </div>
    )
  }

  const timeStr = message.created_at
    ? format(new Date(message.created_at), 'h:mm a')
    : ''

  if (isOwn) {
    return (
      <div
        className={cn(
          'flex max-w-[78%] flex-col items-end self-end',
          showTime ? 'mb-2.5' : 'mb-[2px]',
        )}
      >
        <div className="max-w-full rounded-[18px_18px_4px_18px] bg-blue-bubble px-3.5 py-2.5 text-[15px] leading-[1.45] text-white shadow-blue-bubble wrap-break-word">
          {message.content}
        </div>
        {showTime && (
          <span className="mr-[3px] mt-[3px] text-[10px] text-(--muted)">
            {timeStr}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex max-w-[82%] items-end self-start gap-2',
        showTime ? 'mb-2.5' : 'mb-[2px]',
      )}
    >
      {showSender
        ? <AvatarCircle name={senderName ?? '?'} userId={userId ?? message.sender_id} size="sm" />
        : <div className="h-7 w-7 shrink-0" />
      }

      <div className="flex min-w-0 flex-1 flex-col items-start">
        {showSender && (
          <span className="mb-[3px] ml-[2px] text-[11px] font-medium text-(--muted)">
            {senderName}
          </span>
        )}
        <div className="max-w-full rounded-[18px_18px_18px_4px] border border-(--border) bg-(--surface-2) px-3.5 py-2.5 text-[15px] leading-[1.45] text-(--white) wrap-break-word">
          {message.content}
        </div>
        {showTime && (
          <span className="mt-[3px] ml-[2px] text-[10px] text-(--muted)">
            {timeStr}
          </span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open any spur chat. Messages render identically. No console errors.

---

## Task 5: PlusOneSheet Component

**Files:**
- Create: `src/components/PlusOneSheet.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useEffect, useState } from 'react'
import { X, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import AvatarCircle from './AvatarCircle'
import { cn } from '../lib/cn'

export default function PlusOneSheet({ spurId, spurRecipients, currentUser, onClose }) {
  const [friends, setFriends] = useState([])
  const [leaving, setLeaving] = useState(false)
  const [addedIds, setAddedIds] = useState(new Set())

  const existingIds = new Set(spurRecipients.map((r) => r.recipient_id))
  const myPlusOneCount = spurRecipients.filter(
    (r) => r.invited_by_id === currentUser.id
  ).length + addedIds.size

  useEffect(() => {
    async function loadFriends() {
      // Query proper friendships — not the simplified demo query used in Home/Friends
      const { data } = await supabase
        .from('friendships')
        .select(
          'user_id, friend_id, user:users!user_id(id,name), friend:users!friend_id(id,name)'
        )
        .eq('status', 'accepted')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)

      if (!data) return

      // Resolve to the other person in each pair, deduplicated
      const seen = new Set()
      const list = data
        .map((f) => (f.user_id === currentUser.id ? f.friend : f.user))
        .filter(Boolean)
        .filter((f) => {
          if (seen.has(f.id)) return false
          seen.add(f.id)
          return true
        })
        // Exclude anyone already in the spur
        .filter((f) => !existingIds.has(f.id))

      setFriends(list)
    }
    loadFriends()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, spurId])

  async function addPlusOne(friend) {
    if (myPlusOneCount >= 2) return

    // 1. Insert spur_recipients row
    const { data: newRow, error } = await supabase
      .from('spur_recipients')
      .insert({
        spur_id: spurId,
        recipient_id: friend.id,
        invited_by_id: currentUser.id,
        joined_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error || !newRow) return

    // 2. SMS the new +1 via edge function (single-recipient mode)
    await supabase.functions.invoke('send-spur', {
      body: { spur_id: spurId, recipient_id: newRow.id },
    })

    // 3. Insert system message visible to all participants
    await supabase.from('spur_messages').insert({
      spur_id: spurId,
      sender_id: currentUser.id,
      type: 'system',
      content: `${currentUser.name} added ${friend.name} to the chat`,
    })

    setAddedIds((prev) => new Set([...prev, friend.id]))

    // Auto-close after hitting the 2-add cap
    if (myPlusOneCount + 1 >= 2) {
      handleClose()
    }
  }

  function handleClose() {
    setLeaving(true)
    setTimeout(() => onClose(), 150)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-1/2 z-50 flex w-full max-w-[480px] -translate-x-1/2 flex-col rounded-t-2xl border-t border-(--border) bg-(--surface) pb-[env(safe-area-inset-bottom)]',
          leaving ? 'animate-popOut' : 'animate-slideUp',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-(--border)">
          <div>
            <p className="m-0 text-[15px] font-semibold text-(--white)">Add a +1</p>
            <p className="m-0 text-xs text-(--muted)">
              {2 - myPlusOneCount} slot{2 - myPlusOneCount === 1 ? '' : 's'} remaining
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex cursor-pointer border-none bg-transparent p-1 text-(--muted)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Friend list */}
        <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto px-3 py-2">
          {friends.length === 0 && (
            <p className="py-6 text-center text-sm text-(--muted)">
              No friends available to add
            </p>
          )}
          {friends.map((friend, index) => {
            const alreadyAdded = addedIds.has(friend.id)
            const disabled = myPlusOneCount >= 2 && !alreadyAdded
            return (
              <div
                key={friend.id}
                className="animate-fadeUp flex items-center gap-3 rounded-xl px-2 py-2.5"
                style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
              >
                <AvatarCircle name={friend.name} userId={friend.id} size="md" />
                <span className="flex-1 text-sm font-medium text-(--white)">
                  {friend.name}
                </span>
                <button
                  type="button"
                  disabled={disabled || alreadyAdded}
                  onClick={() => addPlusOne(friend)}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-[10px] border-none px-3.5 py-[9px] text-[13px] font-semibold transition-transform active:scale-[0.95]',
                    alreadyAdded
                      ? 'bg-(--green) text-white'
                      : disabled
                        ? 'cursor-not-allowed bg-(--surface-2) text-(--muted) opacity-50'
                        : 'bg-(--blue) text-white',
                  )}
                >
                  {alreadyAdded ? (
                    '✓ Added'
                  ) : (
                    <>
                      <UserPlus size={13} />
                      Add
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify the file exists and has no syntax errors**

```bash
npm run lint -- --max-warnings 0 src/components/PlusOneSheet.jsx
```

Expected: no errors (or only the intentional eslint-disable comment warning).

---

## Task 6: SpurChat — State, Derived Values, and Spurs Realtime Listener

**Files:**
- Modify: `src/views/SpurChat.jsx`

This task wires the reactive foundation. Tasks 7–9 add the visible UI on top of it.

- [ ] **Step 1: Add `plusOneSheetOpen` state**

Find the existing state declarations block (around line 49–59). Add one new line after `changingRsvp`:

```jsx
const [plusOneSheetOpen, setPlusOneSheetOpen] = useState(false)
```

- [ ] **Step 2: Add `spurs` Realtime listener inside `loadData`**

Find the `channelRef.current = supabase.channel(...)` block inside `loadData`. It currently has two `.on()` listeners (spur_messages INSERT and spur_recipients UPDATE). Add a **third** `.on()` for spurs UPDATE so `plus_one_enabled` flips live:

```jsx
channelRef.current = supabase
  .channel(`spur-${id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'spur_messages',
    filter: `spur_id=eq.${id}`,
  }, (payload) => {
    setMessages((prev) => [...prev, payload.new])
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    if (isMountedRef.current) {
      if (localIsSender) {
        supabase.from('spurs').update({ sender_unread_count: 0 }).eq('id', id)
      } else if (localMyRow) {
        supabase.from('spur_recipients').update({ unread_count: 0 }).eq('id', localMyRow.id)
      }
    }
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'spur_recipients',
    filter: `spur_id=eq.${id}`,
  }, () => {
    refreshRecipients()
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'spurs',
    filter: `id=eq.${id}`,
  }, (payload) => {
    setSpur((prev) => prev ? { ...prev, ...payload.new } : prev)
  })
  .subscribe()
```

- [ ] **Step 3: Add derived values for the +1 feature**

Find the existing derived values block (around line 168–179, where `isExpired`, `isSender`, `myRecipientRow`, etc. are computed). Add these **after** the existing derived values:

```jsx
const plusOneEnabled = spur?.plus_one_enabled ?? false
const isOriginalRecipient = myRecipientRow != null && myRecipientRow.invited_by_id == null
const myPlusOneCount = recipients.filter((r) => r.invited_by_id === user?.id).length
const canAddPlusOne = (
  plusOneEnabled &&
  isOriginalRecipient &&
  myRsvp === 'yes' &&
  !isExpired &&
  !isLocked &&
  myPlusOneCount < 2
)
```

- [ ] **Step 4: Add the import for PlusOneSheet at the top of the file**

Find the imports block and add:

```jsx
import PlusOneSheet from '../components/PlusOneSheet'
```

- [ ] **Step 5: Verify no console errors**

```bash
npm run dev
```

Open a spur chat. No JS errors in console. Chat loads normally.

---

## Task 7: SpurChat — Sender Toggle Pill

**Files:**
- Modify: `src/views/SpurChat.jsx`

- [ ] **Step 1: Add the toggle pill to the header**

Find the header section. It currently has the Archive/Delete button group inside `{isSender && !myArchived && (...)}`  and a separate Archive-only button for non-senders.

Replace the **entire sender controls block** (the `{isSender && !myArchived && (...)}` block) with:

```jsx
{isSender && !myArchived && (
  confirmingDelete ? (
    <div className="flex items-center gap-2">
      <span className="text-xs text-(--muted)">Delete?</span>
      <button
        type="button"
        onClick={handleDelete}
        className="cursor-pointer rounded-lg border-none bg-(--red) px-2.5 py-1 text-xs font-semibold text-white"
      >
        Delete
      </button>
      <button
        type="button"
        onClick={() => setConfirmingDelete(false)}
        className="cursor-pointer border-none bg-transparent p-0 text-xs text-(--muted)"
      >
        Cancel
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-1">
      {/* +1 toggle */}
      {!isExpired && (
        <button
          key={plusOneEnabled ? 'on' : 'off'}
          type="button"
          onClick={() =>
            supabase.from('spurs').update({ plus_one_enabled: !plusOneEnabled }).eq('id', id)
          }
          className={cn(
            'animate-pop cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
            plusOneEnabled
              ? 'border-(--blue) bg-(--blue) text-white'
              : 'border-(--border) bg-transparent text-(--muted)',
          )}
        >
          +1 {plusOneEnabled ? 'ON' : 'OFF'}
        </button>
      )}
      <button
        type="button"
        onClick={handleArchive}
        title="Archive"
        className="flex cursor-pointer border-none bg-transparent p-1 text-(--muted)"
      >
        <Archive size={18} />
      </button>
      <button
        type="button"
        onClick={() => setConfirmingDelete(true)}
        title="Delete"
        className="flex cursor-pointer border-none bg-transparent p-1 text-(--muted)"
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
)}
```

- [ ] **Step 2: Verify in browser**

Open a spur chat as the sender. The `+1 OFF` pill appears next to Archive/Delete. Tapping it visually toggles to `+1 ON` with a blue fill. Tapping again returns to `+1 OFF`.

---

## Task 8: SpurChat — UserPlus Button and PlusOneSheet Mount

**Files:**
- Modify: `src/views/SpurChat.jsx`

- [ ] **Step 1: Add `UserPlus` to the lucide-react import**

Find the import line:
```jsx
import { Archive, ArrowLeft, Send, Trash2 } from 'lucide-react'
```

Replace with:
```jsx
import { Archive, ArrowLeft, Send, Trash2, UserPlus } from 'lucide-react'
```

- [ ] **Step 2: Add the UserPlus button to the recipients strip header**

Find the recipients strip section. It currently starts with:
```jsx
{/* Recipients strip */}
<div className="border-b border-(--border) bg-(--surface) px-4 py-2.5">
  <div className="flex gap-3.5 overflow-x-auto">
```

Replace that opening with:
```jsx
{/* Recipients strip */}
<div className="border-b border-(--border) bg-(--surface) px-4 py-2.5">
  <div className="flex items-center justify-between mb-1.5">
    <span className="text-[11px] font-medium text-(--muted) uppercase tracking-[0.06em]">
      {recipients.length} {recipients.length === 1 ? 'person' : 'people'}
    </span>
    {canAddPlusOne && (
      <button
        key="userplus"
        type="button"
        onClick={() => setPlusOneSheetOpen(true)}
        className="animate-pop flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-xs font-medium text-(--blue-light)"
      >
        <UserPlus size={13} />
        Add +1
      </button>
    )}
  </div>
  <div className="flex gap-3.5 overflow-x-auto">
```

- [ ] **Step 3: Mount PlusOneSheet at the bottom of the return**

Find the closing `</div>` of the root `flex h-svh flex-1 flex-col` div. Just before it, add:

```jsx
      {plusOneSheetOpen && (
        <PlusOneSheet
          spurId={id}
          spurRecipients={recipients}
          currentUser={user}
          onClose={() => setPlusOneSheetOpen(false)}
        />
      )}
    </div>
  )
```

- [ ] **Step 4: Verify in browser**

1. Open a spur chat as the sender. Toggle `+1 ON`.
2. Open the same chat as a YES'd original recipient (different session/device or incognito).
3. The `Add +1` button appears in the recipients strip with `animate-pop`.
4. Tapping it opens `PlusOneSheet` sliding up from the bottom.
5. Tapping the backdrop or X closes it with `animate-popOut`.

---

## Task 9: SpurChat — Message History Cutoff

**Files:**
- Modify: `src/views/SpurChat.jsx`

- [ ] **Step 1: Derive `isGuest` and `visibleMessages`**

Find the `annotatedMessages` computation (around line 188). Just after it, add:

```jsx
const isGuest = myRecipientRow?.invited_by_id != null
const visibleMessages = isGuest
  ? annotatedMessages.filter((m) =>
      new Date(m.created_at) >= new Date(myRecipientRow.joined_at)
    )
  : annotatedMessages
```

- [ ] **Step 2: Update the message render loop to use `visibleMessages`**

Find the messages section:
```jsx
{annotatedMessages.map((m, index) => (
```

Replace with:
```jsx
{visibleMessages.map((m, index) => (
```

- [ ] **Step 3: Pass `type` to MessageBubble**

Inside the same map, find the `<MessageBubble ... />` call and add the `type` prop:

```jsx
<MessageBubble
  message={m}
  isOwn={m.sender_id === user.id}
  senderName={m.sender?.name ?? usersMap[m.sender_id]?.name ?? 'Someone'}
  showSender={m.showSender}
  showTime={m.showTime}
  userId={m.sender_id}
  type={m.type ?? 'text'}
/>
```

- [ ] **Step 4: Verify history cutoff in browser**

1. Open a spur chat. Send a few messages as original participants.
2. Have a +1 guest open the same chat (they must be added first via Task 8 flow).
3. The +1 guest sees only messages from after their `joined_at` timestamp.
4. The "X added Y to the chat" system message is the first thing they see — centered, muted, no bubble.
5. Original participants see the full history AND the system message in real time when the +1 joins.

---

## Task 10: Deploy Edge Function

**Files:**
- None (deploy only)

- [ ] **Step 1: Deploy the updated edge function**

```bash
supabase functions deploy send-spur
```

Expected: `Deployed Function send-spur` with no errors.

- [ ] **Step 2: Push migration to remote**

```bash
supabase db push
```

Expected: migration `20240009_plus_one.sql` applied to remote without errors.

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|---|---|
| `plus_one_enabled` column on `spurs` | Task 1 |
| `invited_by_id` + `joined_at` on `spur_recipients` | Task 1 |
| `type` column on `spur_messages` | Task 1 |
| RLS: original YES'd recipient insert, cap 2, plus_one_enabled gate | Task 1 |
| `slideUp` animation | Task 2 |
| Edge function single-recipient mode | Task 3 |
| MessageBubble system message render | Task 4 |
| PlusOneSheet: proper friendships query (not all-users) | Task 5 |
| PlusOneSheet: exclude existing spur members | Task 5 |
| PlusOneSheet: insert spur_recipients + SMS + system message | Task 5 |
| PlusOneSheet: staggered `animate-fadeUp` on friend rows | Task 5 |
| PlusOneSheet: `animate-popOut` on dismiss | Task 5 |
| SpurChat: `plusOneSheetOpen` state | Task 6 |
| SpurChat: spurs UPDATE Realtime listener | Task 6 |
| SpurChat: `canAddPlusOne` derived value | Task 6 |
| SpurChat: sender +1 toggle pill with `animate-pop` | Task 7 |
| SpurChat: `UserPlus` button with `animate-pop` | Task 8 |
| SpurChat: PlusOneSheet mount | Task 8 |
| SpurChat: `joined_at` history cutoff for guests | Task 9 |
| SpurChat: `type` prop forwarded to MessageBubble | Task 9 |
| Deploy edge function and migration | Task 10 |

All spec requirements covered. ✓

### Type / name consistency check

- `plusOneEnabled` derived in Task 6, read in Tasks 7 and 8 ✓
- `canAddPlusOne` derived in Task 6, read in Task 8 ✓
- `isGuest` derived in Task 9, used in same task ✓
- `visibleMessages` derived in Task 9, replaces `annotatedMessages` in render ✓
- `PlusOneSheet` props `{ spurId, spurRecipients, currentUser, onClose }` defined in Task 5, passed in Task 8 ✓
- `invited_by_id` column name consistent across Task 1 (SQL), Task 5 (JS insert), Task 6 (JS filter) ✓
- `joined_at` column name consistent across Task 1 (SQL), Task 5 (JS insert), Task 9 (JS filter) ✓
- `type = 'system'` string consistent across Task 1 (SQL check), Task 5 (JS insert), Task 4 (JSX prop check) ✓
