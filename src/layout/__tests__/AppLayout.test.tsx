import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppLayout } from '../AppLayout'

const { mockUseAuth, mockLogout } = vi.hoisted(
  (): {
    mockUseAuth: ReturnType<typeof vi.fn>
    mockLogout: ReturnType<typeof vi.fn>
  } => ({
    mockUseAuth: vi.fn(),
    mockLogout: vi.fn(),
  }),
)

vi.mock('../../auth/AuthProvider', (): { useAuth: typeof mockUseAuth } => ({
  useAuth: mockUseAuth,
}))

function renderLayout(initialEntry = '/'): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<div>Home content</div>} />
          <Route path="chat" element={<div>Chat content</div>} />
          <Route path="metrics" element={<div>Metrics content</div>} />
          <Route path="operations" element={<div>Operations content</div>} />
          <Route path="roadmap" element={<div>Roadmap content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach((): void => {
  mockUseAuth.mockReset()
  mockLogout.mockReset()
  mockLogout.mockResolvedValue(undefined)

  mockUseAuth.mockReturnValue({
    getAccessToken: vi.fn(),
    isConfigured: true,
    login: vi.fn(),
    logout: mockLogout,
    status: 'authenticated',
    userEmail: 'analyst@example.com',
  })
})

describe('AppLayout', (): void => {
  it('renders sidebar links and nested outlet content', (): void => {
    renderLayout('/')

    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /chat/i })).toHaveAttribute('href', '/chat')
    expect(screen.getByRole('link', { name: /metrics/i })).toHaveAttribute('href', '/metrics')
    expect(screen.getByRole('link', { name: /operations/i })).toHaveAttribute('href', '/operations')
    expect(screen.getByRole('link', { name: /roadmap/i })).toHaveAttribute('href', '/roadmap')
    expect(screen.getByRole('link', { name: /admin/i })).toHaveAttribute('href', '/admin')
    expect(screen.getByText('Home content')).toBeInTheDocument()
  })

  it('marks the active sidebar link for the current route', (): void => {
    renderLayout('/operations')

    expect(screen.getByRole('link', { name: /operations/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByText('Operations content')).toBeInTheDocument()
  })

  it('shows the top bar on non-chat routes', (): void => {
    renderLayout('/metrics')

    expect(screen.getByRole('button', { name: 'Go to home' })).toBeInTheDocument()
    expect(screen.getByText('analyst@example.com')).toBeInTheDocument()
  })
})
