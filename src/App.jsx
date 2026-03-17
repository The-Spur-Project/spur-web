import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { AuthContext, RequireAuth, useAuth } from './context/AuthContext'
import NavBar from './components/NavBar'
import PasswordGate from './views/PasswordGate'
import Auth from './views/Auth'
import Home from './views/Home'
import SpurChat from './views/SpurChat'
import Friends from './views/Friends'
import History from './views/History'
import Privacy from './views/Privacy'
import Terms from './views/Terms'
import About from './views/About'

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) return null

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
            session
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NavBar />
    </>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession)
        if (newSession) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('auth_uid', newSession.user.id)
            .single()
          setUser(data ?? null)
        } else {
          setUser(null)
        }
        setLoading(false)
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
