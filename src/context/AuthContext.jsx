/* eslint-disable react-refresh/only-export-components -- auth context + hook + RequireAuth are one logical unit */
import { createContext, useContext } from 'react'
import { Navigate } from 'react-router-dom'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
  if (!session) return <Navigate to="/auth" replace />
  return children
}
