const COLORS = ['#3B6FE8', '#7BAAF7', '#C8DCFF', '#2A5BD7', '#5B8FF5']

function hashColor(userId) {
  if (!userId) return COLORS[0]
  const sum = userId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return COLORS[sum % COLORS.length]
}

const SIZES = {
  sm: { width: 28, fontSize: 11 },
  md: { width: 36, fontSize: 14 },
  lg: { width: 48, fontSize: 18 },
}

export default function AvatarCircle({ name = '?', userId = '', size = 'md' }) {
  const { width, fontSize } = SIZES[size] ?? SIZES.md
  const bg = hashColor(userId)
  const letter = name.trim()[0]?.toUpperCase() ?? '?'

  return (
    <div
      style={{
        width,
        height: width,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        color: '#000',
        flexShrink: 0,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {letter}
    </div>
  )
}
