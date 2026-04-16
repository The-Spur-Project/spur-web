# Spur Flow Polish — Design Spec
**Date:** 2026-04-16  
**Scope:** Full user flow from Home → Send Spur → SpurChat, including animations, loading states, and Supabase data integrity audit.  
**Approach:** Pure CSS keyframes (no new dependencies). Extends the existing `animate-pop` / `animate-shake` pattern already in `index.css`.

---

## 1. Animations & Keyframes (`src/index.css`)

Add five new keyframes to the existing keyframes block:

| Keyframe | Behavior | Usage |
|---|---|---|
| `fadeUp` | opacity 0→1, translateY 12px→0, 0.25s ease-out | All view entry, message entrance |
| `slideInRight` | translateX 24px→0 + opacity 0→1, 0.28s ease-out | SpurChat page entry |
| `shimmer` | looping gradient sweep left→right, 1.4s infinite | Skeleton loading blocks |
| `scaleIn` | scale 0.92→1 + opacity 0→1, 0.22s ease-out | SpurCard feed entrance |
| `popOut` | scale 1→0 + opacity 1→0, 0.15s ease-in | FriendChip checkmark deselect |

Utility classes to add: `.animate-fadeUp`, `.animate-slideInRight`, `.animate-shimmer`, `.animate-scaleIn`, `.animate-popOut`, `.skeleton` (shimmer block helper).

---

## 2. Home View (`src/views/Home.jsx`)

### 2a. View entry
- Outer `div` receives `animate-fadeUp` class on mount.

### 2b. FriendChip selection feel
- On select: checkmark badge already has `animate-pop` — no change.
- On deselect: conditionally render the checkmark with `animate-popOut` for one frame before unmounting. Implement via a `leaving` state in `FriendChip` — set `leaving=true` on click-to-deselect, wait 150ms (matches `popOut` duration), then call `onToggle`.
- The blue ring around the avatar already uses `transition-colors duration-150` — keep as-is.

### 2c. Send flow
- Current: 800ms timeout → hard `navigate()`.
- New: button enters `✓ Sent!` state at `setSendSuccess(true)`, after 600ms the card fades with `opacity-0 transition-opacity duration-200`, then `navigate()` fires at 800ms. Net effect: intentional exit instead of jarring cut.

---

## 3. SpurChat View (`src/views/SpurChat.jsx`)

### 3a. Page entry animation
- The root `div` receives `animate-slideInRight` — gives physical sense of entering a chat.

### 3b. Loading skeleton
- Replace the bare `animate-spin` spinner with three skeleton message bubbles:
  - Two "received" (left-aligned, ~60% width, ~40% width stacked)
  - One "sent" (right-aligned, ~45% width)
  - Each is a `div` with `.skeleton` shimmer class, rounded-2xl, appropriate height.

### 3c. Message entrance
- All messages on initial load get `animate-fadeUp` with staggered `animation-delay`:
  - `Math.min(index, 5) * 50ms` — capped at 250ms so old messages don't delay visibly.
- Realtime-injected messages (appended via `setMessages(prev => [...prev, payload.new])`) get `animate-fadeUp` with no stagger (delay 0ms) — they just slide up naturally.
- Implement by passing `isNew` prop to `MessageBubble` and an `index` prop for stagger.

### 3d. RSVP bar entrance
- The YES/NO button bar uses `animate-slideDown` (already defined in CSS) — no new keyframe needed.
- The "You said YES/NO" confirmation text gets `animate-pop` on appear.

---

## 4. SpurCard Feed (`src/components/SpurCard.jsx`, `src/views/Home.jsx`)

- Each SpurCard in the feed receives `animate-scaleIn` with `animation-delay: ${Math.min(index, 5) * 40}ms` via inline style.
- Pass `index` prop from `Home.jsx` when mapping spurs.
- The unread blue accent bar on the left gets `animate-pulse-dot` (already defined) — draws the eye to unread cards.
- Realtime-inserted cards animate in individually (index=0, no stagger delay).

---

## 5. Supabase Data Integrity Audit

### 5a. `sendSpur()` in `Home.jsx`
**Issue:** Edge function failure is silently swallowed — `send-spur` invoke has no error handling.  
**Fix:** Capture `invoke` error, surface a toast or inline error message if it fails. The spur row still exists even if SMS fails — that's acceptable, but the user should know.

### 5b. `loadData()` — `status → seen` update
**Status:** Correctly implemented. `updates.status = 'seen'` is already gated on `localMyRow.status === 'pending'`, so YES/NO RSVPs are never overwritten on re-open. No change needed.

### 5c. `unread_count` reset race condition
**Issue:** Both sender and recipient zero out their unread count in `loadData()`, but the realtime `INSERT` handler also zeros it — two concurrent writes to the same row.  
**Fix:** The realtime handler should only zero `unread_count` when the chat is currently open (mount flag). Add a `mountedRef = useRef(true)` and only call the unread reset in the realtime handler if `mountedRef.current`.

### 5d. Realtime channel accumulation
**Issue:** `channelRef.current` is assigned inside `loadData()` which is called inside `useEffect([id, user, loadData])`. If `loadData` identity changes (e.g. due to `refreshRecipients` re-creation), the effect re-runs but the old channel is never removed before the new one is created.  
**Fix:** At the top of `loadData()`, add: `if (channelRef.current) supabase.removeChannel(channelRef.current)` before creating the new channel.

### 5e. `fetchSpurs()` deduplication logic
**Issue:** The sent+received merge is correct, but the 3-hour expiry filter uses `Date.now()` at call time — if the page stays open past expiry, stale spurs linger until the next realtime event triggers a re-fetch.  
**Fix:** The existing `setNow` interval in SpurChat is only there — add a similar 60s interval in Home that calls `fetchSpurs()` to keep the active list pruned.

### 5f. `RequireAuth` is a no-op
**Issue:** `RequireAuth` in `AuthContext.jsx` currently just returns `children` with no auth check. Routes like `/home` and `/spur/:id` are fully unprotected.  
**Fix:** Implement the guard — if `authStatus === 'initializing'` show a full-screen spinner; if `authStatus === 'unauthed'` or `'needs-profile'` redirect to `/auth`; otherwise render children. Wrap the protected routes in `App.jsx` with `<RequireAuth>`.

---

## File Change Summary

| File | Changes |
|---|---|
| `src/index.css` | 5 new keyframes + utility classes |
| `src/views/Home.jsx` | fadeUp entry, send flow exit, 60s re-fetch interval |
| `src/views/SpurChat.jsx` | slideInRight entry, skeleton loader, message stagger, RSVP slideDown, channel cleanup fix, seen-status bug fix, unread race fix |
| `src/components/FriendChip.jsx` | popOut on deselect, leaving state |
| `src/components/SpurCard.jsx` | scaleIn with index prop, pulse-dot on unread bar |
| `src/context/AuthContext.jsx` | Implement RequireAuth guard |
| `src/App.jsx` | Wrap protected routes with RequireAuth |

---

## Success Criteria

- Zero abrupt cuts in the Home → send → SpurChat flow
- SpurChat shows skeleton while loading, not a blank spinner
- FriendChip select/deselect both have matching animation arcs
- SpurCards entrance is staggered and smooth
- RSVP buttons slide in, confirmation pops in
- Reopening SpurChat never overwrites an existing YES/NO status
- Realtime channel never accumulates duplicate listeners
- Unauthenticated users are redirected to /auth instead of seeing broken views
