import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { AuthContext, RequireAuth, useAuth } from './context/AuthContext'
import NavBar from './components/NavBar'
import PushToast from './components/PushToast'
import PasswordGate from './views/PasswordGate'
import Auth from './views/Auth'
import Home from './views/Home'
import SpurChat from './views/SpurChat'
import Friends from './views/Friends'
import History from './views/History'
import Privacy from './views/Privacy'
import Terms from './views/Terms'
import About from './views/About'
import Admin from './views/Admin'

function AppRoutes() {
  const { authStatus } = useAuth()

  // Show splash while Supabase resolves the initial session from localStorage
  if (authStatus === 'initializing') return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 48, fontWeight: 800, color: 'var(--white)', margin: 0, letterSpacing: '-1px' }}>
        spur<span style={{ color: 'var(--blue)' }}>.</span>
      </h1>
    </div>
  )

  const isAuthed = localStorage.getItem('spur_authed') === 'true'

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={isAuthed ? <Navigate to="/auth" replace /> : <PasswordGate />}
        />
        <Route
          path="/auth"
          element={authStatus === 'ready' ? <Navigate to="/home" replace /> : <Auth />}
        />
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/spur/:id" element={<RequireAuth><SpurChat /></RequireAuth>} />
        <Route path="/friends" element={<RequireAuth><Friends /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
        <Route
          path="*"
          element={<Navigate to={authStatus === 'ready' ? '/home' : isAuthed ? '/auth' : '/'} replace />}
        />
      </Routes>
      <NavBar />
      <PushToast />
    </>
  )
}

export default function App() {
  const [authStatus, setAuthStatus] = useState('initializing')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!newSession) {
          setUser(null)
          setAuthStatus('unauthed')
          return
        }

        // Session exists — fetch profile with 3s timeout so we never hang forever
        try {
          const fetchProfile = supabase
            .from('users')
            .select('*')
            .eq('auth_uid', newSession.user.id)
            .single()
          const timer = new Promise((resolve) =>
            setTimeout(() => resolve({ data: null, error: { code: 'TIMEOUT' } }), 3000)
          )
          const { data, error } = await Promise.race([fetchProfile, timer])

          if (error && error.code !== 'PGRST116' && error.code !== 'TIMEOUT') {
            // Unexpected error — sign out so user isn't stuck in a broken state
            console.warn('[App] profile fetch error:', error.code, error.message)
            await supabase.auth.signOut()
            setUser(null)
            setAuthStatus('unauthed')
            return
          }

          if (data) {
            setUser(data)
            setAuthStatus('ready')
          } else {
            // No profile row (new user, post-wipe, or timeout) → name registration
            setAuthStatus('needs-profile')
          }
        } catch (err) {
          console.error('[App] unexpected error in auth handler:', err)
          setUser(null)
          setAuthStatus('unauthed')
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ authStatus, user, setUser, setAuthStatus }}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
