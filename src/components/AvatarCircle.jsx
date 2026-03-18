import { cn } from '../lib/cn'

const COLORS = ['#3B6FE8', '#7BAAF7', '#C8DCFF', '#2A5BD7', '#5B8FF5']

function hashColor(userId) {
  if (!userId) return COLORS[0]
  const sum = userId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return COLORS[sum % COLORS.length]
}

const SIZE_CLASSES = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-15 w-15 text-2xl',
}

export default function AvatarCircle({ name = '?', userId = '', size = 'md' }) {
  const bg = hashColor(userId)
  const letter = name.trim()[0]?.toUpperCase() ?? '?'

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-black font-['Plus_Jakarta_Sans',sans-serif]",
        SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
      )}
      style={{ background: bg }}
    >
      {letter}
    </div>
  )
}
