import type { Artifact } from '../hooks/useChatEngine'
import './artifact-card.css'

interface ArtifactCardProps {
  artifact: Artifact
  isSelected?: boolean
  onClick: (artifactId: string) => void
}

function kindIcon(kind: string): string {
  if (kind === 'chart') return '\u{1F4CA}'
  if (kind === 'table') return '\u{1F4CB}'
  return '\u{1F6E1}'
}

function kindLabel(kind: string): string {
  if (kind === 'chart') return 'Chart'
  if (kind === 'table') return 'Table'
  if (kind === 'recommendation') return 'Recommendation'
  return kind
}

function previewSnippet(artifact: Artifact): string {
  const block = artifact.block
  if (block.kind === 'chart') {
    return `${block.chartType} \u2022 ${block.data.length.toString()} data points`
  }
  if (block.kind === 'table') {
    return `${block.rows.length.toString()} rows \u2022 ${block.columns.length.toString()} columns`
  }
  if (block.kind === 'recommendation') {
    return block.severity.toUpperCase()
  }
  return ''
}

export function ArtifactCard({ artifact, isSelected, onClick }: ArtifactCardProps): JSX.Element {
  const selectedClass = isSelected ? ' cei-artifact-card-selected' : ''

  return (
    <button
      className={`cei-artifact-card${selectedClass}`}
      onClick={(): void => onClick(artifact.id)}
      type="button"
    >
      <div className="cei-artifact-card-header">
        <span className="cei-artifact-card-icon">{kindIcon(artifact.kind)}</span>
        <span className="cei-artifact-card-kind">{kindLabel(artifact.kind)}</span>
      </div>
      <p className="cei-artifact-card-title">{artifact.title}</p>
      <p className="cei-artifact-card-preview">{previewSnippet(artifact)}</p>
    </button>
  )
}
