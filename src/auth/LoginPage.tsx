import { useState, type CSSProperties, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'

import { SectionCard } from '../components/SectionCard'
import { describeAuthError, useAuth } from './AuthProvider'

export function LoginPage(): JSX.Element {
  const { isConfigured, login, status } = useAuth()
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await login(email, password)
    } catch (submitError) {
      setError(describeAuthError(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'authenticated') {
    return <Navigate replace to="/" />
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-6)',
      }}
    >
      <div style={{ width: 'min(460px, 100%)' }}>
        <SectionCard title="CEI Agent Login">
          <h1 style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>Sign in</h1>
          <p
            style={{
              marginTop: 0,
              marginBottom: 'var(--space-5)',
              color: 'var(--text-muted)',
            }}
          >
            Authenticate with Cognito to invoke the CEI agent stream endpoint.
          </p>

          {!isConfigured ? (
            <p style={{ color: 'var(--warning)' }}>
              Missing Cognito env vars. Set the required values in `.env`.
            </p>
          ) : null}

          {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <label htmlFor="email" style={{ display: 'grid', gap: 'var(--space-2)' }}>
              Email
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event): void => setEmail(event.target.value)}
                autoComplete="email"
                style={inputStyle}
              />
            </label>

            <label htmlFor="password" style={{ display: 'grid', gap: 'var(--space-2)' }}>
              Password
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event): void => setPassword(event.target.value)}
                autoComplete="current-password"
                style={inputStyle}
              />
            </label>

            <button disabled={!isConfigured || isSubmitting} type="submit" style={buttonStyle}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </SectionCard>
      </div>
    </main>
  )
}

const inputStyle: CSSProperties = {
  backgroundColor: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  padding: 'var(--space-3)',
}

const buttonStyle: CSSProperties = {
  backgroundColor: 'var(--accent)',
  border: 0,
  borderRadius: 'var(--radius-md)',
  color: 'var(--bg-primary)',
  cursor: 'pointer',
  fontWeight: 700,
  padding: 'var(--space-3) var(--space-4)',
}
