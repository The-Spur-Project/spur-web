import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 32,
        }}
      >
        <h1
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 48,
            fontWeight: 800,
            margin: 0,
            color: 'var(--white)',
            letterSpacing: '-1px',
          }}
        >
          spur<span style={{ color: 'var(--blue)' }}>.</span>
        </h1>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            width: '100%',
            maxWidth: 320,
          }}
        >
          <input
            type="password"
            placeholder="Beta password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            autoFocus
            style={{
              background: 'var(--surface)',
              border: `1.5px solid ${error ? '#ef4444' : 'var(--border)'}`,
              borderRadius: 12,
              padding: '13px 16px',
              color: 'var(--white)',
              fontSize: 15,
              outline: 'none',
              animation: shaking ? 'shake 0.5s ease' : 'none',
            }}
          />
          {error && (
            <span style={{ fontSize: 13, color: '#ef4444', marginTop: -4 }}>
              Incorrect password
            </span>
          )}
          <button
            type="submit"
            style={{
              background: 'var(--blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '13px 0',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Enter
          </button>
        </form>
      </div>
    </>
  )
}
