import { StoryCardList } from '../stories/StoryCardList.js'
import type { EntityType } from '../types/entity.js'
import type { StoryCard as ModernContextStoryCard } from '../types/modern-context.js'
import './story-card-inline.css'

/**
 * Inline story card renderer props.
 */
export interface StoryCardInlineProps {
  storyCards: ModernContextStoryCard[]
  onEntityClick?: (entityRef: { type: EntityType; id: string; name: string }) => void
}

/**
 * Displays message-scoped story cards above assistant text content.
 */
export function StoryCardInline({
  storyCards,
  onEntityClick,
}: StoryCardInlineProps): JSX.Element | null {
  if (storyCards.length === 0) {
    return null
  }

  return (
    <section aria-label="Story insights" className="cei-story-card-inline">
      <p className="cei-story-card-inline-kicker">Story insights</p>
      <StoryCardList onEntityClick={onEntityClick} stories={storyCards} />
    </section>
  )
}
