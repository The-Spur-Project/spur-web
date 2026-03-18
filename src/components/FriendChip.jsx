import { cn } from '../lib/cn'
import AvatarCircle from './AvatarCircle'

export default function FriendChip({ friend, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(friend.id)}
      className="flex cursor-pointer flex-col items-center gap-[5px] border-none bg-transparent p-0"
    >
      <div className="relative">
        <div
          className={cn(
            'rounded-full p-[3px] transition-colors duration-150',
            selected ? 'bg-(--blue)' : 'bg-transparent',
          )}
        >
          <AvatarCircle name={friend.name} userId={friend.id} size="lg" />
        </div>
        {selected && (
          <div className="animate-pop absolute -top-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-[2px] border-(--bg) bg-(--blue) text-[9px] font-bold text-white">
            ✓
          </div>
        )}
      </div>
      <span
        className={cn(
          'max-w-[52px] overflow-hidden text-ellipsis whitespace-nowrap text-center text-[11px] transition-colors duration-150',
          selected ? 'font-medium text-(--white)' : 'text-(--muted)',
        )}
      >
        {friend.name.split(' ')[0]}
      </span>
    </button>
  )
}
