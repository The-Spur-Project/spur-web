import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Users, Clock, LogOut, Sun, Moon } from 'lucide-react'
import { cn } from '../lib/cn'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { path: '/home', label: 'Home', Icon: Home },
  { path: '/friends', label: 'Friends', Icon: Users },
  { path: '/history', label: 'History', Icon: Clock },
]

const HIDDEN_PATHS = ['/', '/auth', '/privacy', '/terms', '/about']

export default function NavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setUser, setAuthStatus } = useAuth()
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('spur_theme')
    return saved ? saved === 'dark' : true
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('spur_theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const pathname = location.pathname
  const isHidden =
    HIDDEN_PATHS.includes(pathname) || pathname.startsWith('/spur/')

  if (isHidden) return null

  async function handleLogout() {
    setUser(null)
    setAuthStatus('unauthed')
    navigate('/auth', { replace: true })
    await supabase.auth.signOut()
  }

  return (
    <>
      {/* Logout confirmation sheet */}
      {confirmingLogout && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setConfirmingLogout(false)}
            className="fixed inset-0 z-[98]"
          />
          <div
            className="fixed left-1/2 z-[99] flex w-[calc(100%-32px)] max-w-[448px] -translate-x-1/2 flex-col gap-3 rounded-2xl border border-(--border) bg-(--surface) px-4 pb-3 pt-4 shadow-nav bottom-[calc(64px+env(safe-area-inset-bottom))]"
          >
            <p className="text-center text-[15px] font-semibold text-(--white)">
              Log out of spur?
            </p>
            <p className="text-center text-[13px] text-(--muted)">
              You'll need to verify your phone number to get back in.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingLogout(false)}
                className="flex-1 cursor-pointer rounded-xl border border-(--border) bg-(--surface-2) py-3 text-sm font-medium text-(--white)"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 cursor-pointer rounded-xl bg-(--red) py-3 text-sm font-semibold text-white"
              >
                Log out
              </button>
            </div>
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-1/2 z-[100] flex w-full max-w-[480px] -translate-x-1/2 items-center justify-around border-t border-(--border) bg-(--surface) pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5">
        {TABS.map((tab) => {
          const active = pathname === tab.path
          const IconComponent = tab.Icon
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-[3px] border-none bg-transparent px-4 py-1',
                active ? 'text-(--blue-light)' : 'text-(--muted)',
              )}
            >
              <IconComponent size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span className={cn('text-[11px]', active ? 'font-medium' : 'font-normal')}>
                {tab.label}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setIsDark((d) => !d)}
          className="flex cursor-pointer flex-col items-center gap-[3px] border-none bg-transparent px-4 py-1 text-(--muted)"
        >
          {isDark ? <Sun size={22} strokeWidth={1.8} /> : <Moon size={22} strokeWidth={1.8} />}
          <span className="text-[11px]">{isDark ? 'Light' : 'Dark'}</span>
        </button>
        <button
          type="button"
          onClick={() => setConfirmingLogout(true)}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-[3px] border-none bg-transparent px-4 py-1',
            confirmingLogout ? 'text-(--red)' : 'text-(--muted)',
          )}
        >
          <LogOut size={22} strokeWidth={1.8} />
          <span className="text-[11px]">Log out</span>
        </button>
      </nav>
    </>
  )
}
