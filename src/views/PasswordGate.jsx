import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { cn } from '../lib/cn'

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
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-6">
        <div className="flex flex-col items-center gap-2">
          <h1 className="m-0 font-['Plus_Jakarta_Sans',sans-serif] text-[52px] font-extrabold tracking-[-1px] text-(--white)">
            spur<span className="text-(--blue)">.</span>
          </h1>
          <p className="m-0 text-[14px] text-(--muted)">spontaneous meetups for college</p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full max-w-[320px] flex-col gap-3">
          <input
            type="password"
            placeholder="Beta password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            autoFocus
            className={cn(
              'box-border w-full rounded-[14px] px-4 py-[15px] text-[16px] text-(--white) outline-none',
              error ? 'border-[1.5px] border-[#ef4444] bg-(--surface)' : 'border-[1.5px] border-(--border) bg-(--surface)',
              shaking && 'animate-shake',
            )}
          />
          {error && (
            <span className="-mt-1 text-[13px] text-[#ef4444]">Incorrect password</span>
          )}
          <button
            type="submit"
            className="rounded-[14px] border-none bg-(--blue) py-[15px] text-[16px] font-semibold text-white"
          >
            Enter
          </button>
        </form>
      </div>

      <div
        className="fixed right-0 bottom-0 left-0 flex justify-center gap-6 border-t border-(--border) bg-(--bg) px-6 pt-4"
        style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
      >
        {[
          { to: '/about', label: 'About' },
          { to: '/privacy', label: 'Privacy' },
          { to: '/terms', label: 'Terms' },
        ].map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="text-[13px] text-(--muted) no-underline"
          >
            {label}
          </Link>
        ))}
      </div>
    </>
  )
}
