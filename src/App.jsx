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
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/home" element={<Home />} />
        <Route path="/spur/:id" element={<SpurChat />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/history" element={<History />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
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

        // Session exists — fetch profile, retrying on transient lock conflicts
        const fetchProfile = async (attempt = 0) => {
          try {
            const dbFetch = supabase
              .from('users')
              .select('*')
              .eq('auth_uid', newSession.user.id)
              .single()
            const timer = new Promise((resolve) =>
              setTimeout(() => resolve({ data: null, error: { code: 'TIMEOUT' } }), 3000)
            )
            const { data, error } = await Promise.race([dbFetch, timer])

            if (error?.name === 'AbortError' && attempt < 3) {
              // Transient IndexedDB lock conflict — wait for locks to clear and retry
              await new Promise((r) => setTimeout(r, 400))
              return fetchProfile(attempt + 1)
            }

            if (error && error.code !== 'PGRST116' && error.code !== 'TIMEOUT') {
              // Genuine unexpected error — leave as needs-profile so user can register
              console.warn('[App] profile fetch error:', error.code, error.message)
              setAuthStatus('needs-profile')
              return
            }

            if (data) {
              setUser(data)
              setAuthStatus('ready')
            } else {
              setAuthStatus('needs-profile')
            }
          } catch (err) {
            if (err.name === 'AbortError' && attempt < 3) {
              await new Promise((r) => setTimeout(r, 400))
              return fetchProfile(attempt + 1)
            }
            console.error('[App] profile fetch failed after retries:', err)
            setAuthStatus('needs-profile')
          }
        }
        fetchProfile()
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
