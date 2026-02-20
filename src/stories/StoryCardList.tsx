import type { EntityType } from '../types/entity.js'
import type { StoryCard as ModernContextStoryCard } from '../types/modern-context.js'
import { StoryCard } from './StoryCard.js'
import './story-cards.css'

/**
 * Story card list props.
 */
export interface StoryCardListProps {
  stories: ModernContextStoryCard[]
  onEntityClick?: (entityRef: { type: EntityType; id: string; name: string }) => void
}

/**
 * Vertical stack of story cards.
 */
export function StoryCardList({ stories, onEntityClick }: StoryCardListProps): JSX.Element {
  if (stories.length === 0) {
    return <p className="cei-story-card-list-empty">No story cards available.</p>
  }

  return (
    <section className="cei-story-card-list">
      {stories.map((story) => (
        <StoryCard key={story.id} onEntityClick={onEntityClick} story={story} />
      ))}
    </section>
  )
}
