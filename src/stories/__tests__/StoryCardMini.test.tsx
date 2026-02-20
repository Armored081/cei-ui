import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

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
})
