import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EntityChip } from '../EntityChip.js'
import { ENTITY_TYPE_CONFIG } from '../entityTypeConfig.js'

describe('EntityChip', (): void => {
  it('renders the configured icon and entity name', (): void => {
    render(<EntityChip id="AC-2" name="Account Management" type="control" />)

    const chip = screen.getByRole('button', { name: 'Account Management' })

    expect(chip).toHaveTextContent(ENTITY_TYPE_CONFIG.control.icon)
    expect(chip).toHaveTextContent('Account Management')
  })

  it('applies color custom property from type config', (): void => {
    render(<EntityChip id="RS-042" name="Privileged Access Abuse" type="risk" />)

    const chip = screen.getByRole('button', { name: 'Privileged Access Abuse' })
    expect(chip).toHaveStyle('--chip-color: var(--warning)')
  })

  it('fires click handler with entity reference payload', (): void => {
    const onClick = vi.fn()

    render(<EntityChip id="NIST-800-53" name="NIST 800-53" onClick={onClick} type="framework" />)

    fireEvent.click(screen.getByRole('button', { name: 'NIST 800-53' }))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith({
      type: 'framework',
      id: 'NIST-800-53',
      name: 'NIST 800-53',
    })
  })

  it('is keyboard focusable', (): void => {
    render(<EntityChip id="AC-2" name="Account Management" type="control" />)

    const chip = screen.getByRole('button', { name: 'Account Management' })
    chip.focus()

    expect(chip).toHaveFocus()
  })

  it('sets a tooltip with type label, name, and id', (): void => {
    render(<EntityChip id="AC-2" name="Account Management" type="control" />)

    expect(screen.getByRole('button', { name: 'Account Management' })).toHaveAttribute(
      'title',
      'Control: Account Management (AC-2)',
    )
  })
})
