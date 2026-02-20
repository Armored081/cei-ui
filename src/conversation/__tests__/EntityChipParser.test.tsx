import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import * as entityUtils from '../../entities/entityUtils.js'
import { EntityChipParser } from '../EntityChipParser.js'

describe('EntityChipParser', (): void => {
  it('renders plain text when no entities are present', (): void => {
    render(<EntityChipParser text="No entity references here." />)

    expect(screen.getByText('No entity references here.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders a single entity as a chip', (): void => {
    render(
      <EntityChipParser text="Review [[entity:control:AC-2|Account Management]] immediately." />,
    )

    expect(screen.getByRole('button', { name: 'Account Management' })).toBeInTheDocument()
  })

  it('renders multiple entities as chips with text between', (): void => {
    render(
      <EntityChipParser text="Use [[entity:policy:POL-1|Password Policy]] and [[entity:standard:STD-2|MFA Standard]]." />,
    )

    expect(screen.getByRole('button', { name: 'Password Policy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'MFA Standard' })).toBeInTheDocument()
    expect(
      screen.getByText((_, element): boolean => element?.textContent?.trim() === 'and'),
    ).toBeInTheDocument()
  })

  it('renders text before and after an entity', (): void => {
    const { container } = render(
      <EntityChipParser text="Before [[entity:risk:RS-042|Privileged Access Abuse]] after" />,
    )

    expect(container).toHaveTextContent('Before')
    expect(container).toHaveTextContent('after')
    expect(screen.getByRole('button', { name: 'Privileged Access Abuse' })).toBeInTheDocument()
  })

  it('memoizes parsing for unchanged text across re-renders', (): void => {
    const parseSpy = vi.spyOn(entityUtils, 'parseEntityNotations')
    const text = 'Track [[entity:framework:NIST-800-53|NIST 800-53]].'
    const { rerender } = render(<EntityChipParser text={text} />)

    expect(parseSpy).toHaveBeenCalledTimes(1)

    rerender(<EntityChipParser text={text} />)
    expect(parseSpy).toHaveBeenCalledTimes(1)

    rerender(<EntityChipParser text={`${text} Updated.`} />)
    expect(parseSpy).toHaveBeenCalledTimes(2)

    parseSpy.mockRestore()
  })

  it('propagates entity click payload', (): void => {
    const onEntityClick = vi.fn()

    render(
      <EntityChipParser
        onEntityClick={onEntityClick}
        text="Open [[entity:vendor:VEN-3|Cloud Provider]]."
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cloud Provider' }))

    expect(onEntityClick).toHaveBeenCalledTimes(1)
    expect(onEntityClick).toHaveBeenCalledWith({
      type: 'vendor',
      id: 'VEN-3',
      name: 'Cloud Provider',
    })
  })
})
