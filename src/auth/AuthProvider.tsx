import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  type GetCurrentUserOutput,
} from '@aws-amplify/auth'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import { configureAmplifyAuth } from './authConfig'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  getAccessToken: () => Promise<string>
  isConfigured: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  status: AuthStatus
  userEmail: string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function toUserEmail(user: GetCurrentUserOutput): string {
  const loginId = user.signInDetails?.loginId || ''
  return loginId || user.username
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown authentication error'
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [userEmail, setUserEmail] = useState<string>('')
  const [isConfigured, setIsConfigured] = useState<boolean>(false)

  useEffect((): (() => void) => {
    let cancelled = false

    const bootstrapAuth = async (): Promise<void> => {
      const configured = configureAmplifyAuth()

      if (cancelled) {
        return
      }

      setIsConfigured(configured)

      if (!configured) {
        setStatus('unauthenticated')
        return
      }

      try {
        const currentUser = await getCurrentUser()

        if (cancelled) {
          return
        }

        setUserEmail(toUserEmail(currentUser))
        setStatus('authenticated')
      } catch {
        if (cancelled) {
          return
        }

        setUserEmail('')
        setStatus('unauthenticated')
      }
    }

    void bootstrapAuth()

    return (): void => {
      cancelled = true
    }
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    if (!isConfigured) {
      throw new Error('Missing Cognito environment variables in this runtime.')
    }

    const result = await signIn({ username: email, password })

    if (!result.isSignedIn) {
      throw new Error('Additional authentication challenges are not supported in this UI yet.')
    }

    const currentUser = await getCurrentUser()
    setUserEmail(toUserEmail(currentUser))
    setStatus('authenticated')
  }

  const logout = async (): Promise<void> => {
    if (!isConfigured) {
      setUserEmail('')
      setStatus('unauthenticated')
      return
    }

    try {
      await signOut()
    } finally {
      // Always transition to unauthenticated state, even if signOut fails
      setUserEmail('')
      setStatus('unauthenticated')
    }
  }

  const getAccessToken = async (): Promise<string> => {
    if (!isConfigured) {
      throw new Error('Auth is not configured. Set the required Cognito env vars.')
    }

    const session = await fetchAuthSession()
    const accessToken = session.tokens?.accessToken?.toString() || ''

    if (!accessToken) {
      throw new Error('No access token found. Please sign in again.')
    }

    return accessToken
  }

  const value: AuthContextValue = {
    getAccessToken,
    isConfigured,
    login,
    logout,
    status,
    userEmail,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return value
}

export function describeAuthError(error: unknown): string {
  return toErrorMessage(error)
}
