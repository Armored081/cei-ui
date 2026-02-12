import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Artifact } from '../../hooks/useChatEngine'
import { assessmentListArtifactDefinition } from './AssessmentListArtifact'

function buildAssessmentListArtifact(): Artifact {
  return {
    block: {
      kind: 'assessment-list',
      title: 'Assessment Portfolio',
      assessments: [
        {
          id: 'assess-1',
          name: 'SOC 2 Type II',
          framework: 'SOC 2',
          status: 'in-progress',
          score: 79.2,
          updatedAt: '2026-02-11T09:20:00.000Z',
        },
        {
          id: 'assess-2',
          name: 'NIST CSF Annual',
          framework: 'NIST CSF',
          status: 'complete',
          score: 93.2,
          updatedAt: '2026-02-10T13:00:00.000Z',
        },
        {
          id: 'assess-3',
          name: 'ISO 27001 Evidence Review',
          framework: 'ISO 27001',
          status: 'draft',
          score: 64.0,
          updatedAt: '2026-02-09T08:00:00.000Z',
        },
        {
          id: 'assess-4',
          name: 'PCI DSS Quarterly',
          framework: 'PCI DSS',
          status: 'approved',
          score: 88.1,
          updatedAt: '2026-02-12T04:15:00.000Z',
        },
      ],
    },
    id: 'artifact-assessment-list',
    kind: 'assessment-list',
    segmentIndex: 2,
    sourceMessageId: 'agent-message-1',
    title: 'Assessment Portfolio',
  }
}

function firstDataRow(): HTMLElement {
  const rows = screen.getAllByRole('button', { name: /Select assessment/i })
  const firstRow = rows[0]

  if (!firstRow) {
    throw new Error('Expected at least one data row in the assessment table')
  }

  return firstRow
}

describe('assessmentListArtifactDefinition', (): void => {
  it('renders inline preview with first three rows', (): void => {
    render(<>{assessmentListArtifactDefinition.renderInline(buildAssessmentListArtifact())}</>)

    expect(screen.getByText('Assessment list')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Assessment list preview' })).toBeInTheDocument()
    expect(screen.getByText('SOC 2 Type II')).toBeInTheDocument()
    expect(screen.getByText('NIST CSF Annual')).toBeInTheDocument()
    expect(screen.getByText('ISO 27001 Evidence Review')).toBeInTheDocument()
    expect(screen.queryByText('PCI DSS Quarterly')).not.toBeInTheDocument()
  })

  it('renders expanded table with filtering, sorting, and row selection', (): void => {
    render(<>{assessmentListArtifactDefinition.renderExpanded(buildAssessmentListArtifact())}</>)

    expect(screen.getByRole('table', { name: 'Assessment list table' })).toBeInTheDocument()
    expect(screen.getByText('SOC 2 Type II')).toBeInTheDocument()
    expect(screen.getByText('PCI DSS Quarterly')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filter assessments'), { target: { value: 'NIST' } })
    expect(screen.getByText('NIST CSF Annual')).toBeInTheDocument()
    expect(screen.queryByText('SOC 2 Type II')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filter assessments'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Filter assessments by status'), {
      target: { value: 'complete' },
    })
    expect(screen.getByText('NIST CSF Annual')).toBeInTheDocument()
    expect(screen.queryByText('PCI DSS Quarterly')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filter assessments by status'), {
      target: { value: 'all' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Score' }))
    expect(firstDataRow()).toHaveTextContent('ISO 27001 Evidence Review')

    fireEvent.click(screen.getByRole('button', { name: 'Score' }))
    expect(firstDataRow()).toHaveTextContent('NIST CSF Annual')

    fireEvent.click(screen.getByRole('button', { name: 'Select assessment SOC 2 Type II' }))
    expect(screen.getByText(/Selected assessment:/)).toHaveTextContent('SOC 2 Type II')
  })

  it('renders full-screen view with the same filter controls', (): void => {
    render(<>{assessmentListArtifactDefinition.renderFullScreen(buildAssessmentListArtifact())}</>)

    expect(screen.getByLabelText('Filter assessments')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter assessments by status')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filter assessments by status'), {
      target: { value: 'approved' },
    })

    expect(screen.getByText('PCI DSS Quarterly')).toBeInTheDocument()
    expect(screen.queryByText('SOC 2 Type II')).not.toBeInTheDocument()
  })
})
