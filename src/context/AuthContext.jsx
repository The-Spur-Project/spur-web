/* eslint-disable react-refresh/only-export-components -- auth context + hook + RequireAuth are one logical unit */
import { createContext, useContext } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// authStatus values:
//   'initializing'  — Supabase hasn't resolved the initial session yet
//   'unauthed'      — no session; show phone entry
//   'needs-profile' — session valid but no public.users row; show name entry
//   'ready'         — session + profile confirmed; app is fully usable

export function RequireAuth({ children }) {
  const { authStatus } = useAuth()
  const location = useLocation()

  if (authStatus === 'initializing') return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  if (authStatus === 'unauthed') {
    const from = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth?step=phone&from=${from}`} replace />
  }

  if (authStatus === 'needs-profile') {
    const from = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth?step=name&from=${from}`} replace />
  }

  return children
}
