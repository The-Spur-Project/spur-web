import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/cn'

export default function Admin() {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(null)

  const adminPhones = (import.meta.env.VITE_ADMIN_PHONES ?? '').split(',').map((p) => p.trim()).filter(Boolean)
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

  const canSubmit = message.trim() && status !== 'sending'

  return (
    <div className="mx-auto box-border flex w-full max-w-[480px] flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="m-0 text-2xl font-bold text-(--white)">Admin</h1>
        <p className="mt-1 mb-0 text-[13px] text-(--muted)">Broadcast a push to everyone online</p>
      </div>

      <form onSubmit={handleSend} className="flex flex-col gap-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          rows={4}
          className="box-border w-full resize-y rounded-[14px] border-[1.5px] border-(--border) bg-(--surface) px-4 py-[14px] text-[15px] text-(--white) outline-none"
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className={cn(
            'rounded-[14px] border-none py-[14px] text-[15px] font-semibold text-white transition-colors',
            status === 'ok' && 'bg-[#22c55e]',
            status === 'err' && 'bg-[#ef4444]',
            status !== 'ok' && status !== 'err' && 'bg-(--blue)',
            canSubmit ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-60',
          )}
        >
          {status === 'sending' ? 'Sending...' : status === 'ok' ? 'Sent!' : status === 'err' ? 'Error — try again' : 'Broadcast to all online users'}
        </button>
      </form>
    </div>
  )
}
