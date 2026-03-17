import { formatDistanceToNow } from 'date-fns'

const STATUS_COLOR = {
  pending: 'var(--muted)',
  seen: 'var(--blue-light)',
  yes: '#22c55e',
  no: '#ef4444',
}

export default function SpurCard({ spur, currentUserId, onClick }) {
  const timeAgo = spur.created_at
    ? formatDistanceToNow(new Date(spur.created_at), { addSuffix: true })
    : ''

  const senderName =
    spur.sender?.name ??
    (spur.sender_id === currentUserId ? 'You' : 'Someone')

  const recipients = spur.spur_recipients ?? []

  return (
    <div
      onClick={onClick}
      style={{
        background: 'linear-gradient(160deg, var(--surface), var(--surface-2))',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '14px 16px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
          {spur.sender_id === currentUserId ? 'You' : senderName}
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{timeAgo}</span>
      </div>

      <span style={{ fontSize: 15, color: 'var(--white)', lineHeight: 1.4 }}>
        {spur.message ?? spur.note ?? '—'}
      </span>

      {recipients.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {recipients.map((r) => (
            <span
              key={r.id ?? r.recipient_id}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: STATUS_COLOR[r.status] ?? 'var(--muted)',
                display: 'inline-block',
              }}
              title={r.recipient?.name ?? r.status}
            />
          ))}
        </div>
      )}
    </div>
  )
}
