import './document-generating.css'

interface DocumentGeneratingProps {
  format: 'pdf' | 'docx' | 'pptx' | 'csv'
  step?: string
}

function formatLabel(format: string): string {
  if (format === 'pdf') return 'PDF report'
  if (format === 'docx') return 'DOCX document'
  if (format === 'pptx') return 'PPTX deck'
  if (format === 'csv') return 'CSV export'
  return 'document'
}

export function DocumentGenerating({ format, step }: DocumentGeneratingProps): JSX.Element {
  return (
    <div className="cei-doc-generating">
      <div className={`cei-doc-generating-spinner cei-doc-generating-spinner--${format}`} />
      <div className="cei-doc-generating-text">
        <span className="cei-doc-generating-label">Generating {formatLabel(format)}…</span>
        {step && (
          <span className="cei-doc-generating-step">
            {step}
            <span className="cei-doc-generating-step-dot">...</span>
          </span>
        )}
      </div>
    </div>
  )
}
