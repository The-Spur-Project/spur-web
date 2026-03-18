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
    <div className="flex flex-1 items-center justify-center">
      <div className="h-7 w-7 rounded-full border-[3px] border-(--border) border-t-(--blue) animate-spin" />
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
