import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AssessmentSummary } from '../assessment/types'
import { AssessmentListPage } from './AssessmentListPage'

const { mockFetchAssessments } = vi.hoisted(
  (): {
    mockFetchAssessments: ReturnType<typeof vi.fn>
  } => ({
    mockFetchAssessments: vi.fn(),
  }),
)

vi.mock('../assessment/client', (): { fetchAssessments: typeof mockFetchAssessments } => ({
  fetchAssessments: mockFetchAssessments,
}))

const baseAssessments: AssessmentSummary[] = [
  {
    id: 'assessment-1',
    regulationId: 'DSGVO-30',
    regulationName: 'GDPR Article 30 Assessment',
    jurisdiction: 'DE',
    status: 'complete',
    createdAt: '2026-02-01T10:15:00.000Z',
    totalMappings: 120,
    mappedCount: 95,
    partialCount: 16,
    gapCount: 9,
    avgConfidence: 0.84,
  },
  {
    id: 'assessment-2',
    regulationId: 'NIS2-12',
    regulationName: 'NIS2 Operations Review',
    jurisdiction: 'EU',
    status: 'approved',
    createdAt: '2026-01-28T09:00:00.000Z',
    totalMappings: 86,
    mappedCount: 58,
    partialCount: 20,
    gapCount: 8,
    avgConfidence: 0.77,
  },
]

beforeEach((): void => {
  mockFetchAssessments.mockReset()
})

describe('AssessmentListPage', (): void => {
  it('renders assessment rows with status badges', async (): Promise<void> => {
    mockFetchAssessments.mockResolvedValue(baseAssessments)

    render(
      <MemoryRouter initialEntries={['/assessments']}>
        <Routes>
          <Route element={<AssessmentListPage />} path="/assessments" />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Loading assessments...')

    expect(await screen.findByText('GDPR Article 30 Assessment')).toBeInTheDocument()
    expect(screen.getByText('NIS2 Operations Review')).toBeInTheDocument()
    expect(screen.getByText('Complete')).toHaveClass('cei-assessment-status-complete')
    expect(screen.getByText('Approved')).toHaveClass('cei-assessment-status-approved')
    expect(screen.getByText('Mapped 95 | Partial 16 | Gap 9')).toBeInTheDocument()
  })

  it('navigates to detail route when a row is clicked', async (): Promise<void> => {
    mockFetchAssessments.mockResolvedValue(baseAssessments)

    render(
      <MemoryRouter initialEntries={['/assessments']}>
        <Routes>
          <Route element={<AssessmentListPage />} path="/assessments" />
          <Route element={<div>Assessment detail route</div>} path="/assessments/:id" />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('GDPR Article 30 Assessment')

    fireEvent.click(
      screen.getByRole('button', { name: 'Open assessment GDPR Article 30 Assessment' }),
    )

    await waitFor((): void => {
      expect(screen.getByText('Assessment detail route')).toBeInTheDocument()
    })
  })
})
