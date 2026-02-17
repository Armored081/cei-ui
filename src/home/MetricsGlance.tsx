import { useNavigate } from 'react-router-dom'

import type { HomeMetricItem, HomeMetricThreshold } from './mockFeedData'

interface MetricsGlanceProps {
  items: HomeMetricItem[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
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
export function MetricsGlance({
  items,
  loading = false,
  error = null,
  onRetry,
}: MetricsGlanceProps): JSX.Element {
  const navigate = useNavigate()

  const onOpenMetric = (item: HomeMetricItem): void => {
    const prompt = `Analyze the ${item.label} metric which is currently ${item.valueDisplay}`
    navigate(`/chat?draft=${encodeURIComponent(prompt)}`)
  }

  return (
    <section className="cei-home-section" aria-labelledby="cei-home-metrics-title">
      <h2 className="cei-home-section-title" id="cei-home-metrics-title">
        Metrics at a Glance
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
                onClick={(): void => onOpenMetric(item)}
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
