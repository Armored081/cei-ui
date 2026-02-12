import type { Artifact } from '../hooks/useChatEngine'
import { ChartBlock } from '../components/blocks/ChartBlock'
import { RecommendationBlock } from '../components/blocks/RecommendationBlock'
import { TableBlock } from '../components/blocks/TableBlock'
import { downloadBlockPayloadAsJson } from '../components/blocks/BlockDownloadButton'
import './artifact-expanded.css'

interface ArtifactExpandedProps {
  artifact: Artifact | null
  onClose: () => void
}

function downloadCsv(artifact: Artifact): void {
  if (artifact.block.kind !== 'table') return

  const { columns, rows, title } = artifact.block
  const header = columns.join(',')
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const val = row[col]
          const str = val === null || val === undefined ? '' : String(val)
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        })
        .join(','),
    )
    .join('\n')

  const csv = `${header}\n${body}`
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function renderBlock(artifact: Artifact): JSX.Element {
  const block = artifact.block
  if (block.kind === 'chart') {
    return <ChartBlock block={block} />
  }
  if (block.kind === 'table') {
    return <TableBlock block={block} />
  }
  return <RecommendationBlock block={block} />
}

export function ArtifactExpanded({ artifact, onClose }: ArtifactExpandedProps): JSX.Element | null {
  if (!artifact) return null

  return (
    <div className="cei-artifact-expanded">
      <div className="cei-artifact-expanded-header">
        <h3 className="cei-artifact-expanded-title">{artifact.title}</h3>
        <div className="cei-artifact-expanded-actions">
          <button
            className="cei-artifact-expanded-dl"
            onClick={(): void => downloadBlockPayloadAsJson(artifact.block, artifact.title)}
            type="button"
          >
            JSON
          </button>
          {artifact.block.kind === 'table' ? (
            <button
              className="cei-artifact-expanded-dl"
              onClick={(): void => downloadCsv(artifact)}
              type="button"
            >
              CSV
            </button>
          ) : null}
          <button
            className="cei-artifact-expanded-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
      </div>
      <div className="cei-artifact-expanded-body">{renderBlock(artifact)}</div>
    </div>
  )
}
