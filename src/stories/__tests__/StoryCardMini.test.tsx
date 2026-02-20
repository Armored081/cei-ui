import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StoryCardMini } from '../StoryCardMini.js'
import { buildStoryCard } from './storyTestData.js'

describe('StoryCardMini', (): void => {
  it('renders compact story title and severity', (): void => {
    const story = buildStoryCard({ title: 'Critical Access Pattern', severity: 'critical' })

    render(<StoryCardMini story={story} />)

    expect(screen.getByText('Critical Access Pattern')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('renders temporal window end date as compact timestamp', (): void => {
    render(<StoryCardMini story={buildStoryCard()} />)

    expect(screen.getByText('2026-01-16')).toBeInTheDocument()
  })

  it('renders entity count summary', (): void => {
    render(<StoryCardMini story={buildStoryCard()} />)

    expect(screen.getByText('2 related entities')).toBeInTheDocument()
  })

  it('renders entity chips for correlated entities', (): void => {
    render(<StoryCardMini story={buildStoryCard()} />)

    expect(screen.getByRole('button', { name: 'Credential Abuse Risk' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Account Management' })).toBeInTheDocument()
  })

  it('invokes onEntityClick when an entity chip is clicked', (): void => {
    const onEntityClick = vi.fn()
    render(<StoryCardMini onEntityClick={onEntityClick} story={buildStoryCard()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Credential Abuse Risk' }))

    expect(onEntityClick).toHaveBeenCalledWith({
      type: 'risk',
      id: 'RSK-1',
      name: 'Credential Abuse Risk',
    })
  })
})
