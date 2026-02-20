import { useNavigate } from 'react-router-dom'

import type { HomeMetricItem } from './types'

interface MetricsGlanceProps {
  items: HomeMetricItem[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

type TrendDirection = 'up' | 'down' | 'flat'

/**
 * Computes threshold class from deterministic metric thresholds.
 */
function getThresholdClass(item: HomeMetricItem): string {
  const { value, threshold } = item

  if (threshold.direction === 'above') {
    if (value >= threshold.red) {
      return 'cei-metric-value--red'
    }

    if (value >= threshold.amber) {
      return 'cei-metric-value--amber'
    }

    return 'cei-metric-value--green'
  }

  if (value <= threshold.red) {
    return 'cei-metric-value--red'
  }

  if (value <= threshold.amber) {
    return 'cei-metric-value--amber'
  }

  return 'cei-metric-value--green'
}

/**
 * Renders a trend arrow symbol from current and previous values.
 */
function getTrendArrow(value: number, previousValue: number): string {
  if (value > previousValue) {
    return '↑'
  }

  if (value < previousValue) {
    return '↓'
  }

  return '→'
}

/**
 * Computes trend direction class from metric values.
 */
function getTrendDirection(value: number, previousValue: number): TrendDirection {
  if (value > previousValue) {
    return 'up'
  }

  if (value < previousValue) {
    return 'down'
  }

  return 'flat'
}

/**
 * Skeleton card shown while metrics are loading.
 */
function MetricSkeleton(): JSX.Element {
  return (
    <div
      className="cei-home-card cei-home-metric-card cei-home-metric-card--skeleton"
      aria-hidden="true"
    >
      <div className="cei-home-metric-topline">
        <div className="cei-skeleton cei-skeleton-title" />
        <div className="cei-skeleton cei-skeleton-title" />
      </div>
      <div className="cei-skeleton cei-skeleton-text" />
    </div>
  )
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
        <div className="cei-home-metrics-grid" aria-label="Metrics loading">
          {[0, 1, 2].map(
            (index): JSX.Element => (
              <MetricSkeleton key={`metric-skeleton-${index}`} />
            ),
          )}
        </div>
      ) : error ? (
        <div className="cei-home-metrics-error" role="alert">
          <p>{error}</p>
          {onRetry ? (
            <button onClick={onRetry} className="cei-home-retry-btn" type="button">
              Try again
            </button>
          ) : null}
        </div>
      ) : items.length === 0 ? (
        <p className="cei-home-empty-state">No metrics available yet</p>
      ) : (
        <div className="cei-home-metrics-grid">
          {items.map((item): JSX.Element => {
            const trend = getTrendDirection(item.value, item.previousValue)
            const trendArrow = getTrendArrow(item.value, item.previousValue)

            return (
              <div
                className="cei-home-card cei-home-metric-card"
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={(): void => onOpenMetric(item)}
                onKeyDown={(event): void => {
                  if (event.key === 'Enter') {
                    onOpenMetric(item)
                  }
                }}
              >
                <div className="cei-home-metric-topline">
                  <p className={`cei-home-metric-value ${getThresholdClass(item)}`}>
                    {item.valueDisplay}
                  </p>
                  <span
                    className={`cei-home-trend-arrow cei-home-trend-${trend}`}
                    aria-label={`Trend ${trend}`}
                  >
                    {trendArrow}
                  </span>
                </div>
                <p className="cei-home-metric-label">{item.label}</p>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
