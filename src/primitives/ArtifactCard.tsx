import { ArtifactRegistry } from '../artifacts/ArtifactRegistry'
import type { Artifact } from '../hooks/useChatEngine'
import { ConfidenceBadge } from './ConfidenceBadge'
import './artifact-card.css'

interface ArtifactCardProps {
  artifact: Artifact
  isSelected?: boolean
  onClick: (artifactId: string) => void
}

function fallbackPreviewSnippet(artifact: Artifact): string {
  if (artifact.block.kind === 'chart') {
    return `${artifact.block.chartType} • ${artifact.block.data.length.toString()} data points`
  }

  if (artifact.block.kind === 'table') {
    return `${artifact.block.rows.length.toString()} rows • ${artifact.block.columns.length.toString()} columns`
  }

  if (artifact.block.kind === 'recommendation') {
    return artifact.block.severity.toUpperCase()
  }

  if (artifact.block.kind === 'assessment-list') {
    return `${artifact.block.assessments.length.toString()} assessments`
  }

  if (artifact.block.kind === 'assessment-detail') {
    return `${artifact.block.assessment.framework} • ${artifact.block.assessment.score.toFixed(1)}`
  }

  return artifact.kind
}

function fallbackInlineContent(artifact: Artifact): JSX.Element {
  return (
    <>
      <div className="cei-artifact-inline-header">
        <span aria-hidden="true" className="cei-artifact-inline-icon">
          {'\u{1F4C1}'}
        </span>
        <span className="cei-artifact-inline-kind">Artifact</span>
      </div>
      <p className="cei-artifact-inline-title">{artifact.title}</p>
      <p className="cei-artifact-inline-preview">{fallbackPreviewSnippet(artifact)}</p>
    </>
  )
}

export function ArtifactCard({ artifact, isSelected, onClick }: ArtifactCardProps): JSX.Element {
  const selectedClass = isSelected ? ' cei-artifact-card-selected' : ''
  const definition = ArtifactRegistry.get(artifact.kind)

  return (
    <button
      aria-pressed={Boolean(isSelected)}
      className={`cei-artifact-card${selectedClass}`}
      onClick={(): void => onClick(artifact.id)}
      type="button"
    >
      <div className="cei-artifact-card-content">
        {definition ? definition.renderInline(artifact) : fallbackInlineContent(artifact)}
      </div>
      <ConfidenceBadge
        confidence={artifact.confidence}
        confidenceDecay={artifact.confidenceDecay}
      />
    </button>
  )
}
