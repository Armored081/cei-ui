import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StoryCardList } from '../StoryCardList.js'
import { buildStoryCard } from './storyTestData.js'

describe('StoryCardList', (): void => {
  it('renders empty message when list is empty', (): void => {
    render(<StoryCardList stories={[]} />)

    expect(screen.getByText('No story cards available.')).toBeInTheDocument()
  })

  it('renders all story cards in order', (): void => {
    const stories = [
      buildStoryCard({ id: 'story-a', title: 'Story A' }),
      buildStoryCard({ id: 'story-b', title: 'Story B' }),
    ]

    render(<StoryCardList stories={stories} />)

    expect(screen.getByText('Story A')).toBeInTheDocument()
    expect(screen.getByText('Story B')).toBeInTheDocument()
  })

  it('forwards entity click handlers to nested cards', (): void => {
    const onEntityClick = vi.fn()

    render(<StoryCardList onEntityClick={onEntityClick} stories={[buildStoryCard()]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Credential Abuse Risk' }))

    expect(onEntityClick).toHaveBeenCalledTimes(1)
  })

  it('uses stable story ids as card keys by rendering unique cards', (): void => {
    const stories = [
      buildStoryCard({ id: 'story-1', title: 'Unique Story 1' }),
      buildStoryCard({ id: 'story-2', title: 'Unique Story 2' }),
      buildStoryCard({ id: 'story-3', title: 'Unique Story 3' }),
    ]

    render(<StoryCardList stories={stories} />)

    expect(screen.getByText('Unique Story 1')).toBeInTheDocument()
    expect(screen.getByText('Unique Story 2')).toBeInTheDocument()
    expect(screen.getByText('Unique Story 3')).toBeInTheDocument()
  })
})
