import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { TopBar } from './TopBar'

describe('TopBar', (): void => {
  it('navigates to home when the brand is clicked', (): void => {
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route
            path="/chat"
            element={<TopBar userEmail="analyst@example.com" onLogout={vi.fn()} />}
          />
          <Route path="/" element={<div>Home Route</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Go to home' }))

    expect(screen.getByText('Home Route')).toBeInTheDocument()
  })
})
