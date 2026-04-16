import { format } from 'date-fns'
import { cn } from '../lib/cn'
import AvatarCircle from './AvatarCircle'

export default function MessageBubble({ message, isOwn, senderName, showSender = true, showTime = true, userId, type = 'text' }) {
  if (type === 'system') {
    return (
      <div className="animate-fadeUp my-2 text-center text-[11px] text-(--muted)">
        {message.content}
      </div>
    )
  }

  const timeStr = message.created_at
    ? format(new Date(message.created_at), 'h:mm a')
    : ''

  if (isOwn) {
    return (
      <div
        className={cn(
          'flex max-w-[78%] flex-col items-end self-end',
          showTime ? 'mb-2.5' : 'mb-[2px]',
        )}
      >
        <div className="max-w-full rounded-[18px_18px_4px_18px] bg-blue-bubble px-3.5 py-2.5 text-[15px] leading-[1.45] text-white shadow-blue-bubble wrap-break-word">
          {message.content}
        </div>
        {showTime && (
          <span className="mr-[3px] mt-[3px] text-[10px] text-(--muted)">
            {timeStr}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex max-w-[82%] items-end self-start gap-2',
        showTime ? 'mb-2.5' : 'mb-[2px]',
      )}
    >
      {showSender
        ? <AvatarCircle name={senderName ?? '?'} userId={userId ?? message.sender_id} size="sm" />
        : <div className="h-7 w-7 shrink-0" />
      }

      <div className="flex min-w-0 flex-1 flex-col items-start">
        {showSender && (
          <span className="mb-[3px] ml-[2px] text-[11px] font-medium text-(--muted)">
            {senderName}
          </span>
        )}
        <div className="max-w-full rounded-[18px_18px_18px_4px] border border-(--border) bg-(--surface-2) px-3.5 py-2.5 text-[15px] leading-[1.45] text-(--white) wrap-break-word">
          {message.content}
        </div>
        {showTime && (
          <span className="mt-[3px] ml-[2px] text-[10px] text-(--muted)">
            {timeStr}
          </span>
        )}
      </div>
    </div>
  )
}
