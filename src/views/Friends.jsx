import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import FriendRow from '../components/FriendRow'

export default function Friends() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [friends, setFriends] = useState([])
  const [pending, setPending] = useState([]) // incoming
  const [friendshipMap, setFriendshipMap] = useState({}) // userId → status
  const debounceRef = useRef(null)

  const loadFriends = useCallback(async () => {
    const { data } = await supabase
      .from('friendships')
      .select('user_id, friend_id, user:users!user_id(id,name,phone), friend:users!friend_id(id,name,phone)')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

    if (!data) return
    const list = data.map((f) => (f.user_id === user.id ? f.friend : f.user)).filter(Boolean)
    setFriends(list)
    const map = {}
    list.forEach((f) => { map[f.id] = 'accepted' })
    setFriendshipMap((prev) => ({ ...prev, ...map }))
  }, [user.id])

  const loadPending = useCallback(async () => {
    const { data } = await supabase
      .from('friendships')
      .select('user_id, friend_id, user:users!user_id(id,name,phone)')
      .eq('status', 'pending')
      .eq('friend_id', user.id)

    if (!data) return
    const list = data.map((f) => f.user).filter(Boolean)
    setPending(list)
    const map = {}
    list.forEach((f) => { map[f.id] = 'pending_received' })
    setFriendshipMap((prev) => ({ ...prev, ...map }))
  }, [user.id])

  /* eslint-disable react-hooks/set-state-in-effect -- data fetch on mount; setState in async callbacks is expected */
  useEffect(() => {
    if (!user) return
    loadFriends()
    loadPending()
  }, [user, loadFriends, loadPending])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) return

    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, phone')
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
        .neq('id', user.id)
        .limit(10)

      setSearchResults(data ?? [])
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query, user.id])

  async function addFriend(friendId) {
    // Check for existing
    const { data: existing } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
      .limit(1)

    if (existing?.length) return

    await supabase.from('friendships').insert({ user_id: user.id, friend_id: friendId, status: 'pending' })
    setFriendshipMap((prev) => ({ ...prev, [friendId]: 'pending_sent' }))
  }

  async function acceptFriend(friendId) {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('user_id', friendId)
      .eq('friend_id', user.id)

    // Insert reverse for bidirectionality
    await supabase.from('friendships').upsert({
      user_id: user.id,
      friend_id: friendId,
      status: 'accepted',
    }, { onConflict: 'user_id,friend_id' })

    setPending((prev) => prev.filter((f) => f.id !== friendId))
    setFriendshipMap((prev) => ({ ...prev, [friendId]: 'accepted' }))
    loadFriends()
  }

  async function ignoreFriend(friendId) {
    await supabase
      .from('friendships')
      .delete()
      .eq('user_id', friendId)
      .eq('friend_id', user.id)

    setPending((prev) => prev.filter((f) => f.id !== friendId))
    setFriendshipMap((prev) => { const n = { ...prev }; delete n[friendId]; return n })
  }

  const section = (title, content) => (
    <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}
      </p>
      {content}
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 0' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--white)' }}>
          Friends
        </h2>
      </div>

      {/* Search */}
      <div style={{ padding: '14px 16px 0' }}>
        <input
          type="text"
          placeholder="Search by name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '11px 14px',
            color: 'var(--white)',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {query.trim() && (
        section(
          'Results',
          searchResults.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>No users found</p>
          ) : (
            searchResults.map((u) => (
              <FriendRow
                key={u.id}
                user={u}
                friendshipStatus={friendshipMap[u.id] ?? null}
                onAdd={addFriend}
              />
            ))
          )
        )
      )}

      {pending.length > 0 &&
        section(
          'Pending requests',
          pending.map((u) => (
            <FriendRow
              key={u.id}
              user={u}
              friendshipStatus="pending_received"
              onAccept={acceptFriend}
              onIgnore={ignoreFriend}
            />
          ))
        )
      }

      {section(
        `Your friends (${friends.length})`,
        friends.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>No friends yet — search to add some!</p>
        ) : (
          friends.map((f) => (
            <FriendRow key={f.id} user={f} friendshipStatus="accepted" />
          ))
        )
      )}
    </div>
  )
}
