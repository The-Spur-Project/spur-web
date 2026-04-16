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
  return children
}
