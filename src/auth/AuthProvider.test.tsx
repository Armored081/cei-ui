import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import type { JSX } from 'react'
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'

import { AuthProvider, useAuth } from './AuthProvider'

const {
  mockConfigureAmplifyAuth,
  mockFetchAuthSession,
  mockGetCurrentUser,
  mockSignIn,
  mockSignOut,
} = vi.hoisted(
  (): {
    mockConfigureAmplifyAuth: ReturnType<typeof vi.fn>
    mockFetchAuthSession: ReturnType<typeof vi.fn>
    mockGetCurrentUser: ReturnType<typeof vi.fn>
    mockSignIn: ReturnType<typeof vi.fn>
    mockSignOut: ReturnType<typeof vi.fn>
  } => ({
    mockConfigureAmplifyAuth: vi.fn(),
    mockFetchAuthSession: vi.fn(),
    mockGetCurrentUser: vi.fn(),
    mockSignIn: vi.fn(),
    mockSignOut: vi.fn(),
  }),
)

vi.mock('./authConfig', (): { configureAmplifyAuth: typeof mockConfigureAmplifyAuth } => ({
  configureAmplifyAuth: mockConfigureAmplifyAuth,
}))

vi.mock(
  '@aws-amplify/auth',
  (): {
    fetchAuthSession: typeof mockFetchAuthSession
    getCurrentUser: typeof mockGetCurrentUser
    signIn: typeof mockSignIn
    signOut: typeof mockSignOut
  } => ({
    fetchAuthSession: mockFetchAuthSession,
    getCurrentUser: mockGetCurrentUser,
    signIn: mockSignIn,
    signOut: mockSignOut,
  }),
)

function AuthProbe(): JSX.Element {
  const { login, status, userEmail } = useAuth()

  const triggerLogin = async (): Promise<void> => {
    await login('analyst@example.com', 'secret123')
  }

  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="email">{userEmail}</p>
      <button onClick={(): void => void triggerLogin()} type="button">
        Login
      </button>
    </div>
  )
}

afterEach((): void => {
  vi.restoreAllMocks()
})

beforeEach((): void => {
  mockConfigureAmplifyAuth.mockReset()
  mockGetCurrentUser.mockReset()
  mockSignIn.mockReset()
  mockSignOut.mockReset()
  mockFetchAuthSession.mockReset()

  mockConfigureAmplifyAuth.mockReturnValue(true)
})

describe('AuthProvider', (): void => {
  it('transitions from loading to authenticated when a user exists', async (): Promise<void> => {
    mockGetCurrentUser.mockResolvedValue({
      username: 'analyst@example.com',
      userId: 'user-1',
      signInDetails: { loginId: 'analyst@example.com' },
    })

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await waitFor((): void => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    })

    expect(screen.getByTestId('email')).toHaveTextContent('analyst@example.com')
  })

  it('transitions from loading to unauthenticated when no user exists', async (): Promise<void> => {
    mockGetCurrentUser.mockRejectedValue(new Error('not signed in'))

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await waitFor((): void => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    })
  })

  it('transitions to authenticated after login succeeds', async (): Promise<void> => {
    mockGetCurrentUser.mockRejectedValueOnce(new Error('not signed in')).mockResolvedValueOnce({
      username: 'analyst@example.com',
      userId: 'user-1',
      signInDetails: { loginId: 'analyst@example.com' },
    })
    mockSignIn.mockResolvedValue({ isSignedIn: true })

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await waitFor((): void => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor((): void => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    })

    expect(mockSignIn).toHaveBeenCalledWith({
      username: 'analyst@example.com',
      password: 'secret123',
    })
  })
})
