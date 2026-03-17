import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AvatarCircle from '../components/AvatarCircle'
import MessageBubble from '../components/MessageBubble'
import TypePill from '../components/TypePill'
import { ArrowLeft, Send } from 'lucide-react'

export default function SpurChat() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [spur, setSpur] = useState(null)
  const [recipients, setRecipients] = useState([])
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [myRsvp, setMyRsvp] = useState(null)
  const [access, setAccess] = useState('loading') // loading | granted | denied
  const [now, setNow] = useState(() => Date.now())
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)

  const refreshRecipients = useCallback(async () => {
    const { data } = await supabase
      .from('spur_recipients')
      .select('*, recipient:users!recipient_id(id, name)')
      .eq('spur_id', id)
    if (data) {
      setRecipients(data)
      const myRow = data.find((r) => r.recipient_id === user.id)
      if (myRow) setMyRsvp(myRow.status)
    }
  }, [id, user])

  const loadData = useCallback(async () => {
    const { data: spurData } = await supabase
      .from('spurs')
      .select('*, sender:users!sender_id(id, name)')
      .eq('id', id)
      .single()

    if (!spurData) { setAccess('denied'); return }

    const { data: recipientData } = await supabase
      .from('spur_recipients')
      .select('*, recipient:users!recipient_id(id, name)')
      .eq('spur_id', id)

    const isSender = spurData.sender_id === user.id
    const isRecipient = recipientData?.some((r) => r.recipient_id === user.id)

    if (!isSender && !isRecipient) { setAccess('denied'); return }

    setSpur(spurData)
    setRecipients(recipientData ?? [])
    setAccess('granted')

    // Mark as seen
    if (isRecipient) {
      const myRow = recipientData.find((r) => r.recipient_id === user.id)
      if (myRow) {
        setMyRsvp(myRow.status)
        if (myRow.status === 'pending') {
          await supabase
            .from('spur_recipients')
            .update({ status: 'seen' })
            .eq('id', myRow.id)
        }
      }
    }

    // Load messages
    const { data: msgs } = await supabase
      .from('spur_messages')
      .select('*, sender:users!sender_id(id, name)')
      .eq('spur_id', id)
      .order('created_at', { ascending: true })

    setMessages(msgs ?? [])

    // Subscribe to live updates
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
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'spur_recipients',
        filter: `spur_id=eq.${id}`,
      }, () => {
        refreshRecipients()
      })
      .subscribe()
  }, [id, user, refreshRecipients])

  /* eslint-disable react-hooks/set-state-in-effect -- data fetch on mount; setState in async callbacks is expected */
  useEffect(() => {
    if (!user) return
    loadData()
  }, [id, user, loadData])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  async function sendMessage() {
    const content = inputText.trim()
    if (!content) return
    setInputText('')
    await supabase.from('spur_messages').insert({
      spur_id: id,
      sender_id: user.id,
      content,
    })
  }

  async function rsvp(status) {
    const myRow = recipients.find((r) => r.recipient_id === user.id)
    if (!myRow) return
    await supabase
      .from('spur_recipients')
      .update({ status })
      .eq('id', myRow.id)
    setMyRsvp(status)
  }

  const isExpired = spur
    ? new Date(spur.created_at).getTime() + 2 * 60 * 60 * 1000 < now
    : false

  const isSender = spur?.sender_id === user?.id

  if (access === 'loading') return null

  if (access === 'denied') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <p style={{ color: 'var(--muted)', fontSize: 16 }}>You weren't invited to this spur.</p>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 24px', fontSize: 14, cursor: 'pointer' }}>
          Go back
        </button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100svh' }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--surface)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--white)', cursor: 'pointer', padding: 0, display: 'flex' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          {spur && <TypePill type={spur.type} active small />}
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
            from {spur?.sender?.name}
          </div>
        </div>
        {spur?.note && (
          <span style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {spur.note}
          </span>
        )}
      </div>

      {/* Recipients */}
      <div
        style={{
          padding: '10px 16px',
          display: 'flex',
          gap: 12,
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
        }}
      >
        {recipients.map((r) => (
          <div key={r.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ position: 'relative' }}>
              <AvatarCircle name={r.recipient?.name ?? '?'} userId={r.recipient_id} size="sm" />
              <span
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: r.status === 'yes' ? '#22c55e' : r.status === 'no' ? '#ef4444' : r.status === 'seen' ? 'var(--blue-light)' : 'var(--muted)',
                  border: '1.5px solid var(--bg)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* RSVP bar for recipients */}
      {!isSender && myRsvp !== 'yes' && myRsvp !== 'no' && !isExpired && (
        <div
          style={{
            padding: '10px 16px',
            display: 'flex',
            gap: 10,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => rsvp('yes')}
            style={{ flex: 1, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 10, padding: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            YES 🙌
          </button>
          <button
            onClick={() => rsvp('no')}
            style={{ flex: 1, background: 'var(--surface-2)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, fontSize: 14, cursor: 'pointer' }}
          >
            NO 👎
          </button>
        </div>
      )}
      {!isSender && (myRsvp === 'yes' || myRsvp === 'no') && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, color: myRsvp === 'yes' ? '#22c55e' : 'var(--muted)', textAlign: 'center' }}>
          You said {myRsvp === 'yes' ? 'YES 🙌' : 'NO 👎'}
          {isExpired ? '' : ' · tap again to change'}
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isOwn={m.sender_id === user.id}
            senderName={m.sender?.name ?? 'Someone'}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '10px 12px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 8,
          background: 'var(--surface)',
        }}
      >
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Message…"
          style={{
            flex: 1,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '10px 14px',
            color: 'var(--white)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!inputText.trim()}
          style={{
            background: 'var(--blue)',
            border: 'none',
            borderRadius: 12,
            padding: '0 14px',
            cursor: inputText.trim() ? 'pointer' : 'not-allowed',
            opacity: inputText.trim() ? 1 : 0.4,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
