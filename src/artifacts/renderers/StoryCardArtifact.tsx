import type { Artifact } from '../../hooks/useChatEngine.js'
import { StoryCard } from '../../stories/StoryCard.js'
import { StoryCardMini } from '../../stories/StoryCardMini.js'
import type {
  EntityReference,
  StoryCard as ModernContextStoryCard,
} from '../../types/modern-context.js'
import type { ArtifactTypeDefinition } from '../ArtifactRegistry.js'

interface StoryCardArtifactPayload {
  title?: string
  narrative?: string
  severity?: ModernContextStoryCard['severity']
  correlatedEntities?: EntityReference[]
  temporalWindow?: ModernContextStoryCard['temporalWindow']
}

function isStoryCardArtifactPayload(value: unknown): value is StoryCardArtifactPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  return 'title' in value || 'narrative' in value || 'severity' in value
}

function normalizeSeverity(severity: unknown): ModernContextStoryCard['severity'] {
  if (
    severity === 'critical' ||
    severity === 'high' ||
    severity === 'medium' ||
    severity === 'low' ||
    severity === 'info'
  ) {
    return severity
  }

  return 'info'
}

function toStoryCardPayload(artifact: Artifact): ModernContextStoryCard {
  const candidatePayload = artifact.block as unknown

  if (isStoryCardArtifactPayload(candidatePayload)) {
    // Map temporalWindow keys: schema uses {start,end}, components expect {startDate,endDate}
    const normalizedTemporalWindow = candidatePayload.temporalWindow
      ? {
          startDate: (candidatePayload.temporalWindow as { start: string; end: string }).start,
          endDate: (candidatePayload.temporalWindow as { start: string; end: string }).end,
        }
      : undefined

    return {
      id: artifact.id,
      title: candidatePayload.title || artifact.title,
      severity: normalizeSeverity(candidatePayload.severity),
      narrative: candidatePayload.narrative || 'No narrative provided for this story.',
      correlatedEntities: candidatePayload.correlatedEntities || [],
      temporalWindow: normalizedTemporalWindow,
    }
  }

  return {
    id: artifact.id,
    title: artifact.title,
    severity: 'info',
    narrative: 'No narrative provided for this story.',
    correlatedEntities: [],
  }
}

function renderInline(artifact: Artifact): JSX.Element {
  return <StoryCardMini story={toStoryCardPayload(artifact)} />
}

function renderExpanded(artifact: Artifact): JSX.Element {
  return (
    <div className="cei-artifact-expanded-content">
      <StoryCard story={toStoryCardPayload(artifact)} />
    </div>
  )
}

function renderFullScreen(artifact: Artifact): JSX.Element {
  return (
    <div className="cei-artifact-fullscreen-content">
      <StoryCard story={toStoryCardPayload(artifact)} />
    </div>
  )
}

/**
 * Built-in story-card artifact renderer definition.
 */
export const storyCardArtifactDefinition: ArtifactTypeDefinition = {
  kind: 'story-card',
  renderInline,
  renderExpanded,
  renderFullScreen,
}
