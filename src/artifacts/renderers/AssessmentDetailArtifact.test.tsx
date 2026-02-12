import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Artifact } from '../../hooks/useChatEngine'
import { assessmentDetailArtifactDefinition } from './AssessmentDetailArtifact'

function buildAssessmentDetailArtifact(): Artifact {
  return {
    block: {
      kind: 'assessment-detail',
      title: 'Assessment A-12',
      assessment: {
        id: 'assessment-a-12',
        name: 'SOC 2 Type II',
        framework: 'SOC 2',
        status: 'in-progress',
        score: 82.4,
        updatedAt: '2026-02-12T05:10:00.000Z',
        sections: [
          {
            name: 'Access Control',
            score: 86,
            controls: [
              {
                id: 'AC-1',
                description: 'Identity lifecycle process is defined',
                status: 'mapped',
              },
              {
                id: 'AC-2',
                description: 'Privileged access reviews are quarterly',
                status: 'partial',
                gap: 'Quarterly cadence is not documented for all systems.',
                recommendation: 'Document quarterly review evidence for all privileged groups.',
              },
            ],
          },
          {
            name: 'Incident Response',
            score: 74,
            controls: [
              {
                id: 'IR-1',
                description: 'Incident response runbooks are approved',
                status: 'gap',
                gap: 'Runbook approval is pending security leadership sign-off.',
                recommendation: 'Complete approval workflow and attach signed policy evidence.',
              },
            ],
          },
        ],
      },
    },
    id: 'artifact-assessment-detail',
    kind: 'assessment-detail',
    segmentIndex: 3,
    sourceMessageId: 'agent-message-2',
    title: 'Assessment A-12',
  }
}

describe('assessmentDetailArtifactDefinition', (): void => {
  it('renders inline summary cards', (): void => {
    render(<>{assessmentDetailArtifactDefinition.renderInline(buildAssessmentDetailArtifact())}</>)

    expect(screen.getByText('Assessment detail')).toBeInTheDocument()
    expect(screen.getByText('SOC 2 Type II')).toBeInTheDocument()
    expect(screen.getByText('SOC 2')).toBeInTheDocument()
    expect(screen.getByText('82.4')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })

  it('renders expanded section cards and supports control filtering/selection', (): void => {
    render(
      <>{assessmentDetailArtifactDefinition.renderExpanded(buildAssessmentDetailArtifact())}</>,
    )

    expect(screen.getByLabelText('Assessment sections')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Access Control' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Incident Response' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filter controls by status'), {
      target: { value: 'gap' },
    })
    expect(screen.getByText('IR-1')).toBeInTheDocument()
    expect(screen.queryByText('AC-1')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filter controls by status'), {
      target: { value: 'all' },
    })
    fireEvent.change(screen.getByLabelText('Filter controls by section'), {
      target: { value: 'Access Control' },
    })
    expect(screen.getByText('AC-1')).toBeInTheDocument()
    expect(screen.queryByText('IR-1')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filter controls'), { target: { value: 'AC-2' } })
    expect(screen.getByText('AC-2')).toBeInTheDocument()
    expect(screen.queryByText('AC-1')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Select control AC-2' }))
    expect(screen.getByText(/Selected control:/)).toHaveTextContent('AC-2')
    expect(
      screen.getByText('Gap: Quarterly cadence is not documented for all systems.'),
    ).toBeInTheDocument()
  })

  it('renders full-screen detail content with filterable controls', (): void => {
    render(
      <>{assessmentDetailArtifactDefinition.renderFullScreen(buildAssessmentDetailArtifact())}</>,
    )

    expect(screen.getByLabelText('Assessment controls')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Assessment controls table' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filter controls'), {
      target: { value: 'runbooks' },
    })

    expect(screen.getByText('IR-1')).toBeInTheDocument()
    expect(screen.queryByText('AC-1')).not.toBeInTheDocument()
  })
})
