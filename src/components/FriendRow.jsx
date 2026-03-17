import AvatarCircle from './AvatarCircle'

function maskPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  const last4 = digits.slice(-4)
  return `•••-•••-${last4}`
}

export default function FriendRow({
  user,
  friendshipStatus,
  onAdd,
  onAccept,
  onIgnore,
  selected,
  onSelect,
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <AvatarCircle name={user.name} userId={user.id} size="md" />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--white)' }}>
          {user.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {maskPhone(user.phone)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {onSelect != null && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onSelect(user.id)}
            style={{ width: 18, height: 18, accentColor: 'var(--blue)', cursor: 'pointer' }}
          />
        )}

        {!onSelect && friendshipStatus === null && onAdd && (
          <button onClick={() => onAdd(user.id)} style={btnStyle('var(--blue)')}>
            Add
          </button>
        )}

        {!onSelect && friendshipStatus === 'pending_sent' && (
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Pending</span>
        )}

        {!onSelect && friendshipStatus === 'accepted' && (
          <span style={{ fontSize: 12, color: '#22c55e' }}>Friends</span>
        )}

        {!onSelect && friendshipStatus === 'pending_received' && (
          <>
            <button onClick={() => onAccept(user.id)} style={btnStyle('#22c55e')}>
              Accept
            </button>
            <button onClick={() => onIgnore(user.id)} style={btnStyle('#ef4444')}>
              Ignore
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function btnStyle(bg) {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  }
}
