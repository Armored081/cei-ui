import './metrics-page.css'

/**
 * Placeholder page for the upcoming metrics explorer experience.
 */
export function MetricsPage(): JSX.Element {
  return (
    <div className="cei-metrics-page">
      <div className="cei-metrics-page-content">
        <header className="cei-metrics-page-header">
          <h1 className="cei-metrics-page-title">Metrics Explorer</h1>
          <p className="cei-metrics-page-subtitle">
            Deep-dive into security metrics across all domains.
          </p>
        </header>

        <section className="cei-metrics-coming-soon" aria-label="Coming Soon">
          <h2 className="cei-metrics-coming-soon-title">Coming Soon</h2>
          <p className="cei-metrics-coming-soon-copy">
            This space will host the full metric catalog with trends, threshold tracking, and
            domain-aware filtering.
          </p>
        </section>
      </div>
    </div>
  )
}
