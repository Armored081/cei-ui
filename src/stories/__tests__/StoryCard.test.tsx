import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StoryCard } from '../StoryCard.js'
import { buildStoryCard } from './storyTestData.js'

describe('StoryCard', (): void => {
  it('renders title, narrative, and severity badge', (): void => {
    const story = buildStoryCard({ severity: 'critical' })

    render(<StoryCard story={story} />)

    expect(screen.getByText(story.title)).toBeInTheDocument()
    expect(screen.getByText(story.narrative)).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('renders formatted timestamp range from temporal window', (): void => {
    render(<StoryCard story={buildStoryCard()} />)

    expect(screen.getByText('Jan 10, 2026 - Jan 16, 2026')).toBeInTheDocument()
  })

  it('renders fallback timestamp text when temporal window is missing', (): void => {
    render(
      <StoryCard
        story={buildStoryCard({
          temporalWindow: undefined,
        })}
      />,
    )

    expect(screen.getByText('Timestamp unavailable')).toBeInTheDocument()
  })

  it('renders correlated entities as chips', (): void => {
    const story = buildStoryCard()

    render(<StoryCard story={story} />)

    expect(screen.getByRole('button', { name: 'Credential Abuse Risk' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Account Management' })).toBeInTheDocument()
  })

  it('invokes entity click handler with entity payload', (): void => {
    const onEntityClick = vi.fn()
    const story = buildStoryCard()

    render(<StoryCard onEntityClick={onEntityClick} story={story} />)

    fireEvent.click(screen.getByRole('button', { name: 'Credential Abuse Risk' }))

    expect(onEntityClick).toHaveBeenCalledTimes(1)
    expect(onEntityClick).toHaveBeenCalledWith({
      type: 'risk',
      id: 'RSK-1',
      name: 'Credential Abuse Risk',
    })
  })

  it('renders no-entities hint when correlatedEntities is empty', (): void => {
    render(
      <StoryCard
        story={buildStoryCard({
          correlatedEntities: [],
        })}
      />,
    )

    expect(screen.getByText('No related entities.')).toBeInTheDocument()
  })
})
