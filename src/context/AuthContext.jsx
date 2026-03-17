/* eslint-disable react-refresh/only-export-components -- auth context + hook + RequireAuth are one logical unit */
import { createContext, useContext } from 'react'
import { Navigate } from 'react-router-dom'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/auth" replace />
  return children
}
