import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StoryCardInline } from '../StoryCardInline.js'
import { MessageList } from '../MessageList.js'
import type { ChatTimelineItem } from '../../types/chat.js'
import type { StoryCard as ModernContextStoryCard } from '../../types/modern-context.js'

function buildStoryCard(overrides: Partial<ModernContextStoryCard> = {}): ModernContextStoryCard {
  return {
    id: 'story-inline-1',
    title: 'Suspicious lateral movement pattern',
    severity: 'high',
    narrative: 'Service account reuse was observed across isolated subnets.',
    correlatedEntities: [
      {
        type: 'risk',
        id: 'RISK-100',
        name: 'Lateral Movement Risk',
      },
    ],
    temporalWindow: {
      startDate: '2026-02-01',
      endDate: '2026-02-05',
    },
    ...overrides,
  }
}

function buildMessageWithStoryCards(
  storyCards: ModernContextStoryCard[],
  text = 'Assistant body text.',
): ChatTimelineItem[] {
  return [
    {
      canRetry: false,
      errorText: '',
      id: 'agent-inline-message',
      isStreaming: false,
      modernContext: {
        storyCards,
        entityGraph: {
          nodes: [],
          edges: [],
        },
        vizHints: [],
        pivotTargets: [],
      },
      role: 'agent',
      segments: [{ type: 'text', content: text }],
      tools: [],
      type: 'message',
    },
  ]
}

describe('StoryCardInline', (): void => {
  it('returns null when no story cards are provided', (): void => {
    const { container } = render(<StoryCardInline storyCards={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders story insight header and cards', (): void => {
    const story = buildStoryCard()

    render(<StoryCardInline storyCards={[story]} />)

    expect(screen.getByText('Story insights')).toBeInTheDocument()
    expect(screen.getByText(story.title)).toBeInTheDocument()
    expect(screen.getByText(story.narrative)).toBeInTheDocument()
  })

  it('forwards entity clicks to the callback', (): void => {
    const onEntityClick = vi.fn()

    render(<StoryCardInline onEntityClick={onEntityClick} storyCards={[buildStoryCard()]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Lateral Movement Risk' }))

    expect(onEntityClick).toHaveBeenCalledTimes(1)
    expect(onEntityClick).toHaveBeenCalledWith({
      type: 'risk',
      id: 'RISK-100',
      name: 'Lateral Movement Risk',
    })
  })
})

describe('MessageList story card integration', (): void => {
  it('renders inline story cards when modernContext.storyCards is present', (): void => {
    const story = buildStoryCard()
    render(
      <MessageList
        items={buildMessageWithStoryCards([story])}
        listRef={createRef<HTMLDivElement>()}
        onScroll={vi.fn()}
        onToggleTool={vi.fn()}
      />,
    )

    expect(screen.getByText(story.title)).toBeInTheDocument()
    expect(screen.getByText('Assistant body text.')).toBeInTheDocument()
  })

  it('renders story cards above message text within the bubble', (): void => {
    const story = buildStoryCard({
      title: 'Credential misuse chain',
    })
    render(
      <MessageList
        items={buildMessageWithStoryCards([story], 'Follow-up assistant analysis.')}
        listRef={createRef<HTMLDivElement>()}
        onScroll={vi.fn()}
        onToggleTool={vi.fn()}
      />,
    )

    const storyTitle = screen.getByText('Credential misuse chain')
    const messageText = screen.getByText('Follow-up assistant analysis.')
    const positionMask = storyTitle.compareDocumentPosition(messageText)

    expect(positionMask & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('does not render inline story cards when storyCards is empty', (): void => {
    render(
      <MessageList
        items={buildMessageWithStoryCards([], 'No story cards in this message.')}
        listRef={createRef<HTMLDivElement>()}
        onScroll={vi.fn()}
        onToggleTool={vi.fn()}
      />,
    )

    expect(screen.queryByText('Story insights')).not.toBeInTheDocument()
    expect(screen.getByText('No story cards in this message.')).toBeInTheDocument()
  })
})
