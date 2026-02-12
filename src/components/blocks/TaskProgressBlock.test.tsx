import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TaskProgressBlock } from './TaskProgressBlock'

describe('TaskProgressBlock', (): void => {
  it('renders task progress counts and completion percent', (): void => {
    render(
      <TaskProgressBlock
        block={{
          taskName: 'Build remediation plan',
          totalSteps: 5,
          completedSteps: 3,
          currentStep: 'Drafting changes',
          steps: [
            { name: 'Collect evidence', status: 'complete' },
            { name: 'Analyze gaps', status: 'complete' },
            { name: 'Draft changes', status: 'active' },
            { name: 'Review impact', status: 'pending' },
            { name: 'Finalize', status: 'pending' },
          ],
        }}
      />,
    )

    expect(screen.getByText('Build remediation plan')).toBeInTheDocument()
    expect(screen.getByText('Drafting changes')).toBeInTheDocument()
    expect(screen.getByText('3/5')).toBeInTheDocument()

    const progressbar = screen.getByRole('progressbar', {
      name: 'Build remediation plan completion',
    })
    expect(progressbar).toHaveAttribute('aria-valuenow', '3')
    expect(progressbar).toHaveAttribute('aria-valuemax', '5')
  })

  it('renders checklist icons for complete, active, and pending steps', (): void => {
    render(
      <TaskProgressBlock
        block={{
          taskName: 'Investigate policy drift',
          totalSteps: 3,
          completedSteps: 1,
          currentStep: 'Comparing control baselines',
          steps: [
            { name: 'Load baseline', status: 'complete' },
            { name: 'Compare current state', status: 'active' },
            { name: 'Write summary', status: 'pending' },
          ],
        }}
      />,
    )

    expect(screen.getByText('\u2713')).toBeInTheDocument()
    expect(screen.getByText('\u25CF')).toBeInTheDocument()
    expect(screen.getByText('\u25CB')).toBeInTheDocument()
    expect(screen.getByText('Compare current state')).toBeInTheDocument()
  })
})
