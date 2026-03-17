export default function MessageBubble({ message, isOwn, senderName }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        gap: 2,
        marginBottom: 8,
      }}
    >
      {!isOwn && (
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>
          {senderName}
        </span>
      )}
      <div
        style={{
          maxWidth: '75%',
          padding: '9px 13px',
          borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isOwn ? 'var(--blue)' : 'var(--surface-2)',
          color: 'var(--white)',
          fontSize: 14,
          lineHeight: '1.45',
          wordBreak: 'break-word',
        }}
      >
        {message.content}
      </div>
    </div>
  )
}
