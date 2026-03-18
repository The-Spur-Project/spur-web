import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function PushToast() {
  const { authStatus, user } = useAuth()
  const [toast, setToast] = useState(null)
  const channelRef = useRef(null)
  const spurChannelRef = useRef(null)
  const timerRef = useRef(null)

  function showToast(message) {
    setToast(message)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(null), 4000)
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

  if (!toast) return null

  return (
    <>
      <div
        onClick={() => setToast(null)}
        className="fixed left-1/2 top-0 z-999 w-full max-w-[480px] -translate-x-1/2 cursor-pointer animate-slideDown"
      >
        <div className="mt-3 ml-4 mr-4 flex items-start gap-3 rounded-[14px] border border-(--border) bg-(--surface) px-4 py-[14px] shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <span className="text-[20px]">📣</span>
          <div className="flex-1">
            <p className="mb-[2px] text-[12px] font-semibold text-(--muted)">spur broadcast</p>
            <p className="m-0 text-[14px] leading-[1.4] text-(--white)">{toast}</p>
          </div>
          <span className="pt-px text-[16px] text-(--muted)">×</span>
        </div>
      </div>
    </>
  )
}
