import { format } from 'date-fns'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/cn'
import AvatarCircle from '../components/AvatarCircle'
import MessageBubble from '../components/MessageBubble'
import { Archive, ArrowLeft, Send, Trash2 } from 'lucide-react'

const DOT_COLOR = {
  yes: 'var(--green)',
  no: 'var(--red)',
  seen: 'var(--blue-light)',
  left: 'var(--gray)',
  pending: 'var(--muted)',
}

function DateSeparator({ date }) {
  const d = new Date(date)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isYesterday = d.toDateString() === new Date(now - 86_400_000).toDateString()
  const label = isToday ? 'Today' : isYesterday ? 'Yesterday' : format(d, 'MMMM d')
  return (
    <div className="my-2.5 flex items-center gap-2.5">
      <div className="h-px flex-1 bg-(--border)" />
      <span className="text-[11px] font-medium whitespace-nowrap text-(--muted)">{label}</span>
      <div className="h-px flex-1 bg-(--border)" />
    </div>
  )
}

function recipientNameClass(status) {
  return cn(
    'max-w-[44px] truncate text-center text-[10px]',
    status === 'yes' && 'font-semibold text-(--green)',
    status === 'no' && 'font-normal text-(--red)',
    status === 'left' && 'font-normal text-(--gray)',
    !['yes', 'no', 'left'].includes(status) && 'font-normal text-(--muted)',
  )
}

