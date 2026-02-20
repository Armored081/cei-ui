import { GaugeChart } from '../viz/GaugeChart.js'

interface PostureDomain {
  id: string
  label: string
  score: number
}

interface PostureOverviewProps {
  domains?: PostureDomain[]
  loading?: boolean
}

const DEFAULT_DOMAINS: PostureDomain[] = [
  { id: 'posture-rc', label: 'R&C', score: 78 },
  { id: 'posture-vm', label: 'VM', score: 85 },
  { id: 'posture-dr', label: 'DR', score: 62 },
]

function resolveGaugeSeverity(score: number): 'high' | 'medium' | 'low' {
  if (score < 65) {
    return 'high'
  }

  if (score < 80) {
    return 'medium'
  }

  return 'low'
}

function PostureOverviewSkeleton(): JSX.Element {
  return (
    <div
      className="cei-skeleton cei-skeleton-card cei-home-posture-card--skeleton"
      aria-hidden="true"
    />
  )
}

/**
 * Renders aggregate posture gauges for primary operating domains.
 */
export function PostureOverview({
  domains = DEFAULT_DOMAINS,
  loading = false,
}: PostureOverviewProps): JSX.Element {
  return (
    <section className="cei-home-section" aria-labelledby="cei-home-posture-title">
      <h2 className="cei-home-section-title" id="cei-home-posture-title">
        Posture Overview
      </h2>

      {loading ? (
        <div className="cei-home-posture-grid" aria-label="Posture overview loading">
          {[0, 1, 2].map(
            (index): JSX.Element => (
              <PostureOverviewSkeleton key={`posture-skeleton-${index}`} />
            ),
          )}
        </div>
      ) : domains.length === 0 ? (
        <p className="cei-home-empty-state">Posture scores are not available yet</p>
      ) : (
        <div className="cei-home-posture-grid">
          {domains.map(
            (domain): JSX.Element => (
              <div className="cei-home-posture-card" key={domain.id}>
                <GaugeChart
                  height={168}
                  label={domain.label}
                  max={100}
                  severity={resolveGaugeSeverity(domain.score)}
                  value={domain.score}
                  width={220}
                />
              </div>
            ),
          )}
        </div>
      )}
    </section>
  )
}
