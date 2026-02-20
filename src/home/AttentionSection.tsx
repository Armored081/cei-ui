import { useNavigate } from 'react-router-dom'

import type { EntityChipClickRef } from '../entities/EntityChip.js'
import { StoryCardMini } from '../stories/StoryCardMini.js'
import type { StoryCard as ModernContextStoryCard } from '../types/modern-context.js'
import type { HomeAgenticItem } from './types'

interface AttentionSectionProps {
  items: HomeAgenticItem[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

function mapStorySeverity(
  severity: HomeAgenticItem['severity'],
): ModernContextStoryCard['severity'] {
  return severity === 'red' ? 'high' : 'medium'
}

function toStoryCard(item: HomeAgenticItem): ModernContextStoryCard {
  return {
    id: item.id,
    title: item.title,
    severity: mapStorySeverity(item.severity),
    narrative: item.summary,
    correlatedEntities: item.correlatedEntities || [],
    temporalWindow: item.temporalWindow,
  }
}

/**
 * Skeleton card shown while attention items are loading.
 */
function AttentionSkeleton(): JSX.Element {
  return (
    <div
      className="cei-home-card cei-home-attention-card cei-home-attention-card--skeleton"
      aria-hidden="true"
    >
      <div className="cei-skeleton cei-skeleton-title" />
      <div className="cei-skeleton cei-skeleton-text" />
    </div>
  )
}

/**
 * Renders prioritized agentic feed items that need user attention.
 */
export function AttentionSection({
  items,
  loading = false,
  error = null,
  onRetry,
}: AttentionSectionProps): JSX.Element {
  const navigate = useNavigate()

  const onOpenItem = (item: HomeAgenticItem): void => {
    const prompt = `Tell me more about: ${item.title}. ${item.summary}`
    navigate(`/chat?draft=${encodeURIComponent(prompt)}`)
  }

  const onOpenEntity = (entityRef: EntityChipClickRef): void => {
    const prompt = `Analyze recent activity for ${entityRef.name} (${entityRef.type})`
    navigate(
      `/chat?draft=${encodeURIComponent(prompt)}&entityId=${encodeURIComponent(
        entityRef.id,
      )}&entityType=${encodeURIComponent(entityRef.type)}`,
    )
  }

  return (
    <section className="cei-home-section" aria-labelledby="cei-home-attention-title">
      <h2 className="cei-home-section-title" id="cei-home-attention-title">
        Attention Required
      </h2>

      {loading ? (
        <div className="cei-home-attention-grid" aria-label="Attention loading">
          {[0, 1, 2].map(
            (index): JSX.Element => (
              <AttentionSkeleton key={`attention-skeleton-${index}`} />
            ),
          )}
        </div>
      ) : error ? (
        <div className="cei-home-attention-error" role="alert">
          <p>{error}</p>
          {onRetry ? (
            <button onClick={onRetry} className="cei-home-retry-btn" type="button">
              Try again
            </button>
          ) : null}
        </div>
      ) : items.length === 0 ? (
        <p className="cei-home-empty-state">All clear — no urgent items right now</p>
      ) : (
        <div className="cei-home-attention-grid">
          {items.map(
            (item): JSX.Element => (
              <div
                className="cei-home-attention-story"
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={(): void => onOpenItem(item)}
                onKeyDown={(event): void => {
                  if (event.key === 'Enter') {
                    onOpenItem(item)
                  }
                }}
              >
                <StoryCardMini onEntityClick={onOpenEntity} story={toStoryCard(item)} />
              </div>
            ),
          )}
        </div>
      )}
    </section>
  )
}
