/**
 * Upload lifecycle state for a composer attachment.
 */
export type AttachmentStatus = 'processing' | 'ready' | 'error'

/**
 * View model for rendering a single attachment preview item.
 */
export interface AttachmentPreviewItem {
  errorText: string
  id: string
  name: string
  progressPercent: number
  sizeBytes: number
  status: AttachmentStatus
}

/**
 * Props for the attachment preview list.
 */
export interface AttachmentPreviewProps {
  attachments: AttachmentPreviewItem[]
  onRemoveAttachment: (attachmentId: string) => void
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function toStatusText(status: AttachmentStatus): string {
  if (status === 'processing') {
    return 'Uploading...'
  }

  if (status === 'error') {
    return 'Upload failed'
  }

  return 'Ready'
}

/**
 * Renders selected attachments with status, progress, and remove actions.
 */
export function AttachmentPreview(props: AttachmentPreviewProps): JSX.Element {
  if (props.attachments.length === 0) {
    return <></>
  }

  return (
    <ul className="cei-attachment-list" aria-label="Selected attachments">
      {props.attachments.map((attachment) => {
        const isProcessing = attachment.status === 'processing'
        const statusText = toStatusText(attachment.status)

        return (
          <li className="cei-attachment-item" key={attachment.id}>
            <div className="cei-attachment-content">
              <p className="cei-attachment-name">{attachment.name}</p>
              <p className="cei-attachment-meta">
                {formatFileSize(attachment.sizeBytes)} | {statusText}
              </p>
              {isProcessing ? (
                <div className="cei-attachment-progress-wrap">
                  <progress
                    aria-label={`Upload progress for ${attachment.name}`}
                    className="cei-attachment-progress"
                    max={100}
                    value={attachment.progressPercent}
                  />
                  <span className="cei-attachment-progress-value">
                    {attachment.progressPercent}%
                  </span>
                </div>
              ) : null}
              {attachment.status === 'error' && attachment.errorText ? (
                <p className="cei-error-text cei-attachment-error">{attachment.errorText}</p>
              ) : null}
            </div>

            <button
              aria-label={`Remove ${attachment.name}`}
              className="cei-button-secondary cei-attachment-remove"
              onClick={(): void => props.onRemoveAttachment(attachment.id)}
              type="button"
            >
              Remove
            </button>
          </li>
        )
      })}
    </ul>
  )
}
