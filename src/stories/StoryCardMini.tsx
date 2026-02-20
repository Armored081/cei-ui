import { EntityChip, type EntityChipClickRef } from '../entities/EntityChip.js'
import type { StoryCard as ModernContextStoryCard } from '../types/modern-context.js'
import { StorySeverityBadge } from './StorySeverityBadge.js'
import './story-cards.css'

/**
 * Story mini card props for compact dashboard displays.
 */
export interface StoryCardMiniProps {
  story: ModernContextStoryCard
  onEntityClick?: (entityRef: EntityChipClickRef) => void
}

function formatMiniTimestamp(temporalWindow: ModernContextStoryCard['temporalWindow']): string {
  if (!temporalWindow) {
    return 'No timestamp'
  }

  return temporalWindow.endDate || temporalWindow.startDate
}

/**
 * Compact story card view.
 */
export function StoryCardMini({ story, onEntityClick }: StoryCardMiniProps): JSX.Element {
  const relatedEntityCount = story.correlatedEntities.length

  return (
    <article className="cei-story-card-mini" data-severity={story.severity}>
      <header className="cei-story-card-mini-header">
        <p className="cei-story-card-mini-title">{story.title}</p>
        <StorySeverityBadge severity={story.severity} />
      </header>
      <p className="cei-story-card-mini-meta">{formatMiniTimestamp(story.temporalWindow)}</p>
      <p className="cei-story-card-mini-meta">
        {relatedEntityCount.toString()} related {relatedEntityCount === 1 ? 'entity' : 'entities'}
      </p>
      {relatedEntityCount > 0 ? (
        <div className="cei-story-card-mini-entities">
          {story.correlatedEntities.map((entity) => (
            <EntityChip
              id={entity.id}
              key={`${entity.type}:${entity.id}`}
              name={entity.name}
              onClick={onEntityClick}
              type={entity.type}
            />
          ))}
        </div>
      ) : null}
    </article>
  )
}
