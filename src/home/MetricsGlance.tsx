import { useNavigate } from 'react-router-dom'

import type { HomeMetricItem, HomeMetricThreshold } from './mockFeedData'

interface MetricsGlanceProps {
  items: HomeMetricItem[]
}

type TrendDirection = 'up' | 'down' | 'flat'
type MetricState = 'red' | 'amber' | 'green'

/**
 * Computes threshold state for deterministic metrics.
 */
function metricStateFromThreshold(value: number, threshold: HomeMetricThreshold): MetricState {
  if (threshold.direction === 'above') {
    if (value >= threshold.red) {
      return 'red'
    }

    if (value >= threshold.amber) {
      return 'amber'
    }

    return 'green'
  }

  if (value <= threshold.red) {
    return 'red'
  }

  if (value <= threshold.amber) {
    return 'amber'
  }

  return 'green'
}

/**
 * Computes trend direction from current and previous values.
 */
function trendDirection(value: number, previousValue: number): TrendDirection {
  if (value > previousValue) {
    return 'up'
  }

  if (value < previousValue) {
    return 'down'
  }

  return 'flat'
}

/**
 * Renders a trend arrow symbol.
 */
function trendSymbol(direction: TrendDirection): string {
  if (direction === 'up') {
    return '↑'
  }

  if (direction === 'down') {
    return '↓'
  }

  return '→'
}

/**
 * Renders deterministic metric cards for quick health checks.
 */
export function MetricsGlance({ items }: MetricsGlanceProps): JSX.Element {
  const navigate = useNavigate()

  return (
    <section className="cei-home-section" aria-labelledby="cei-home-metrics-title">
      <h2 className="cei-home-section-title" id="cei-home-metrics-title">
        Metrics at a Glance
      </h2>

      {items.length === 0 ? (
        <p className="cei-home-empty-state">No metrics available yet</p>
      ) : (
        <div className="cei-home-metrics-grid">
          {items.map((item): JSX.Element => {
            const metricState = metricStateFromThreshold(item.value, item.threshold)
            const trend = trendDirection(item.value, item.previousValue)

            return (
              <button
                className="cei-home-card cei-home-metric-card"
                key={item.id}
                onClick={(): void => navigate('/chat')}
                type="button"
              >
                <div className="cei-home-metric-topline">
                  <p className={`cei-home-metric-value cei-home-metric-value-${metricState}`}>
                    {item.valueDisplay}
                  </p>
                  <span
                    className={`cei-home-trend-arrow cei-home-trend-${trend}`}
                    aria-label={`Trend ${trend}`}
                  >
                    {trendSymbol(trend)}
                  </span>
                </div>
                <p className="cei-home-metric-label">{item.label}</p>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
