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
    <div className="flex items-center gap-3 border-b border-(--border) py-[11px]">
      <AvatarCircle name={user.name} userId={user.id} size="md" />

      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-(--white)">
          {user.name}
        </div>
        <div className="text-xs text-(--muted)">
          {maskPhone(user.phone)}
        </div>
      </div>

      <div className="flex items-center gap-[6px]">
        {onSelect != null && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onSelect(user.id)}
            className="h-[18px] w-[18px] cursor-pointer accent-(--blue)"
          />
        )}

        {!onSelect && friendshipStatus === null && onAdd && (
          <button
            type="button"
            onClick={() => onAdd(user.id)}
            className="cursor-pointer rounded-[10px] border-none bg-(--blue) px-3.5 py-2 text-[13px] font-medium text-white transition-transform active:scale-[0.95]"
          >
            Add
          </button>
        )}

        {!onSelect && friendshipStatus === 'pending_sent' && (
          <span className="text-xs text-(--muted)">Pending</span>
        )}

        {!onSelect && friendshipStatus === 'accepted' && (
          <span className="text-xs text-(--green)">Friends</span>
        )}

        {!onSelect && friendshipStatus === 'pending_received' && (
          <>
            <button
              type="button"
              onClick={() => onAccept(user.id)}
              className="cursor-pointer rounded-[10px] border-none bg-(--green) px-4 py-[9px] text-[13px] font-semibold text-white transition-transform active:scale-[0.95]"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => onIgnore(user.id)}
              className="cursor-pointer rounded-[10px] border border-(--border) bg-transparent px-3 py-[9px] text-[13px] text-(--muted) transition-transform active:scale-[0.95]"
            >
              Ignore
            </button>
          </>
        )}
      </div>
    </div>
  )
}
