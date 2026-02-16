import './document-pill.css'

interface DocumentPillProps {
  documentId: string
  format: 'pdf' | 'docx' | 'pptx' | 'csv'
  title: string
  onClick: (documentId: string) => void
}

export function DocumentPill({
  documentId,
  format,
  title,
  onClick,
}: DocumentPillProps): JSX.Element {
  return (
    <button type="button" className="cei-doc-pill" onClick={(): void => onClick(documentId)}>
      <span className={`cei-doc-pill-format cei-doc-pill-format--${format}`}>
        {format.toUpperCase()}
      </span>
      <span className="cei-doc-pill-title">{title}</span>
    </button>
  )
}
