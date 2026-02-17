import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { QuickStartGrid } from '../QuickStartGrid'

function renderQuickStartWithRoutes(): void {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<QuickStartGrid />} />
        <Route path="/chat" element={<div>Chat route</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('QuickStartGrid', (): void => {
  it('renders section heading and all four quick start cards', (): void => {
    render(
      <MemoryRouter>
        <QuickStartGrid />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Quick Start' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Risk Assessment/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Compliance Gap/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Control Review/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /DR Readiness/i })).toBeInTheDocument()
  })

  it('renders all quick start descriptions', (): void => {
    render(
      <MemoryRouter>
        <QuickStartGrid />
      </MemoryRouter>,
    )

    expect(screen.getByText('Evaluate cyber risk posture against frameworks')).toBeInTheDocument()
    expect(screen.getByText('Identify regulatory gaps and remediation actions')).toBeInTheDocument()
    expect(screen.getByText('Assess control maturity and attestation health')).toBeInTheDocument()
    expect(screen.getByText('Assess disaster recovery readiness')).toBeInTheDocument()
  })

  it('renders exactly four quick start buttons', (): void => {
    render(
      <MemoryRouter>
        <QuickStartGrid />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it.each(['Risk Assessment', 'Compliance Gap', 'Control Review', 'DR Readiness'])(
    'navigates to chat when %s is clicked',
    (cardTitle: string): void => {
      renderQuickStartWithRoutes()

      fireEvent.click(screen.getByRole('button', { name: new RegExp(cardTitle, 'i') }))

      expect(screen.getByText('Chat route')).toBeInTheDocument()
    },
  )
})
