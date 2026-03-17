import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SpurCard from '../components/SpurCard'

export default function History() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [spurs, setSpurs] = useState([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('spurs')
      .select('*, sender:users!sender_id(name), spur_recipients(id, status, recipient_id, recipient:users!recipient_id(name))')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setSpurs(data ?? []))
  }, [user])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      <div style={{ padding: '20px 16px 0' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--white)' }}>
          History
        </h2>
      </div>

      <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {spurs.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', paddingTop: 32 }}>
            You haven't sent any spurs yet
          </p>
        )}
        {spurs.map((s) => (
          <SpurCard
            key={s.id}
            spur={s}
            currentUserId={user.id}
            onClick={() => navigate(`/spur/${s.id}`)}
          />
        ))}
      </div>
    </div>
  )
}
