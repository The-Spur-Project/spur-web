import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Admin() {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(null) // null | 'sending' | 'ok' | 'err'

  const adminPhones = (import.meta.env.VITE_ADMIN_PHONES ?? '').split(',').map(p => p.trim()).filter(Boolean)
  if (!user || !adminPhones.includes(user.phone)) {
    return <Navigate to="/home" replace />
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!message.trim()) return
    setStatus('sending')
    const { error } = await supabase.functions.invoke('send-broadcast', {
      body: { message: message.trim() },
    })
    setStatus(error ? 'err' : 'ok')
    if (!error) setMessage('')
    setTimeout(() => setStatus(null), 3000)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 24px', gap: 24, maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--white)' }}>Admin</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>Broadcast a push to everyone online</p>
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          rows={4}
          style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 14,
            padding: '14px 16px',
            color: 'var(--white)',
            fontSize: 15,
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />

        <button
          type="submit"
          disabled={!message.trim() || status === 'sending'}
          style={{
            background: status === 'ok' ? '#22c55e' : status === 'err' ? '#ef4444' : 'var(--blue)',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            padding: '14px 0',
            fontSize: 15,
            fontWeight: 600,
            cursor: message.trim() && status !== 'sending' ? 'pointer' : 'not-allowed',
            opacity: !message.trim() || status === 'sending' ? 0.6 : 1,
            transition: 'background 0.2s',
          }}
        >
          {status === 'sending' ? 'Sending...' : status === 'ok' ? 'Sent!' : status === 'err' ? 'Error — try again' : 'Broadcast to all online users'}
        </button>
      </form>
    </div>
  )
}
