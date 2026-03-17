import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function PushToast() {
  const { session, user } = useAuth()
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
    if (!session) return

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
  }, [session])

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
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `}</style>
      <div
        onClick={() => setToast(null)}
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          zIndex: 999,
          animation: 'slideDown 0.3s ease',
          cursor: 'pointer',
        }}
      >
        <div style={{
          margin: '12px 16px 0',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}>
          <span style={{ fontSize: 20 }}>📣</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>spur broadcast</p>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--white)', lineHeight: 1.4 }}>{toast}</p>
          </div>
          <span style={{ fontSize: 16, color: 'var(--muted)', paddingTop: 1 }}>×</span>
        </div>
      </div>
    </>
  )
}
