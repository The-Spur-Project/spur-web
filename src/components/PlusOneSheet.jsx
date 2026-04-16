import { useEffect, useState } from 'react'
import { X, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import AvatarCircle from './AvatarCircle'
import { cn } from '../lib/cn'

export default function PlusOneSheet({ spurId, spurRecipients, currentUser, isSender = false, onClose }) {
  const [friends, setFriends] = useState([])
  const [leaving, setLeaving] = useState(false)
  const [addedIds, setAddedIds] = useState(new Set())

  const existingIds = new Set(spurRecipients.map((r) => r.recipient_id))
  const myPlusOneCount = spurRecipients.filter(
    (r) => r.invited_by_id === currentUser.id
  ).length + addedIds.size
  const maxInvites = isSender ? Infinity : 2
  const slotsLeft = isSender ? null : Math.max(0, 2 - myPlusOneCount)

  useEffect(() => {
    async function loadFriends() {
      const { data } = await supabase
        .from('friendships')
        .select(
          'user_id, friend_id, user:users!user_id(id,name), friend:users!friend_id(id,name)'
        )
        .eq('status', 'accepted')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)

      if (!data) return

      const seen = new Set()
      const list = data
        .map((f) => (f.user_id === currentUser.id ? f.friend : f.user))
        .filter(Boolean)
        .filter((f) => {
          if (seen.has(f.id)) return false
          seen.add(f.id)
          return true
        })
        .filter((f) => !existingIds.has(f.id))

      setFriends(list)
    }
    loadFriends()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, spurId])

  async function addPlusOne(friend) {
    if (myPlusOneCount >= maxInvites) return

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

    await supabase.functions.invoke('send-spur', {
      body: { spur_id: spurId, recipient_id: newRow.id },
    })

    await supabase.from('spur_messages').insert({
      spur_id: spurId,
      sender_id: currentUser.id,
      type: 'system',
      content: `${currentUser.name} added ${friend.name} to the chat`,
    })

    const next = new Set([...addedIds, friend.id])
    setAddedIds(next)

    if (!isSender && myPlusOneCount + 1 >= 2) {
      handleClose()
    }
  }

  function handleClose() {
    setLeaving(true)
    setTimeout(() => onClose(), 150)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={handleClose}
      />
      <div
        className={cn(
          'fixed bottom-0 left-1/2 z-50 flex w-full max-w-[480px] -translate-x-1/2 flex-col rounded-t-2xl border-t border-(--border) bg-(--surface) pb-[env(safe-area-inset-bottom)]',
          leaving ? 'animate-popOut' : 'animate-slideUp',
        )}
      >
        <div className="flex items-center justify-between border-b border-(--border) px-4 py-3.5">
          <div>
            <p className="m-0 text-[15px] font-semibold text-(--white)">Invite someone</p>
            {slotsLeft !== null && (
              <p className="m-0 text-xs text-(--muted)">
                {slotsLeft} slot{slotsLeft === 1 ? '' : 's'} remaining
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex cursor-pointer border-none bg-transparent p-1 text-(--muted)"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto px-3 py-2">
          {friends.length === 0 && (
            <p className="py-6 text-center text-sm text-(--muted)">
              No friends available to add
            </p>
          )}
          {friends.map((friend, index) => {
            const alreadyAdded = addedIds.has(friend.id)
            const disabled = myPlusOneCount >= maxInvites && !alreadyAdded
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
