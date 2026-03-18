import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Users, Clock, LogOut } from 'lucide-react'
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
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 0 calc(10px + env(safe-area-inset-bottom))',
        zIndex: 100,
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.path
        const IconComponent = tab.Icon
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 16px',
              color: active ? 'var(--blue-light)' : 'var(--muted)',
            }}
          >
            <IconComponent size={22} strokeWidth={active ? 2.2 : 1.8} />
            <span style={{ fontSize: 11, fontWeight: active ? 500 : 400 }}>{tab.label}</span>
          </button>
        )
      })}
      <button
        onClick={handleLogout}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 16px',
          color: 'var(--muted)',
        }}
      >
        <LogOut size={22} strokeWidth={1.8} />
        <span style={{ fontSize: 11 }}>Log out</span>
      </button>
    </nav>
  )
}
