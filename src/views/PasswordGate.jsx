import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function PasswordGate() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [shaking, setShaking] = useState(false)
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    if (password === import.meta.env.VITE_BETA_PASSWORD) {
      localStorage.setItem('spur_authed', 'true')
      navigate('/auth')
    } else {
      setShaking(true)
      setError(true)
      setPassword('')
      setTimeout(() => setShaking(false), 500)
    }
  }

  return (
    <>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 52, fontWeight: 800, margin: 0, color: 'var(--white)', letterSpacing: '-1px' }}>
            spur<span style={{ color: 'var(--blue)' }}>.</span>
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>spontaneous meetups for college</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
          <input
            type="password"
            placeholder="Beta password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            autoFocus
            style={{
              background: 'var(--surface)',
              border: `1.5px solid ${error ? '#ef4444' : 'var(--border)'}`,
              borderRadius: 14,
              padding: '15px 16px',
              color: 'var(--white)',
              fontSize: 16,
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
              animation: shaking ? 'shake 0.5s ease' : 'none',
            }}
          />
          {error && (
            <span style={{ fontSize: 13, color: '#ef4444', marginTop: -4 }}>Incorrect password</span>
          )}
          <button
            type="submit"
            style={{
              background: 'var(--blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '15px 0',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Enter
          </button>
        </form>
      </div>

      {/* Footer nav */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        display: 'flex',
        justifyContent: 'center',
        gap: 24,
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        {[
          { to: '/about', label: 'About' },
          { to: '/privacy', label: 'Privacy' },
          { to: '/terms', label: 'Terms' },
        ].map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            style={{ color: 'var(--muted)', fontSize: 13, textDecoration: 'none' }}
          >
            {label}
          </Link>
        ))}
      </div>
    </>
  )
}
