import { useAuth } from '../auth/AuthProvider'
import { AttentionSection } from './AttentionSection'
import type { CuratedFeed } from './feedSchema'
import { HomeWelcome } from './HomeWelcome'
import { MetricsGlance } from './MetricsGlance'
import { QuickStartGrid } from './QuickStartGrid'
import type { HomeAgenticItem, HomeMetricItem } from './mockFeedData'
import { useHomeFeed } from './useHomeFeed'
import './home.css'

interface HomePageProps {
  agenticItems?: HomeAgenticItem[]
  metricItems?: HomeMetricItem[]
}

interface HomePageContentProps {
  agenticItems: HomeAgenticItem[]
  metricItems: HomeMetricItem[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

function mapAgenticItems(feed: CuratedFeed | null): HomeAgenticItem[] {
  if (!feed) {
    return []
  }

  return feed.agentic.map(
    (candidate): HomeAgenticItem => ({
      id: candidate.id,
      severity: candidate.confidence === 'high' ? 'red' : 'amber',
      title: candidate.title,
      summary: candidate.summary,
      confidence: candidate.confidence,
    }),
  )
}

function mapMetricItems(feed: CuratedFeed | null): HomeMetricItem[] {
  if (!feed) {
    return []
  }

  return feed.deterministic.map(
    (candidate): HomeMetricItem => ({
      id: candidate.id,
      label: candidate.title,
      value: candidate.value || 0,
      valueDisplay: candidate.value !== undefined ? String(candidate.value) : '—',
      previousValue: candidate.previousValue || 0,
      threshold: candidate.threshold || { direction: 'above', amber: 50, red: 75 },
    }),
  )
}

function HomePageContent({
  agenticItems,
  metricItems,
  loading,
  error,
  onRetry,
}: HomePageContentProps): JSX.Element {
  return (
    <div className="cei-home-page">
      <main className="cei-home-main" aria-label="Home">
        <div className="cei-home-main-content">
          <HomeWelcome />
          <AttentionSection
            items={agenticItems}
            loading={loading}
            error={error}
            onRetry={onRetry}
          />
          <MetricsGlance items={metricItems} loading={loading} error={error} onRetry={onRetry} />
          <QuickStartGrid />
        </div>
      </main>
    </div>
  )
}

interface LiveHomePageContentProps {
  getAccessToken: () => Promise<string>
}

function LiveHomePageContent({ getAccessToken }: LiveHomePageContentProps): JSX.Element {
  const { feed, loading, error, refresh } = useHomeFeed(getAccessToken)
  const agenticItems = mapAgenticItems(feed)
  const metricItems = mapMetricItems(feed)

  return (
    <HomePageContent
      agenticItems={agenticItems}
      metricItems={metricItems}
      loading={loading}
      error={error}
      onRetry={refresh}
    />
  )
}

/**
 * Top-level home page shell with welcome, attention, metrics, and quick-start sections.
 */
export function HomePage({ agenticItems, metricItems }: HomePageProps): JSX.Element {
  const { getAccessToken } = useAuth()
  const hasOverrides = agenticItems !== undefined || metricItems !== undefined

  if (hasOverrides) {
    return (
      <HomePageContent
        agenticItems={agenticItems || []}
        metricItems={metricItems || []}
        loading={false}
        error={null}
        onRetry={(): void => undefined}
      />
    )
  }

  return <LiveHomePageContent getAccessToken={getAccessToken} />
}
