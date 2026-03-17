import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TypePill from '../components/TypePill'
import FriendRow from '../components/FriendRow'
import SpurCard from '../components/SpurCard'

const SPUR_TYPES = ['hangout', 'food', 'store_run', 'library']

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Fire a spur state
  const [selectedType, setSelectedType] = useState(null)
  const [note, setNote] = useState('')
  const [friends, setFriends] = useState([])
  const [selectedFriends, setSelectedFriends] = useState([])
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  // Active spurs state
  const [spurs, setSpurs] = useState([])
  const channelRef = useRef(null)

  const fetchFriends = useCallback(async () => {
    const { data } = await supabase
      .from('friendships')
      .select('user_id, friend_id, status, user:users!user_id(id,name,phone), friend:users!friend_id(id,name,phone)')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

    if (!data) return
    const list = data.map((f) =>
      f.user_id === user.id ? f.friend : f.user
    ).filter(Boolean)
    setFriends(list)
  }, [user.id])

  const fetchSpurs = useCallback(async () => {
    // Spurs I sent OR I'm a recipient of
    const { data: sentSpurs } = await supabase
      .from('spurs')
      .select('*, sender:users!sender_id(name), spur_recipients(id, status, recipient_id, recipient:users!recipient_id(name))')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: recipientRows } = await supabase
      .from('spur_recipients')
      .select('spur_id')
      .eq('recipient_id', user.id)

    let receivedSpurs = []
    if (recipientRows?.length) {
      const spurIds = recipientRows.map((r) => r.spur_id)
      const { data } = await supabase
        .from('spurs')
        .select('*, sender:users!sender_id(name), spur_recipients(id, status, recipient_id, recipient:users!recipient_id(name))')
        .in('id', spurIds)
        .order('created_at', { ascending: false })
        .limit(20)
      receivedSpurs = data ?? []
    }

    const all = [...(sentSpurs ?? []), ...receivedSpurs]
    const unique = Array.from(new Map(all.map((s) => [s.id, s])).values())
    unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setSpurs(unique)
  }, [user.id])

  /* eslint-disable react-hooks/set-state-in-effect -- data fetch on mount; setState in async callbacks is expected */
  useEffect(() => {
    if (!user) return
    fetchFriends()
    fetchSpurs()

    // Realtime: refresh spur cards when recipient status changes
    channelRef.current = supabase
      .channel('home-recipients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spur_recipients' }, () => {
        fetchSpurs()
      })
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [user, fetchFriends, fetchSpurs])

  function toggleFriend(id) {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleAll() {
    if (selectedFriends.length === friends.length) {
      setSelectedFriends([])
    } else {
      setSelectedFriends(friends.map((f) => f.id))
    }
  }

  async function sendSpur() {
    if (!selectedType || selectedFriends.length === 0) return
    setSending(true)

    const { data: spur, error } = await supabase
      .from('spurs')
      .insert({ sender_id: user.id, type: selectedType, note: note.trim() || null })
      .select()
      .single()

    if (error) { setSending(false); return }

    const recipientRows = selectedFriends.map((id) => ({
      spur_id: spur.id,
      recipient_id: id,
    }))
    await supabase.from('spur_recipients').insert(recipientRows)

    // Call edge function to send SMS
    await supabase.functions.invoke('send-spur', { body: { spur_id: spur.id } })

    setSending(false)
    setSendSuccess(true)
    setTimeout(() => {
      setSendSuccess(false)
      setSelectedType(null)
      setNote('')
      setSelectedFriends([])
      navigate(`/spur/${spur.id}`)
    }, 800)
  }

  const canSend = selectedType && selectedFriends.length > 0 && !sending

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0' }}>
        <h2
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 26,
            fontWeight: 800,
            margin: 0,
            color: 'var(--white)',
          }}
        >
          Hey {user?.name?.split(' ')[0]} 👋
        </h2>
      </div>

      {/* Fire a spur section */}
      <div
        style={{
          margin: '16px 16px 0',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Fire a Spur
        </p>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SPUR_TYPES.map((t) => (
            <TypePill
              key={t}
              type={t}
              active={selectedType === t}
              onClick={() => setSelectedType(t === selectedType ? null : t)}
            />
          ))}
        </div>

        {/* Note */}
        <textarea
          placeholder="Add a note… (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '10px 12px',
            color: 'var(--white)',
            fontSize: 14,
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
          }}
        />

        {/* Friend selector */}
        {friends.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {selectedFriends.length} selected
              </span>
              <button
                onClick={toggleAll}
                style={{ background: 'none', border: 'none', color: 'var(--blue-light)', fontSize: 13, cursor: 'pointer', padding: 0 }}
              >
                {selectedFriends.length === friends.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {friends.map((f) => (
                <FriendRow
                  key={f.id}
                  user={f}
                  selected={selectedFriends.includes(f.id)}
                  onSelect={() => toggleFriend(f.id)}
                />
              ))}
            </div>
          </div>
        )}

        {friends.length === 0 && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
            Add friends first to send a spur
          </p>
        )}

        <button
          onClick={sendSpur}
          disabled={!canSend}
          style={{
            background: sendSuccess ? '#22c55e' : 'var(--blue)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '13px 0',
            fontSize: 15,
            fontWeight: 600,
            cursor: canSend ? 'pointer' : 'not-allowed',
            opacity: canSend || sendSuccess ? 1 : 0.4,
            transition: 'background 0.3s',
          }}
        >
          {sendSuccess ? '✓ Sent!' : sending ? 'Sending…' : 'Send Spur 🔥'}
        </button>
      </div>

      {/* Active spurs */}
      <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Active Spurs
        </p>
        {spurs.length === 0 && (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', textAlign: 'center', paddingTop: 16 }}>
            No active spurs yet
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
