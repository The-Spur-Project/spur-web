import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/cn'
import FriendChip from '../components/FriendChip'
import SpurCard from '../components/SpurCard'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [message, setMessage] = useState('')
  const [friends, setFriends] = useState([])
  const [selectedFriends, setSelectedFriends] = useState([])
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  const [spurs, setSpurs] = useState([])
  const channelRef = useRef(null)

  const fetchFriends = useCallback(async () => {
    const { data } = await supabase
      .from('friendships')
      .select('user_id, friend_id, status, user:users!user_id(id,name,phone), friend:users!friend_id(id,name,phone)')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

    if (!data) return
    const seen = new Set()
    const list = data
      .map((f) => (f.user_id === user.id ? f.friend : f.user))
      .filter(Boolean)
      .filter((f) => { if (seen.has(f.id)) return false; seen.add(f.id); return true })
    setFriends(list)
  }, [user.id])

  const fetchSpurs = useCallback(async () => {
    const { data: sentSpurs } = await supabase
      .from('spurs')
      .select('*, sender:users!sender_id(name), spur_recipients(id, status, archived, unread_count, recipient_id, recipient:users!recipient_id(name))')
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
        .select('*, sender:users!sender_id(name), spur_recipients(id, status, archived, unread_count, recipient_id, recipient:users!recipient_id(name))')
        .in('id', spurIds)
        .order('created_at', { ascending: false })
        .limit(20)
      receivedSpurs = data ?? []
    }

    const all = [...(sentSpurs ?? []), ...receivedSpurs]
    const unique = Array.from(new Map(all.map((s) => [s.id, s])).values())
    unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const now = Date.now()
    const active = unique.filter((s) => {
      const notExpired = new Date(s.created_at).getTime() + 3 * 60 * 60 * 1000 > now
      if (!notExpired) return false
      const isMeSender = s.sender_id === user.id
      if (isMeSender) return !s.archived
      const myRow = s.spur_recipients?.find((r) => r.recipient_id === user.id)
      return !myRow?.archived && myRow?.status !== 'left'
    })
    setSpurs(active)
  }, [user.id])

  /* eslint-disable react-hooks/set-state-in-effect -- data fetch on mount; setState in async callbacks is expected */
  useEffect(() => {
    if (!user) return
    fetchFriends()
    fetchSpurs()

    channelRef.current = supabase
      .channel('home-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spur_recipients' }, () => fetchSpurs())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'spurs' }, () => fetchSpurs())
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
    if (!message.trim() || selectedFriends.length === 0) return
    setSending(true)

    const { data: spur, error } = await supabase
      .from('spurs')
      .insert({ sender_id: user.id, message: message.trim() })
      .select()
      .single()

    if (error) { setSending(false); return }

    const recipientRows = selectedFriends.map((id) => ({
      spur_id: spur.id,
      recipient_id: id,
    }))
    await supabase.from('spur_recipients').insert(recipientRows)
    await supabase.functions.invoke('send-spur', { body: { spur_id: spur.id } })

    setSending(false)
    setSendSuccess(true)
    setTimeout(() => {
      setSendSuccess(false)
      setMessage('')
      setSelectedFriends([])
      navigate(`/spur/${spur.id}`)
    }, 800)
  }

  const canSend = message.trim() && selectedFriends.length > 0 && !sending
  const allSelected = friends.length > 0 && selectedFriends.length === friends.length

  return (
    <div className="flex flex-1 flex-col pb-20">
      {/* Header */}
      <div className="px-5 pt-5">
        <h2 className="m-0 font-['Plus_Jakarta_Sans',sans-serif] text-[26px] font-extrabold text-(--white)">
          Hey {user?.name?.split(' ')[0]} 👋
        </h2>
      </div>

      {/* Fire a Spur card */}
      <div className="mx-4 mt-4 flex flex-col gap-3.5 rounded-[20px] border border-(--border) bg-surface-gradient p-4">
        <p className="m-0 text-[13px] font-semibold tracking-[0.06em] text-(--muted) uppercase">
          Fire a Spur 🔥
        </p>

        <textarea
          placeholder="Target run at Hemphill in 30?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && canSend) {
              e.preventDefault()
              sendSpur()
            }
          }}
          rows={2}
          className="box-border w-full resize-none rounded-xl border border-(--border) bg-(--surface-2) px-3.5 py-3 text-[15px] leading-[1.45] text-(--white) outline-none"
        />

        {/* Friend avatar chip grid */}
        {friends.length > 0 && (
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs text-(--muted)">
                {selectedFriends.length === 0
                  ? 'Tap to select'
                  : `${selectedFriends.length} of ${friends.length} selected`}
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="cursor-pointer border-none bg-transparent p-0 text-xs font-medium text-(--blue-light)"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-2.5">
              {friends.map((f) => (
                <FriendChip
                  key={f.id}
                  friend={f}
                  selected={selectedFriends.includes(f.id)}
                  onToggle={toggleFriend}
                />
              ))}
            </div>
          </div>
        )}

        {friends.length === 0 && (
          <p className="m-0 text-center text-[13px] text-(--muted)">
            Add friends first to send a spur
          </p>
        )}

        <button
          type="button"
          onClick={sendSpur}
          disabled={!canSend}
          className={cn(
            'rounded-xl border-none py-[13px] text-[15px] font-semibold text-white transition-all duration-200',
            sendSuccess
              ? 'bg-(--green) shadow-green-soft'
              : 'bg-(--blue) shadow-blue-soft',
            canSend || sendSuccess
              ? 'cursor-pointer opacity-100 active:scale-[0.98]'
              : 'cursor-not-allowed opacity-40',
          )}
        >
          {sendSuccess ? '✓ Sent!' : sending ? 'Sending…' : 'Send Spur 🔥'}
        </button>
      </div>

      {/* Active spurs */}
      <div className="flex flex-col gap-2.5 px-4 pt-5">
        <p className="m-0 text-[13px] font-semibold tracking-[0.06em] text-(--muted) uppercase">
          Active Spurs
        </p>
        {spurs.length === 0 && (
          <p className="m-0 pt-4 text-center text-sm text-(--muted)">
            No active spurs · fire one above!
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
