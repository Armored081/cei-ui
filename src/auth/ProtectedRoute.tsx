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
      <main
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          color: 'var(--text-muted)',
        }}
      >
        Checking authentication...
      </main>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate replace to="/login" />
  }

  return <>{children}</>
}
