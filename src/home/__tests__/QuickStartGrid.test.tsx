import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { QuickStartGrid } from '../QuickStartGrid'

function ChatRouteDebug(): JSX.Element {
  const location = useLocation()
  return <div>{`Chat route ${location.search}`}</div>
}

function renderQuickStartWithRoutes(): void {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<QuickStartGrid />} />
        <Route path="/chat" element={<ChatRouteDebug />} />
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
    expect(screen.getByRole('button', { name: /Compliance Gap Analysis/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Control Effectiveness Review/i }),
    ).toBeInTheDocument()
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

  it.each([
    ['Risk Assessment', 'Run a risk assessment for my organization'],
    ['Compliance Gap Analysis', 'Analyze compliance gaps against our active frameworks'],
    ['Control Effectiveness Review', 'Review control effectiveness and attestation health'],
    ['DR Readiness', 'Assess our disaster recovery readiness'],
  ])(
    'navigates to chat with draft param when %s is clicked',
    (cardTitle: string, draftMessage: string): void => {
      renderQuickStartWithRoutes()

      fireEvent.click(screen.getByRole('button', { name: new RegExp(cardTitle, 'i') }))

      expect(
        screen.getByText(`Chat route ?draft=${encodeURIComponent(draftMessage)}`),
      ).toBeInTheDocument()
    },
  )
})
