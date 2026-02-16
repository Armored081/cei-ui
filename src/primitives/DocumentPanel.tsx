import type { Artifact } from '../hooks/useChatEngine.js'
import './document-panel.css'

interface DocumentPanelProps {
  artifact: Artifact
  onClose: () => void
  onRegenerate?: (documentId: string) => void
  fullScreen?: boolean
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

function truncateId(id: string): string {
  if (id.length <= 12) return id
  return `${id.slice(0, 4)}…${id.slice(-4)}`
}

export function DocumentPanel({
  artifact,
  onRegenerate,
  fullScreen,
}: DocumentPanelProps): JSX.Element {
  if (artifact.block.kind !== 'document') {
    return <div className="cei-doc-panel-error">Invalid document artifact</div>
  }

  const block = artifact.block as DocumentBlock
  const agentLabel = block.agentId
    ? `${block.agentId}${block.useCaseId ? ` — ${block.useCaseId}` : ''}`
    : 'Document'

  const hasQa = Boolean(block.qaMetadata)
  const qa = block.qaMetadata
  const qaStatus = hasQa && qa ? (qa.warnings.length > 0 ? 'warn' : 'pass') : null

  const handleDownload = (): void => {
    window.open(block.downloadUrl, '_blank')
  }

  const handleRegenerate = (): void => {
    if (onRegenerate) {
      onRegenerate(block.documentId)
    }
  }

  const handleCopyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(block.downloadUrl)
      // TODO: show toast notification
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const panelClass = fullScreen ? 'cei-doc-panel cei-doc-panel--fullscreen' : 'cei-doc-panel'

  return (
    <div className={panelClass}>
      <div className="cei-doc-panel-header">
        <div className={`cei-doc-panel-icon cei-doc-panel-icon--${block.format}`}>
          <span className="cei-doc-panel-icon-glyph">{formatGlyph(block.format)}</span>
          <span className="cei-doc-panel-icon-label">{block.format.toUpperCase()}</span>
        </div>
        <div className="cei-doc-panel-info">
          <div className="cei-doc-panel-agent">{agentLabel}</div>
          <h3 className="cei-doc-panel-title">{block.title}</h3>
          <div className="cei-doc-panel-metadata">
            {block.pageCount !== undefined && (
              <div className="cei-doc-panel-metadata-item">
                <span className="cei-doc-panel-metadata-label">
                  {block.format === 'pptx' ? 'Slides' : 'Pages'}
                </span>
                <span className="cei-doc-panel-metadata-value">{block.pageCount}</span>
              </div>
            )}
            <div className="cei-doc-panel-metadata-item">
              <span className="cei-doc-panel-metadata-label">Size</span>
              <span className="cei-doc-panel-metadata-value">
                {formatFileSize(block.fileSizeBytes)}
              </span>
            </div>
            {block.profileName && (
              <div className="cei-doc-panel-metadata-item">
                <span className="cei-doc-panel-metadata-label">Profile</span>
                <span className="cei-doc-panel-metadata-value">{block.profileName}</span>
              </div>
            )}
            <div className="cei-doc-panel-metadata-item">
              <span className="cei-doc-panel-metadata-label">Document ID</span>
              <span className="cei-doc-panel-metadata-value cei-doc-panel-metadata-value--mono">
                {truncateId(block.documentId)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {hasQa && qa && (
        <>
          <div className="cei-doc-panel-divider" />
          <div className="cei-doc-panel-qa">
            <div className="cei-doc-panel-qa-header">
              <span className="cei-doc-panel-qa-title">Quality Assurance</span>
              <span className={`cei-doc-panel-qa-status cei-doc-panel-qa-status--${qaStatus}`}>
                <span className={`cei-doc-panel-qa-dot cei-doc-panel-qa-dot--${qaStatus}`} />
                {qaStatus === 'pass'
                  ? 'All checks passed'
                  : `${qa.warnings.length} warning${qa.warnings.length > 1 ? 's' : ''} after ${qa.iterations} iteration${qa.iterations > 1 ? 's' : ''}`}
              </span>
            </div>
            <div className="cei-doc-panel-qa-checks">
              <div className="cei-doc-panel-qa-check">
                <span className="cei-doc-panel-qa-check-icon">{qa.contentPass ? '✓' : '⚠'}</span>
                <span className="cei-doc-panel-qa-check-text">
                  <strong>Content</strong> —{' '}
                  {qa.contentPass ? 'All sections present' : 'Issues found'}
                </span>
              </div>
              {qa.visualPass !== undefined && (
                <div className="cei-doc-panel-qa-check">
                  <span className="cei-doc-panel-qa-check-icon">{qa.visualPass ? '✓' : '⚠'}</span>
                  <span className="cei-doc-panel-qa-check-text">
                    <strong>Visual</strong> —{' '}
                    {qa.visualPass ? 'No layout issues' : qa.warnings[0] || 'Issues found'}
                  </span>
                </div>
              )}
              <div className="cei-doc-panel-qa-check">
                <span className="cei-doc-panel-qa-check-icon">✓</span>
                <span className="cei-doc-panel-qa-check-text">
                  <strong>{block.format === 'pptx' ? 'Slides' : 'Pages'}</strong> —{' '}
                  {block.pageCount || 0} within budget
                </span>
              </div>
              {qa.adjustments.length > 0 && (
                <div className="cei-doc-panel-qa-check">
                  <span className="cei-doc-panel-qa-check-icon">✓</span>
                  <span className="cei-doc-panel-qa-check-text">
                    <strong>Fixes</strong> — {qa.adjustments.length} adjustment
                    {qa.adjustments.length > 1 ? 's' : ''} applied
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {block.templateName && (
        <>
          <div className="cei-doc-panel-divider" />
          <div className="cei-doc-panel-template">
            <div className="cei-doc-panel-template-row">
              <div className="cei-doc-panel-template-swatch" style={{ background: '#1E2761' }}>
                <span style={{ color: '#CADCFC', fontSize: '0.7rem', fontWeight: 700 }}>V</span>
              </div>
              <div className="cei-doc-panel-template-label">
                Template: <span className="cei-doc-panel-template-name">{block.templateName}</span>
              </div>
              <span className="cei-doc-panel-template-chain">platform → tenant → use-case</span>
            </div>
          </div>
        </>
      )}

      <div className="cei-doc-panel-actions">
        <button
          type="button"
          className="cei-doc-panel-btn cei-doc-panel-btn--primary"
          onClick={handleDownload}
        >
          <span className="cei-doc-panel-btn-icon">↓</span>
          Download {block.format.toUpperCase()}
        </button>
        {onRegenerate && (
          <button
            type="button"
            className="cei-doc-panel-btn cei-doc-panel-btn--secondary"
            onClick={handleRegenerate}
          >
            <span className="cei-doc-panel-btn-icon">🔄</span>
            Regenerate
          </button>
        )}
        <button
          type="button"
          className="cei-doc-panel-btn cei-doc-panel-btn--secondary"
          onClick={handleCopyLink}
        >
          <span className="cei-doc-panel-btn-icon">📋</span>
          Copy Link
        </button>
      </div>
    </div>
  )
}
