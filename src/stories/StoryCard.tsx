import { EntityChip } from '../entities/EntityChip.js'
import type { EntityType } from '../types/entity.js'
import type { StoryCard as ModernContextStoryCard } from '../types/modern-context.js'
import { StorySeverityBadge } from './StorySeverityBadge.js'
import { StoryTimeline } from './StoryTimeline.js'
import './story-cards.css'

/**
 * Story card component props.
 */
export interface StoryCardProps {
  story: ModernContextStoryCard
  onEntityClick?: (entityRef: { type: EntityType; id: string; name: string }) => void
}

function formatStoryTimestamp(temporalWindow: ModernContextStoryCard['temporalWindow']): string {
  if (!temporalWindow) {
    return 'Timestamp unavailable'
  }

  const startDate = new Date(
    temporalWindow.startDate.length === 10
      ? `${temporalWindow.startDate}T00:00:00Z`
      : temporalWindow.startDate,
  )
  const endDate = new Date(
    temporalWindow.endDate.length === 10
      ? `${temporalWindow.endDate}T00:00:00Z`
      : temporalWindow.endDate,
  )

  const formatDate = (date: Date, fallback: string): string => {
    if (Number.isNaN(date.getTime())) {
      return fallback
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  const formattedStartDate = formatDate(startDate, temporalWindow.startDate)
  const formattedEndDate = formatDate(endDate, temporalWindow.endDate)

  if (formattedStartDate === formattedEndDate) {
    return formattedEndDate
  }

  return `${formattedStartDate} - ${formattedEndDate}`
}

/**
 * Full story card layout for severity-tagged insights.
 */
export function StoryCard({ story, onEntityClick }: StoryCardProps): JSX.Element {
  const timestamp = formatStoryTimestamp(story.temporalWindow)

  return (
    <article className="cei-story-card" data-severity={story.severity}>
      <header className="cei-story-card-header">
        <h4 className="cei-story-card-title">{story.title}</h4>
        <StorySeverityBadge severity={story.severity} />
      </header>
      <p className="cei-story-card-description">{story.narrative}</p>
      <p className="cei-story-card-timestamp">{timestamp}</p>
      <StoryTimeline severity={story.severity} temporalWindow={story.temporalWindow} />
      <section className="cei-story-card-entities-wrap">
        <p className="cei-story-card-entities-label">Related entities</p>
        {story.correlatedEntities.length > 0 ? (
          <div className="cei-story-card-entities">
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
        ) : (
          <p className="cei-story-card-empty-entities">No related entities.</p>
        )}
      </section>
    </article>
  )
}
