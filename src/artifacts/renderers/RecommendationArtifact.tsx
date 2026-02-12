import type { StructuredBlock } from '../../agent/types'
import { RecommendationBlock } from '../../components/blocks/RecommendationBlock'
import type { Artifact } from '../../hooks/useChatEngine'
import type { ArtifactTypeDefinition } from '../ArtifactRegistry'
import './artifact-renderers.css'

type RecommendationBlockData = Extract<StructuredBlock, { kind: 'recommendation' }>

function isRecommendationArtifact(
  artifact: Artifact,
): artifact is Artifact & { block: RecommendationBlockData } {
  return artifact.block.kind === 'recommendation'
}

function severityLabel(severity: RecommendationBlockData['severity']): string {
  return severity.toUpperCase()
}

function renderInline(artifact: Artifact): JSX.Element {
  if (!isRecommendationArtifact(artifact)) {
    return <p className="cei-artifact-inline-preview">Unsupported recommendation artifact.</p>
  }

  return (
    <>
      <div className="cei-artifact-inline-header">
        <span aria-hidden="true" className="cei-artifact-inline-icon">
          {'\u{1F6E1}'}
        </span>
        <span className="cei-artifact-inline-kind">Recommendation</span>
      </div>
      <p className="cei-artifact-inline-title">{artifact.title}</p>
      <p className="cei-artifact-inline-preview">
        <span
          className={`cei-artifact-inline-severity cei-artifact-inline-severity-${artifact.block.severity}`}
        >
          {severityLabel(artifact.block.severity)}
        </span>
      </p>
    </>
  )
}

function renderExpanded(artifact: Artifact): JSX.Element {
  if (!isRecommendationArtifact(artifact)) {
    return <p>Unsupported recommendation artifact.</p>
  }

  return (
    <div className="cei-artifact-expanded-content">
      <RecommendationBlock block={artifact.block} />
    </div>
  )
}

function renderFullScreen(artifact: Artifact): JSX.Element {
  if (!isRecommendationArtifact(artifact)) {
    return <p>Unsupported recommendation artifact.</p>
  }

  return (
    <div className="cei-artifact-fullscreen-content cei-artifact-recommendation-fullscreen">
      <RecommendationBlock block={artifact.block} />
    </div>
  )
}

/**
 * Built-in recommendation artifact renderer definition.
 */
export const recommendationArtifactDefinition: ArtifactTypeDefinition = {
  kind: 'recommendation',
  renderInline,
  renderExpanded,
  renderFullScreen,
}
