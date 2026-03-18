import { formatDistanceToNow } from 'date-fns'
import { cn } from '../lib/cn'

const STATUS_COLOR = {
  pending: 'var(--muted)',
  seen: 'var(--blue-light)',
  yes: 'var(--green)',
  no: 'var(--red)',
  left: 'var(--gray)',
}

export default function SpurCard({ spur, currentUserId, onClick }) {
  const timeAgo = spur.created_at
    ? formatDistanceToNow(new Date(spur.created_at), { addSuffix: true })
    : ''

  const isMeSender = spur.sender_id === currentUserId
  const senderName = spur.sender?.name ?? (isMeSender ? 'You' : 'Someone')

  const recipients = spur.spur_recipients ?? []

  const unreadCount = isMeSender
    ? (spur.sender_unread_count ?? 0)
    : (recipients.find((r) => r.recipient_id === currentUserId)?.unread_count ?? 0)

  const hasUnread = unreadCount > 0

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex cursor-pointer flex-col gap-2 overflow-hidden rounded-2xl border bg-surface-gradient px-4 py-3.5 transition-transform duration-100 active:scale-[0.985]',
        hasUnread ? 'border-(--border-unread)' : 'border-(--border)',
      )}
    >
      {/* Left unread accent bar */}
      {hasUnread && (
        <div className="absolute top-0 bottom-0 left-0 w-[3px] rounded-r-full bg-(--blue)" />
      )}

      {/* Top row: sender name · time · unread badge */}
      <div className="flex items-center gap-[6px]">
        <span className={cn('flex-1 text-[13px] font-semibold', hasUnread ? 'text-(--white)' : 'text-(--muted)')}>
          {isMeSender ? 'You' : senderName}
        </span>
        <span className="text-xs text-(--muted)">{timeAgo}</span>
        {hasUnread && (
          <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[99px] bg-(--blue) px-[5px] text-[11px] font-bold text-white shadow-blue-glow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {/* Spur message */}
      <span className={cn('text-[15px] leading-[1.4]', hasUnread ? 'font-semibold text-(--white)' : 'font-medium text-(--white)')}>
        {spur.message ?? spur.note ?? '—'}
      </span>

      {/* Last message preview */}
      {spur.last_message && (
        <span className="overflow-hidden text-[13px] text-(--muted) text-ellipsis whitespace-nowrap">
          {spur.last_message}
        </span>
      )}

      {/* Recipient status dots */}
      {recipients.length > 0 && (
        <div className="flex flex-wrap gap-[7px]">
          {recipients.map((r) => (
            <span
              key={r.id ?? r.recipient_id}
              style={{ background: STATUS_COLOR[r.status] ?? 'var(--muted)' }}
              className="inline-block h-[10px] w-[10px] rounded-full"
              title={r.recipient?.name ?? r.status}
            />
          ))}
        </div>
      )}
    </div>
  )
}
