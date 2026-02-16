import type { Artifact } from '../hooks/useChatEngine.js'
import './document-card.css'

interface DocumentCardProps {
  artifact: Artifact
  isSelected?: boolean
  onClick: (artifactId: string) => void
}

type DocumentBlock = Extract<Artifact['block'], { kind: 'document' }>

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatGlyph(format: string): string {
  if (format === 'pdf') return '📄'
  if (format === 'docx') return '📝'
  if (format === 'pptx') return '📑'
  if (format === 'csv') return '📊'
  return '📄'
}

export function DocumentCard({ artifact, isSelected, onClick }: DocumentCardProps): JSX.Element {
  if (artifact.block.kind !== 'document') {
    return <div className="cei-doc-card-error">Invalid document artifact</div>
  }

  const block = artifact.block as DocumentBlock
  const selectedClass = isSelected ? ' cei-doc-card--selected' : ''

  const agentLabel = block.agentId || 'Document'
  const hasQa = Boolean(block.qaMetadata)
  const qaStatus =
    hasQa && block.qaMetadata ? (block.qaMetadata.warnings.length > 0 ? 'warn' : 'pass') : null

  const handleDownload = (e: React.MouseEvent): void => {
    e.stopPropagation()
    window.open(block.downloadUrl, '_blank')
  }

  return (
    <button
      type="button"
      className={`cei-doc-card cei-doc-card--${block.format}${selectedClass}`}
      onClick={(): void => onClick(artifact.id)}
    >
      <div className={`cei-doc-card-icon cei-doc-card-icon--${block.format}`}>
        <span className="cei-doc-card-icon-glyph">{formatGlyph(block.format)}</span>
        <span className="cei-doc-card-icon-label">{block.format.toUpperCase()}</span>
      </div>

      <div className="cei-doc-card-body">
        <span className="cei-doc-card-agent">{agentLabel}</span>
        <div className="cei-doc-card-title">{block.title}</div>
        <div className="cei-doc-card-meta">
          {block.pageCount !== undefined && (
            <>
              <span>
                {block.pageCount} {block.format === 'pptx' ? 'slides' : 'pages'}
              </span>
              <span className="cei-doc-card-meta-sep" />
            </>
          )}
          <span>{formatFileSize(block.fileSizeBytes)}</span>
          {block.profileName && (
            <>
              <span className="cei-doc-card-meta-sep" />
              <span className="cei-doc-card-profile">{block.profileName}</span>
            </>
          )}
        </div>
      </div>

      <div className="cei-doc-card-actions">
        <button type="button" className="cei-doc-card-download" onClick={handleDownload}>
          <span className="cei-doc-card-download-icon">↓</span>
          Download
        </button>
        {hasQa && qaStatus && (
          <span className={`cei-doc-card-qa cei-doc-card-qa--${qaStatus}`}>
            {qaStatus === 'pass'
              ? '✓ QA passed'
              : `⚠ ${block.qaMetadata!.warnings.length} warning${block.qaMetadata!.warnings.length > 1 ? 's' : ''}`}
          </span>
        )}
      </div>
    </button>
  )
}
