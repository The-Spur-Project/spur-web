const TYPE_MAP = {
  hangout:   { emoji: '👋', label: 'Hangout' },
  food:      { emoji: '🍔', label: 'Food' },
  store_run: { emoji: '🛒', label: 'Store Run' },
  library:   { emoji: '📚', label: 'Library' },
}

export default function TypePill({ type, active = false, onClick, small = false }) {
  const { emoji, label } = TYPE_MAP[type] ?? { emoji: '?', label: type }

  const base = {
    base: 'inline-flex items-center rounded-full font-medium select-none border-[1.5px] transition-all',
    size: small ? 'gap-1 px-[10px] py-1 text-[12px]' : 'gap-[6px] px-4 py-2 text-[14px]',
    state: active
      ? 'border-[var(--blue)] bg-[var(--blue)] text-white'
      : 'border-[var(--border)] bg-transparent text-[var(--muted)]',
    cursor: onClick ? 'cursor-pointer' : 'cursor-default',
  }

  return (
    <span
      className={`${base.base} ${base.size} ${base.state} ${base.cursor}`}
      onClick={onClick}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  )
}
