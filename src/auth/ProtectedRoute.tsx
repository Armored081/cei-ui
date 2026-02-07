import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from './AuthProvider'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <main className="cei-auth-loading" role="status" aria-live="polite">
        <div className="cei-auth-loading-card">
          <span aria-hidden="true" className="cei-auth-loading-spinner" />
          <p className="cei-auth-loading-text">Checking authentication...</p>
        </div>
      </main>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate replace to="/login" />
  }

  return <>{children}</>
}
