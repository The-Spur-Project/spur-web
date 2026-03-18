import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SpurCard from '../components/SpurCard'

const GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'Earlier']

function getDateGroup(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday - 86_400_000)
  const startOfWeek = new Date(startOfToday - 6 * 86_400_000)
  if (d >= startOfToday) return 'Today'
  if (d >= startOfYesterday) return 'Yesterday'
  if (d >= startOfWeek) return 'This week'
  return 'Earlier'
}

export default function History() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [spurs, setSpurs] = useState([])

  useEffect(() => {
    if (!user) return

    async function load() {
      const { data: sentSpurs } = await supabase
        .from('spurs')
        .select('*, sender:users!sender_id(name), spur_recipients(id, status, archived, unread_count, recipient_id, recipient:users!recipient_id(name))')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })

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
        receivedSpurs = data ?? []
      }

      const all = [...(sentSpurs ?? []), ...receivedSpurs]
      const unique = Array.from(new Map(all.map((s) => [s.id, s])).values())
      unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setSpurs(unique)
    }

    load()
  }, [user])

  const grouped = spurs.reduce((acc, s) => {
    const g = getDateGroup(s.created_at)
    if (!acc[g]) acc[g] = []
    acc[g].push(s)
    return acc
  }, {})

  return (
    <div className="flex flex-1 flex-col pb-20">
      <div className="px-4 pt-5">
        <h2 className="m-0 font-['Plus_Jakarta_Sans',sans-serif] text-2xl font-extrabold text-(--white)">
          History
        </h2>
      </div>

      <div className="flex flex-col gap-5 px-4 pt-[14px]">
        {spurs.length === 0 && (
          <p className="m-0 pt-8 text-center text-[14px] text-(--muted)">
            No spurs yet
          </p>
        )}
        {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
          <div key={group} className="flex flex-col gap-2">
            <p className="m-0 text-[11px] font-semibold tracking-[0.07em] text-(--muted) uppercase">
              {group}
            </p>
            {grouped[group].map((s) => (
              <SpurCard
                key={s.id}
                spur={s}
                currentUserId={user.id}
                onClick={() => navigate(`/spur/${s.id}`)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
