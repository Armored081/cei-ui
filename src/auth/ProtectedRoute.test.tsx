import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { ProtectedRoute } from './ProtectedRoute'

const { mockUseAuth } = vi.hoisted(
  (): {
    mockUseAuth: ReturnType<typeof vi.fn>
  } => ({
    mockUseAuth: vi.fn(),
  }),
)

vi.mock('./AuthProvider', (): { useAuth: typeof mockUseAuth } => ({
  useAuth: mockUseAuth,
}))

beforeEach((): void => {
  mockUseAuth.mockReset()
})

describe('ProtectedRoute', (): void => {
  it('renders a loading indicator while auth state resolves', (): void => {
    mockUseAuth.mockReturnValue({ status: 'loading' })

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Private area</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )

    expect(screen.getByText('Checking authentication...')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to login', (): void => {
    mockUseAuth.mockReturnValue({ status: 'unauthenticated' })

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            element={
              <ProtectedRoute>
                <div>Private area</div>
              </ProtectedRoute>
            }
            path="/"
          />
          <Route element={<div>Login page</div>} path="/login" />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders children for authenticated users', (): void => {
    mockUseAuth.mockReturnValue({ status: 'authenticated' })

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Private area</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )

    expect(screen.getByText('Private area')).toBeInTheDocument()
  })
})
