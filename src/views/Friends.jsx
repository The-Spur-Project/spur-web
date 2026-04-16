import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AvatarCircle from '../components/AvatarCircle'
import FriendRow from '../components/FriendRow'

export default function Friends() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [friends, setFriends] = useState([])
  const [pending, setPending] = useState([])
  const [friendshipMap, setFriendshipMap] = useState({})
  const [activeUsers, setActiveUsers] = useState([])
  const debounceRef = useRef(null)
  const presenceChannelRef = useRef(null)
  const friendshipChannelRef = useRef(null)

  const loadFriends = useCallback(async () => {
    const query = supabase.from('users').select('id, name, phone')
    if (user?.id) query.neq('id', user.id)
    const { data } = await query
    if (!data) return
    setFriends(data)
    const map = {}
    data.forEach((f) => { map[f.id] = 'accepted' })
    setFriendshipMap((prev) => ({ ...prev, ...map }))
  }, [user?.id])

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

    presenceChannelRef.current = supabase
      .channel('app-presence', { config: { presence: { key: user.id } } })
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannelRef.current.presenceState()
        const online = Object.entries(state)
          .flatMap(([, instances]) => instances)
          .filter((p) => p.user_id !== user.id)
          .filter((p, i, arr) => arr.findIndex((x) => x.user_id === p.user_id) === i)
        setActiveUsers(online)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannelRef.current.track({ user_id: user.id, name: user.name })
        }
      })

    friendshipChannelRef.current = supabase
      .channel('friendship-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships' }, () => {
        loadPending()
        loadFriends()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friendships' }, () => {
        loadPending()
        loadFriends()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(presenceChannelRef.current)
      supabase.removeChannel(friendshipChannelRef.current)
    }
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
    const { data: existing } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
      .limit(1)

    if (existing?.length) return

    const { error } = await supabase.from('friendships').insert({ user_id: user.id, friend_id: friendId, status: 'pending' })
    if (!error) setFriendshipMap((prev) => ({ ...prev, [friendId]: 'pending_sent' }))
  }

  async function acceptFriend(friendId) {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('user_id', friendId)
      .eq('friend_id', user.id)

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

  const activeFriends = activeUsers.filter((u) => friendshipMap[u.user_id] === 'accepted')
  const activeUserIds = new Set(activeUsers.map((u) => u.user_id))

  return (
    <div className="flex flex-1 flex-col pb-20">
      {/* Header */}
      <div className="px-4 pt-5">
        <h2 className="m-0 font-['Plus_Jakarta_Sans',sans-serif] text-2xl font-extrabold text-(--white)">
          Friends
        </h2>
      </div>

      {/* Search */}
      <div className="px-4 pt-3.5">
        <input
          type="text"
          placeholder="Search by name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="box-border w-full rounded-xl border border-(--border) bg-(--surface) px-3.5 py-[11px] text-sm text-(--white) outline-none"
        />
      </div>

      {/* Search results */}
      {query.trim() && (
        <div className="flex flex-col gap-1 px-4 pt-4">
          <p className="m-0 mb-1.5 text-[13px] font-semibold tracking-[0.06em] text-(--muted) uppercase">
            Results
          </p>
          {searchResults.length === 0 ? (
            <p className="text-sm text-(--muted)">No users found</p>
          ) : (
            searchResults.map((u) => (
              <FriendRow
                key={u.id}
                user={u}
                friendshipStatus={friendshipMap[u.id] ?? null}
                onAdd={addFriend}
              />
            ))
          )}
        </div>
      )}

      {/* Pending requests — card style */}
      {pending.length > 0 && (
        <div className="px-4 pt-4">
          <p className="m-0 mb-2.5 text-[13px] font-semibold tracking-[0.06em] text-(--muted) uppercase">
            Pending ({pending.length})
          </p>
          <div className="flex flex-col gap-2">
            {pending.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-2xl border border-(--border) bg-(--surface-2) px-3.5 py-3"
              >
                <AvatarCircle name={u.name} userId={u.id} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-(--white)">{u.name}</div>
                  <div className="text-xs text-(--muted)">wants to connect</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => acceptFriend(u.id)}
                    className="cursor-pointer rounded-[10px] border-none bg-(--green) px-4 py-[9px] text-[13px] font-semibold text-white transition-transform active:scale-[0.95]"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => ignoreFriend(u.id)}
                    className="cursor-pointer rounded-[10px] border border-(--border) bg-transparent px-3 py-[9px] text-[13px] text-(--muted) transition-transform active:scale-[0.95]"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active now — horizontal avatar strip */}
      {activeFriends.length > 0 && (
        <div className="px-4 pt-4">
          <p className="m-0 mb-2.5 text-[13px] font-semibold tracking-[0.06em] text-(--muted) uppercase">
            Active now ({activeFriends.length})
          </p>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {activeFriends.map((u) => (
              <div key={u.user_id} className="flex shrink-0 flex-col items-center gap-[5px]">
                <div className="relative">
                  <AvatarCircle name={u.name ?? '?'} userId={u.user_id} size="lg" />
                  <span className="animate-pulse-dot absolute right-0 bottom-0 h-[11px] w-[11px] rounded-full border-2 border-(--bg) bg-(--green)" />
                </div>
                <span className="max-w-[52px] overflow-hidden text-ellipsis whitespace-nowrap text-center text-[11px] text-(--muted)">
                  {u.name?.split(' ')[0] ?? '?'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your friends — with online dot overlay */}
      <div className="flex flex-col gap-1 px-4 pt-4">
        <p className="m-0 mb-1.5 text-[13px] font-semibold tracking-[0.06em] text-(--muted) uppercase">
          Everyone ({friends.length})
        </p>
        {friends.length === 0 ? (
          <p className="text-sm text-(--muted)">No users found</p>
        ) : (
          friends.map((f) => (
            <div key={f.id} className="relative">
              <FriendRow user={f} friendshipStatus="accepted" />
              {activeUserIds.has(f.id) && (
                <span className="pointer-events-none absolute top-4 left-[46px] h-[10px] w-[10px] rounded-full border-2 border-(--bg) bg-(--green)" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
