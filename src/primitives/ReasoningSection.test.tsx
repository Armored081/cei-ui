import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ReasoningSection } from './ReasoningSection'

describe('ReasoningSection', (): void => {
  it('expands and collapses reasoning content', (): void => {
    render(<ReasoningSection reasoning="Initial analysis supports this recommendation." />)

    expect(
      screen.queryByText('Initial analysis supports this recommendation.'),
    ).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: 'Why this recommendation?' })
    fireEvent.click(toggle)

    expect(screen.getByText('Initial analysis supports this recommendation.')).toBeInTheDocument()

    fireEvent.click(toggle)

    expect(
      screen.queryByText('Initial analysis supports this recommendation.'),
    ).not.toBeInTheDocument()
  })

  it('renders simple markdown formatting after expansion', (): void => {
    render(
      <ReasoningSection
        reasoning={
          '**Evidence** supports remediation.\n- Validate IAM logs\n- Confirm policy drift fixes'
        }
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Why this recommendation?' }))

    const evidenceText = screen.getByText('Evidence')
    expect(evidenceText.tagName).toBe('STRONG')
    expect(screen.getByText('Validate IAM logs')).toBeInTheDocument()
    expect(screen.getByText('Confirm policy drift fixes')).toBeInTheDocument()
  })
})
