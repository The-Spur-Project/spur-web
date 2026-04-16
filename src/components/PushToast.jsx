import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function PushToast() {
  const { authStatus, user } = useAuth()
  // toast shape: { message, icon, label, actions? }
  // actions: [{ label, onClick }]
  const [toast, setToast] = useState(null)
  const channelRef = useRef(null)
  const spurChannelRef = useRef(null)
  const friendReqChannelRef = useRef(null)
  const timerRef = useRef(null)

  function showToast(message, { icon = '📣', label = 'spur broadcast', actions } = {}) {
    clearTimeout(timerRef.current)
    setToast({ message, icon, label, actions: actions ?? null })
    // Only auto-dismiss if there are no action buttons
    if (!actions?.length) {
      timerRef.current = setTimeout(() => setToast(null), 4000)
    }
  }

  function dismiss() {
    clearTimeout(timerRef.current)
    setToast(null)
  }

  useEffect(() => {
    if (authStatus !== 'ready') return

    channelRef.current = supabase
      .channel('global-push')
      .on('broadcast', { event: 'push' }, ({ payload }) => {
        showToast(payload.message)
      })
      .subscribe()

    return () => {
      clearTimeout(timerRef.current)
      supabase.removeChannel(channelRef.current)
    }
  }, [authStatus])

  useEffect(() => {
    if (!user) return

    spurChannelRef.current = supabase
      .channel('spur-toasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spur_recipients' },
        async (payload) => {
          if (payload.new.recipient_id !== user.id) return
          const { data: spur } = await supabase
            .from('spurs')
            .select('message, sender:users!sender_id(name)')
            .eq('id', payload.new.spur_id)
            .single()
          if (spur) showToast(`${spur.sender.name} fired a spur: "${spur.message}"`)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(spurChannelRef.current)
  }, [user])

  useEffect(() => {
    if (!user) return

    friendReqChannelRef.current = supabase
      .channel('friend-request-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships',
          filter: `friend_id=eq.${user.id}`,
        },
        async (payload) => {
          const { new: row } = payload
          // Only notify for pending requests (not accepted inserts from upsert)
          if (row.status !== 'pending') return

          const { data: sender } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', row.user_id)
            .single()

          if (!sender) return

          const senderId = sender.id
          showToast(`${sender.name} wants to be friends`, {
            icon: '👋',
            label: 'friend request',
            actions: [
              {
                label: 'Accept',
                onClick: async () => {
                  dismiss()
                  await supabase
                    .from('friendships')
                    .update({ status: 'accepted' })
                    .eq('user_id', senderId)
                    .eq('friend_id', user.id)
                  await supabase.from('friendships').upsert(
                    { user_id: user.id, friend_id: senderId, status: 'accepted', requester_id: senderId },
                    { onConflict: 'user_id,friend_id' }
                  )
                },
              },
              {
                label: 'Ignore',
                onClick: async () => {
                  dismiss()
                  await supabase
                    .from('friendships')
                    .delete()
                    .eq('user_id', senderId)
                    .eq('friend_id', user.id)
                },
              },
            ],
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(friendReqChannelRef.current)
  }, [user])

  if (!toast) return null

  return (
    <>
      <div
        onClick={toast.actions?.length ? undefined : dismiss}
        className={`fixed left-1/2 top-0 z-999 w-full max-w-[480px] -translate-x-1/2 animate-slideDown${toast.actions?.length ? '' : ' cursor-pointer'}`}
      >
        <div className="mt-3 ml-4 mr-4 flex items-start gap-3 rounded-[14px] border border-(--border) bg-(--surface) px-4 py-[14px] shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <span className="text-[20px]">{toast.icon}</span>
          <div className="flex-1">
            <p className="mb-[2px] text-[12px] font-semibold text-(--muted)">{toast.label}</p>
            <p className="m-0 text-[14px] leading-[1.4] text-(--white)">{toast.message}</p>
            {toast.actions?.length > 0 && (
              <div className="mt-[10px] flex gap-2">
                {toast.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); action.onClick() }}
                    className={`cursor-pointer rounded-[8px] border-none px-3 py-[6px] text-[12px] font-semibold transition-transform active:scale-[0.95] ${
                      action.label === 'Accept'
                        ? 'bg-(--green) text-white'
                        : 'border border-(--border) bg-transparent text-(--muted)'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span
            className="cursor-pointer pt-px text-[16px] text-(--muted)"
            onClick={(e) => { e.stopPropagation(); dismiss() }}
          >
            ×
          </span>
        </div>
      </div>
    </>
  )
}