export default function SpurChat() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [spur, setSpur] = useState(null)
  const [recipients, setRecipients] = useState([])
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [myRsvp, setMyRsvp] = useState(null)
  const [access, setAccess] = useState('loading')
  const [now, setNow] = useState(() => Date.now())
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [changingRsvp, setChangingRsvp] = useState(false)
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)
  const isMountedRef = useRef(true)

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

    const localIsSender = spurData.sender_id === user.id
    const isRecipient = recipientData?.some((r) => r.recipient_id === user.id)

    if (!localIsSender && !isRecipient) { setAccess('denied'); return }

    setSpur(spurData)
    setRecipients(recipientData ?? [])
    setAccess('granted')

    const localMyRow = recipientData?.find((r) => r.recipient_id === user.id)
    if (localMyRow) {
      setMyRsvp(localMyRow.status)
      const updates = {}
      if (localMyRow.status === 'pending') updates.status = 'seen'
      updates.unread_count = 0
      await supabase.from('spur_recipients').update(updates).eq('id', localMyRow.id)
      setRecipients((prev) =>
        prev.map((r) => r.id === localMyRow.id ? { ...r, ...updates } : r)
      )
    }
    if (localIsSender) {
      supabase.from('spurs').update({ sender_unread_count: 0 }).eq('id', id)
      setSpur((prev) => prev ? { ...prev, sender_unread_count: 0 } : prev)
    }

    const { data: msgs } = await supabase
      .from('spur_messages')
      .select('*, sender:users!sender_id(id, name)')
      .eq('spur_id', id)
      .order('created_at', { ascending: true })

    setMessages(msgs ?? [])

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

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
        if (isMountedRef.current) {
          if (localIsSender) {
            supabase.from('spurs').update({ sender_unread_count: 0 }).eq('id', id)
          } else if (localMyRow) {
            supabase.from('spur_recipients').update({ unread_count: 0 }).eq('id', localMyRow.id)
          }
        }
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
      isMountedRef.current = false
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  const isExpired = spur
    ? new Date(spur.created_at).getTime() + 3 * 60 * 60 * 1000 < now
    : false
  const isSender = spur?.sender_id === user?.id
  const myRecipientRow = recipients.find((r) => r.recipient_id === user?.id)
  const myArchived = isSender ? (spur?.archived ?? false) : (myRecipientRow?.archived ?? false)
  const isLeft = myRecipientRow?.status === 'left'
  const isLocked = isExpired || myArchived || isLeft

  const usersMap = {}
  if (spur?.sender) usersMap[spur.sender_id] = spur.sender
  recipients.forEach((r) => { if (r.recipient) usersMap[r.recipient_id] = r.recipient })

  const yesNames = recipients
    .filter((r) => r.status === 'yes')
    .map((r) => r.recipient?.name?.split(' ')[0] ?? '?')
  const noNames = recipients
    .filter((r) => r.status === 'no')
    .map((r) => r.recipient?.name?.split(' ')[0] ?? '?')

  const annotatedMessages = messages.map((m, i) => {
    const prev = i > 0 ? messages[i - 1] : null
    const next = i < messages.length - 1 ? messages[i + 1] : null
    const sameSenderAsPrev = prev?.sender_id === m.sender_id
    const closeInTimePrev = prev
      ? new Date(m.created_at) - new Date(prev.created_at) < 3 * 60 * 1000
      : false
    const showSender = !sameSenderAsPrev || !closeInTimePrev
    const showDateSep = !prev ||
      new Date(m.created_at).toDateString() !== new Date(prev.created_at).toDateString()
    const sameSenderAsNext = next?.sender_id === m.sender_id
    const closeInTimeNext = next
      ? new Date(next.created_at) - new Date(m.created_at) < 3 * 60 * 1000
      : false
    const showTime = !next || !sameSenderAsNext || !closeInTimeNext
    return { ...m, showSender, showDateSep, showTime }
  })

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
    await supabase.from('spur_recipients').update({ status }).eq('id', myRow.id)
    setMyRsvp(status)
    setChangingRsvp(false)
  }

  async function handleArchive() {
    if (isSender) {
      await supabase.from('spurs').update({ archived: true }).eq('id', id)
    } else {
      const myRow = recipients.find((r) => r.recipient_id === user.id)
      if (myRow) await supabase.from('spur_recipients').update({ archived: true }).eq('id', myRow.id)
    }
    navigate('/home', { replace: true })
  }

  async function handleLeave() {
    const myRow = recipients.find((r) => r.recipient_id === user.id)
    if (!myRow) return
    await supabase.from('spur_recipients').update({ status: 'left' }).eq('id', myRow.id)
    navigate('/home', { replace: true })
  }

  async function handleDelete() {
    await supabase.from('spurs').delete().eq('id', id)
    navigate('/home', { replace: true })
  }

  if (access === 'loading') {
    return (
      <div className="flex h-svh flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-(--border) bg-(--surface) px-4 py-3.5">
          <div className="skeleton h-5 w-5 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="skeleton h-3.5 w-36 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3 px-4 py-4">
          <div className="flex max-w-[65%] flex-col gap-1.5 self-start">
            <div className="skeleton h-10 w-full rounded-2xl" />
            <div className="skeleton h-10 w-3/4 rounded-2xl" />
          </div>
          <div className="flex max-w-[55%] flex-col gap-1.5 self-end">
            <div className="skeleton h-10 w-full rounded-2xl" />
          </div>
          <div className="flex max-w-[70%] flex-col gap-1.5 self-start">
            <div className="skeleton h-10 w-full rounded-2xl" />
            <div className="skeleton h-10 w-1/2 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (access === 'denied') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-base text-(--muted)">You weren&apos;t invited to this spur.</p>
        <button
          type="button"
          onClick={() => navigate('/home', { replace: true })}
          className="cursor-pointer rounded-xl border-none bg-(--blue) px-6 py-[11px] text-sm text-white"
        >
          Go home
        </button>
      </div>
    )
  }

  const lockedBarBase = 'border-t border-(--border) bg-(--surface) px-4 text-center text-[13px] text-(--muted) pb-[calc(14px+env(safe-area-inset-bottom))] pt-3.5'

  return (
    <div className="animate-slideInRight flex h-svh flex-1 flex-col">

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-(--border) bg-(--surface) px-4 py-3.5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex cursor-pointer border-none bg-transparent p-0 text-(--white)"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-(--white)">
            {spur?.message ?? spur?.note ?? ''}
          </div>
          <div className="mt-[2px] text-xs text-(--muted)">
            from {spur?.sender?.name}
          </div>
        </div>

        {isSender && !myArchived && (
          confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-(--muted)">Delete?</span>
              <button
                type="button"
                onClick={handleDelete}
                className="cursor-pointer rounded-lg border-none bg-(--red) px-2.5 py-1 text-xs font-semibold text-white"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="cursor-pointer border-none bg-transparent p-0 text-xs text-(--muted)"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleArchive}
                title="Archive"
                className="flex cursor-pointer border-none bg-transparent p-1 text-(--muted)"
              >
                <Archive size={18} />
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                title="Delete"
                className="flex cursor-pointer border-none bg-transparent p-1 text-(--muted)"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )
        )}
        {!isSender && !myArchived && (
          <button
            type="button"
            onClick={handleArchive}
            title="Archive"
            className="flex cursor-pointer border-none bg-transparent p-1 text-(--muted)"
          >
            <Archive size={18} />
          </button>
        )}
      </div>

      {/* Recipients strip */}
      <div className="border-b border-(--border) bg-(--surface) px-4 py-2.5">
        <div className="flex gap-3.5 overflow-x-auto">
          {recipients.map((r) => {
            const firstName = r.recipient?.name?.split(' ')[0] ?? '?'
            return (
              <div key={r.id} className="flex shrink-0 flex-col items-center gap-1">
                <div className="relative">
                  <AvatarCircle name={r.recipient?.name ?? '?'} userId={r.recipient_id} size="sm" />
                  <span
                    className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border-[1.5px] border-(--bg)"
                    style={{ background: DOT_COLOR[r.status] ?? '(--muted)' }}
                  />
                </div>
                <span className={recipientNameClass(r.status)}>
                  {firstName}
                </span>
              </div>
            )
          })}
        </div>

        {(yesNames.length > 0 || noNames.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-3.5">
            {yesNames.length > 0 && (
              <span className="text-xs font-medium text-(--green)">
                ✓ {yesNames.join(', ')} {yesNames.length === 1 ? 'is' : 'are'} in
              </span>
            )}
            {noNames.length > 0 && (
              <span className="text-xs text-(--red)">
                ✗ {noNames.join(', ')} passed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Leave chat */}
      {!isSender && !isLeft && !isExpired && (
        <div className="flex justify-end border-b border-(--border) px-4 py-1.5">
          <button
            type="button"
            onClick={handleLeave}
            className="cursor-pointer border-none bg-transparent p-0 text-xs text-(--muted)"
          >
            Leave chat
          </button>
        </div>
      )}

      {/* RSVP buttons */}
      {!isSender && (myRsvp !== 'yes' && myRsvp !== 'no' && myRsvp !== 'left' || changingRsvp) && !isExpired && (
        <div className="animate-slideDown flex gap-2.5 border-b border-(--border) px-4 py-2.5">
          <button
            type="button"
            onClick={() => rsvp('yes')}
            className="flex-1 cursor-pointer rounded-[10px] border-none bg-(--green) py-[11px] text-sm font-semibold text-white shadow-green-glow transition-transform active:scale-[0.97]"
          >
            YES 🙌
          </button>
          <button
            type="button"
            onClick={() => rsvp('no')}
            className="flex-1 cursor-pointer rounded-[10px] border border-(--border) bg-(--surface-2) py-[11px] text-sm text-(--muted) transition-transform active:scale-[0.97]"
          >
            NO 👎
          </button>
        </div>
      )}
      {!isSender && (myRsvp === 'yes' || myRsvp === 'no') && !changingRsvp && (
        <button
          type="button"
          onClick={!isExpired ? () => setChangingRsvp(true) : undefined}
          className={cn(
            'animate-pop w-full border-b border-(--border) px-4 py-2 text-center text-[13px]',
            myRsvp === 'yes' ? 'text-(--green)' : 'text-(--muted)',
            !isExpired && 'cursor-pointer',
          )}
        >
          You said {myRsvp === 'yes' ? 'YES 🙌' : 'NO 👎'}
          {isExpired ? '' : ' · tap again to change'}
        </button>
      )}

      {/* Messages */}
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-3">
        {annotatedMessages.map((m, index) => (
          <div
            key={m.id}
            className="flex flex-col animate-fadeUp"
            style={{ animationDelay: `${Math.min(index, 5) * 50}ms` }}
          >
            {m.showDateSep && <DateSeparator date={m.created_at} />}
            <MessageBubble
              message={m}
              isOwn={m.sender_id === user.id}
              senderName={m.sender?.name ?? usersMap[m.sender_id]?.name ?? 'Someone'}
              showSender={m.showSender}
              showTime={m.showTime}
              userId={m.sender_id}
            />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Locked bars */}
      {isLeft ? (
        <div className={lockedBarBase}>You left this chat</div>
      ) : myArchived ? (
        <div className={lockedBarBase}>You archived this chat</div>
      ) : isExpired ? (
        <div className={lockedBarBase}>This spur has closed · chat locked after 3 hours</div>
      ) : (
        <div className="flex gap-2 border-t border-(--border) bg-(--surface) px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Message…"
            disabled={isLocked}
            className={cn(
              'min-w-0 flex-1 rounded-3xl border border-(--border) bg-(--surface-2) px-4 py-2.5 text-base text-(--white) outline-none',
              isLocked && 'opacity-50',
            )}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!inputText.trim() || isLocked}
            className={cn(
              'flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border-none bg-(--blue) text-white',
              inputText.trim() && !isLocked ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-40',
            )}
          >
            <Send size={17} />
          </button>
        </div>
      )}
    </div>
  )
}
