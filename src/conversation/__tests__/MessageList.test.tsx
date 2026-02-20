import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ChatTimelineItem } from '../../types/chat.js'
import type { EntityType } from '../../types/entity.js'
import { MessageList } from '../MessageList.js'

function buildItems(text: string): ChatTimelineItem[] {
  return [
    {
      canRetry: false,
      errorText: '',
      id: 'agent-1',
      isStreaming: false,
      role: 'agent',
      segments: [{ type: 'text', content: text }],
      tools: [],
      type: 'message',
    },
  ]
}

function renderMessageList(
  items: ChatTimelineItem[],
  onEntityClick?: (entityRef: { type: EntityType; id: string; name: string }) => void,
): void {
  render(
    <MessageList
      items={items}
      listRef={createRef<HTMLDivElement>()}
      onEntityClick={onEntityClick}
      onScroll={vi.fn()}
      onToggleTool={vi.fn()}
    />,
  )
}

describe('MessageList entity integration', (): void => {
  it('renders entity notation in text segments as chips', (): void => {
    renderMessageList(
      buildItems('Use [[entity:control:AC-2|Account Management]] to enforce onboarding.'),
    )

    expect(screen.getByRole('button', { name: 'Account Management' })).toBeInTheDocument()
  })

  it('invokes onEntityClick when chip is clicked', (): void => {
    const onEntityClick = vi.fn()

    renderMessageList(
      buildItems('Track [[entity:risk:RS-042|Privileged Access Abuse]] urgently.'),
      onEntityClick,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Privileged Access Abuse' }))

    expect(onEntityClick).toHaveBeenCalledTimes(1)
    expect(onEntityClick).toHaveBeenCalledWith({
      type: 'risk',
      id: 'RS-042',
      name: 'Privileged Access Abuse',
    })
  })

  it('renders plain text unchanged when no entity notation exists', (): void => {
    renderMessageList(buildItems('No entities in this sentence.'))

    expect(screen.getByText('No entities in this sentence.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders multiple entity chips from a single text segment', (): void => {
    renderMessageList(
      buildItems(
        'Map [[entity:framework:NIST-800-53|NIST 800-53]] to [[entity:policy:POL-12|Password Policy]].',
      ),
    )

    expect(screen.getByRole('button', { name: 'NIST 800-53' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Password Policy' })).toBeInTheDocument()
  })
})
