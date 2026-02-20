import { useAuth } from '../auth/AuthProvider'
import { isEntityType } from '../types/entity'
import type { StoryCard as ModernContextStoryCard } from '../types/modern-context'
import { AttentionSection } from './AttentionSection'
import type { CuratedFeed } from './feedSchema'
import { HomeWelcome } from './HomeWelcome'
import { MetricsGlance } from './MetricsGlance'
import { PostureOverview } from './PostureOverview'
import { QuickStartGrid } from './QuickStartGrid'
import type { FeedCandidate } from './feedSchema'
import type { HomeAgenticItem, HomeMetricItem } from './types'
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as Record<string, unknown>
}

function candidateEntityName(candidate: FeedCandidate): string {
  const metadata = asRecord(candidate.metadata)
  const metadataEntityName = metadata?.entityName

  if (typeof metadataEntityName === 'string' && metadataEntityName.trim()) {
    return metadataEntityName
  }

  if (typeof candidate.entityPath === 'string' && candidate.entityPath.trim()) {
    return candidate.entityPath
  }

  if (Array.isArray(candidate.entityPath) && candidate.entityPath.length > 0) {
    const lastPathSegment = candidate.entityPath[candidate.entityPath.length - 1]

    if (typeof lastPathSegment === 'string' && lastPathSegment.trim()) {
      return lastPathSegment
    }
  }

  return candidate.title
}

function candidateEntityType(
  candidate: FeedCandidate,
): ModernContextStoryCard['correlatedEntities'][number]['type'] {
  const metadata = asRecord(candidate.metadata)
  const metadataEntityType = metadata?.entityType

  if (typeof metadataEntityType === 'string' && isEntityType(metadataEntityType)) {
    return metadataEntityType
  }

  return 'risk'
}

function candidateTemporalWindow(
  candidate: FeedCandidate,
): ModernContextStoryCard['temporalWindow'] | undefined {
  const metadata = asRecord(candidate.metadata)
  const temporalWindow = asRecord(metadata?.temporalWindow)

  if (!temporalWindow) {
    return undefined
  }

  const startDate =
    typeof temporalWindow.startDate === 'string'
      ? temporalWindow.startDate
      : typeof temporalWindow.start === 'string'
        ? temporalWindow.start
        : ''
  const endDate =
    typeof temporalWindow.endDate === 'string'
      ? temporalWindow.endDate
      : typeof temporalWindow.end === 'string'
        ? temporalWindow.end
        : ''

  if (!startDate && !endDate) {
    return undefined
  }

  return {
    startDate: startDate || endDate,
    endDate: endDate || startDate,
  }
}

function candidateCorrelatedEntities(
  candidate: FeedCandidate,
): ModernContextStoryCard['correlatedEntities'] {
  const metadata = asRecord(candidate.metadata)
  const relatedEntities = metadata?.relatedEntities

  if (Array.isArray(relatedEntities)) {
    const parsedEntities = relatedEntities
      .map((entity): ModernContextStoryCard['correlatedEntities'][number] | null => {
        const entityRecord = asRecord(entity)

        if (!entityRecord) {
          return null
        }

        const typeValue = entityRecord.type
        const idValue = entityRecord.id
        const nameValue = entityRecord.name

        if (
          typeof typeValue !== 'string' ||
          !isEntityType(typeValue) ||
          typeof idValue !== 'string' ||
          typeof nameValue !== 'string'
        ) {
          return null
        }

        return {
          type: typeValue,
          id: idValue,
          name: nameValue,
        }
      })
      .filter(
        (entity): entity is ModernContextStoryCard['correlatedEntities'][number] => entity !== null,
      )

    if (parsedEntities.length > 0) {
      return parsedEntities
    }
  }

  if (!candidate.entityId) {
    return []
  }

  return [
    {
      id: candidate.entityId,
      type: candidateEntityType(candidate),
      name: candidateEntityName(candidate),
    },
  ]
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
      correlatedEntities: candidateCorrelatedEntities(candidate),
      temporalWindow: candidateTemporalWindow(candidate),
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
      valueDisplay:
        candidate.valueDisplay || (candidate.value !== undefined ? String(candidate.value) : '—'),
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
          <PostureOverview loading={loading} />
          <AttentionSection
            items={agenticItems}
            loading={loading}
            error={error}
            onRetry={onRetry}
          />
          <QuickStartGrid />
          <MetricsGlance items={metricItems} loading={loading} error={error} onRetry={onRetry} />
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
 * Top-level home page shell with welcome, posture, attention, quick-start, and metrics sections.
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
