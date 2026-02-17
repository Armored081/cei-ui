import { useNavigate } from 'react-router-dom'

import { ConfidenceBadge } from '../primitives/ConfidenceBadge'
import type { HomeAgenticItem } from './mockFeedData'

interface AttentionSectionProps {
  items: HomeAgenticItem[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

/**
 * Renders a severity dot class for attention cards.
 */
function severityClassName(severity: HomeAgenticItem['severity']): string {
  return severity === 'red' ? 'cei-home-severity-dot-red' : 'cei-home-severity-dot-amber'
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

  return (
    <section className="cei-home-section" aria-labelledby="cei-home-attention-title">
      <h2 className="cei-home-section-title" id="cei-home-attention-title">
        Attention Needed
      </h2>

      {loading ? (
        <p className="cei-home-empty-state">Loading...</p>
      ) : error ? (
        <div className="cei-home-status-state">
          <p className="cei-home-empty-state" role="alert">
            {error}
          </p>
          <button className="cei-home-retry-button" onClick={onRetry} type="button">
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="cei-home-empty-state">All clear — no urgent items right now</p>
      ) : (
        <div className="cei-home-attention-grid">
          {items.map(
            (item): JSX.Element => (
              <button
                className="cei-home-card cei-home-attention-card"
                key={item.id}
                onClick={(): void => onOpenItem(item)}
                type="button"
              >
                <div className="cei-home-attention-header">
                  <div className="cei-home-attention-title-wrap">
                    <span
                      aria-hidden="true"
                      className={`cei-home-severity-dot ${severityClassName(item.severity)}`}
                    />
                    <h3 className="cei-home-card-title">{item.title}</h3>
                  </div>
                  <ConfidenceBadge confidence={item.confidence} />
                </div>
                <p className="cei-home-card-summary">{item.summary}</p>
              </button>
            ),
          )}
        </div>
      )}
    </section>
  )
}
