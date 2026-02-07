import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ChatMessageList, type ChatTimelineItem } from './ChatMessageList'

describe('ChatMessageList', (): void => {
  it('renders mixed text and structured block segments inline for agent messages', (): void => {
    const items: ChatTimelineItem[] = [
      {
        errorText: '',
        id: 'agent-1',
        isStreaming: false,
        role: 'agent',
        segments: [
          { content: 'Summary:\n', type: 'text' },
          {
            block: {
              kind: 'table',
              title: 'Findings Table',
              columns: ['control', 'status'],
              rows: [{ control: 'MFA', status: 'missing' }],
            },
            type: 'block',
          },
          { content: '\nApply the recommendation below.', type: 'text' },
          {
            block: {
              kind: 'recommendation',
              severity: 'high',
              title: 'Enable MFA',
              body: 'Enable MFA for all admin accounts.',
            },
            type: 'block',
          },
        ],
        tools: [],
        type: 'message',
      },
    ]

    const listRef = createRef<HTMLDivElement>()

    render(
      <ChatMessageList
        items={items}
        listRef={listRef}
        onScroll={(): void => {}}
        onToggleTool={(): void => {}}
      />,
    )

    const contentContainer = document.querySelector('.cei-message-content')

    if (!contentContainer) {
      throw new Error('message content container not found')
    }

    const segmentNodes = Array.from(contentContainer.children)

    expect(segmentNodes[0].textContent).toContain('Summary:')
    expect(segmentNodes[1].textContent).toContain('Findings Table')
    expect(segmentNodes[2].textContent).toContain('Apply the recommendation below.')
    expect(segmentNodes[3].textContent).toContain('Enable MFA')

    expect(screen.getByText('Findings Table')).toBeInTheDocument()
    expect(screen.getByText('Enable MFA')).toBeInTheDocument()
    expect(screen.getByText('Enable MFA for all admin accounts.')).toBeInTheDocument()
  })
})
