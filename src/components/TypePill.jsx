const TYPE_MAP = {
  hangout:   { emoji: '👋', label: 'Hangout' },
  food:      { emoji: '🍔', label: 'Food' },
  store_run: { emoji: '🛒', label: 'Store Run' },
  library:   { emoji: '📚', label: 'Library' },
}

export default function TypePill({ type, active = false, onClick, small = false }) {
  const { emoji, label } = TYPE_MAP[type] ?? { emoji: '?', label: type }

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: small ? 4 : 6,
    padding: small ? '4px 10px' : '8px 16px',
    borderRadius: 999,
    fontSize: small ? 12 : 14,
    fontWeight: 500,
    cursor: onClick ? 'pointer' : 'default',
    border: `1.5px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
    background: active ? 'var(--blue)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    transition: 'all 0.15s',
    userSelect: 'none',
  }

  return (
    <span style={base} onClick={onClick}>
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  )
}
