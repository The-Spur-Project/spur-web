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
  const { session, user, loading } = useAuth()

  if (loading) return (
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
          element={
            isAuthed
              ? <Navigate to="/auth" replace />
              : <PasswordGate />
          }
        />
        <Route
          path="/auth"
          element={
            session && user
              ? <Navigate to="/home" replace />
              : <Auth />
          }
        />
        <Route
          path="/home"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route
          path="/spur/:id"
          element={
            <RequireAuth>
              <SpurChat />
            </RequireAuth>
          }
        />
        <Route
          path="/friends"
          element={
            <RequireAuth>
              <Friends />
            </RequireAuth>
          }
        />
        <Route
          path="/history"
          element={
            <RequireAuth>
              <History />
            </RequireAuth>
          }
        />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <Admin />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NavBar />
      <PushToast />
    </>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('[App] mounting, subscribing to auth state changes')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log('[App] onAuthStateChange event:', _event, 'session:', newSession ? `uid=${newSession.user.id}` : null)
        setSession(newSession)
        try {
          if (newSession) {
            console.log('[App] session exists, fetching public.users for auth_uid:', newSession.user.id)
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('auth_uid', newSession.user.id)
              .single()
            if (error) {
              console.warn('[App] public.users fetch error:', error.code, error.message)
            }
            console.log('[App] public.users result:', data ?? 'null (no profile row yet)')
            setUser(data ?? null)
          } else {
            console.log('[App] no session, clearing user')
            setUser(null)
          }
        } catch (err) {
          console.error('[App] unexpected error in auth handler:', err)
          setUser(null)
        } finally {
          console.log('[App] setLoading(false)')
          setLoading(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, user, setUser, loading }}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
