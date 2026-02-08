import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmationModal } from './ConfirmationModal'

function ModalHarness(): JSX.Element {
  const [value, setValue] = useState<string>('')

  return (
    <ConfirmationModal
      confirmLabel="Approve"
      confirmVariant="success"
      input={{
        label: 'Approved by',
        onChange: setValue,
        placeholder: 'Enter name',
        required: true,
        value,
      }}
      isOpen
      message="Confirm approval for this assessment."
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
      title="Approve Assessment"
    />
  )
}

describe('ConfirmationModal', (): void => {
  it('renders title, message, and details when open', (): void => {
    render(
      <ConfirmationModal
        details={['Mapped: 12', 'Gap: 3']}
        isOpen
        message="Please review summary metrics before proceeding."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        title="Approve Assessment"
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Approve Assessment')).toBeInTheDocument()
    expect(screen.getByText('Please review summary metrics before proceeding.')).toBeInTheDocument()
    expect(screen.getByText('Mapped: 12')).toBeInTheDocument()
    expect(screen.getByText('Gap: 3')).toBeInTheDocument()
  })

  it('handles keyboard events for Escape and focus trap', (): void => {
    const onCancel = vi.fn()

    render(
      <ConfirmationModal
        confirmLabel="Approve"
        input={{
          label: 'Approved by',
          onChange: vi.fn(),
          required: true,
          value: 'Alex',
        }}
        isOpen
        message="Confirm approval for this assessment."
        onCancel={onCancel}
        onConfirm={vi.fn()}
        title="Approve Assessment"
      />,
    )

    const input = screen.getByLabelText('Approved by')
    const approveButton = screen.getByRole('button', { name: 'Approve' })

    expect(input).toHaveFocus()

    approveButton.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(input).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('enforces required input before confirm', (): void => {
    render(<ModalHarness />)

    const confirmButton = screen.getByRole('button', { name: 'Approve' })
    const input = screen.getByLabelText('Approved by')

    expect(confirmButton).toBeDisabled()

    fireEvent.change(input, { target: { value: 'Taylor Reviewer' } })

    expect(confirmButton).toBeEnabled()
  })
})
