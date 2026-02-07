interface BlockDownloadButtonProps {
  filenameBase: string
  payload: unknown
}

function sanitizeFileNameSegment(value: string): string {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return sanitized || 'block'
}

export function downloadBlockPayloadAsJson(payload: unknown, filenameBase: string): void {
  const serializedPayload = JSON.stringify(payload, null, 2)

  if (serializedPayload === undefined) {
    throw new Error('Block payload cannot be serialized to JSON')
  }

  const blob = new Blob([serializedPayload], { type: 'application/json' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = `${sanitizeFileNameSegment(filenameBase)}.json`
  link.style.display = 'none'

  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

export function BlockDownloadButton({
  filenameBase,
  payload,
}: BlockDownloadButtonProps): JSX.Element {
  const onClick = (): void => {
    downloadBlockPayloadAsJson(payload, filenameBase)
  }

  return (
    <button
      aria-label="Download block data"
      className="cei-block-download"
      onClick={onClick}
      type="button"
    >
      JSON
    </button>
  )
}
