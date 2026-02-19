import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AdminDashboard } from '../AdminDashboard'
import { AdminLayout } from '../AdminLayout'

function renderAdminLayout(): void {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<div>Overview content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminLayout', (): void => {
  it('renders the sidebar with admin navigation links', (): void => {
    renderAdminLayout()

    expect(screen.getByText('Administration')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Back' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /overview/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /integrations/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /feedback/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /roadmap/i })).not.toBeInTheDocument()
  })

  it('uses the expected admin route paths', (): void => {
    renderAdminLayout()

    expect(screen.getByRole('link', { name: '← Back' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute('href', '/admin')
    expect(screen.getByRole('link', { name: /integrations/i })).toHaveAttribute(
      'href',
      '/admin/integrations',
    )
    expect(screen.getByRole('link', { name: /feedback/i })).toHaveAttribute(
      'href',
      '/admin/feedback',
    )
  })
})

describe('AdminDashboard', (): void => {
  it('renders cards for integrations, feedback, and roadmap', (): void => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /integrations/i })).toHaveAttribute(
      'href',
      '/admin/integrations',
    )
    expect(screen.getByRole('link', { name: /feedback/i })).toHaveAttribute(
      'href',
      '/admin/feedback',
    )
    expect(screen.getByRole('link', { name: /roadmap/i })).toHaveAttribute('href', '/admin/roadmap')
  })
})
