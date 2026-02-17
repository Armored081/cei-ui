import { useNavigate } from 'react-router-dom'

import { ConfidenceBadge } from '../primitives/ConfidenceBadge'
import type { HomeAgenticItem } from './mockFeedData'

interface AttentionSectionProps {
  items: HomeAgenticItem[]
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
export function AttentionSection({ items }: AttentionSectionProps): JSX.Element {
  const navigate = useNavigate()

  return (
    <section className="cei-home-section" aria-labelledby="cei-home-attention-title">
      <h2 className="cei-home-section-title" id="cei-home-attention-title">
        Attention Needed
      </h2>

      {items.length === 0 ? (
        <p className="cei-home-empty-state">All clear — no urgent items right now</p>
      ) : (
        <div className="cei-home-attention-grid">
          {items.map(
            (item): JSX.Element => (
              <button
                className="cei-home-card cei-home-attention-card"
                key={item.id}
                onClick={(): void => navigate('/chat')}
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
