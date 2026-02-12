import { useMemo, useState } from 'react'

import type { StructuredBlock } from '../../agent/types'
import { TableBlock } from '../../components/blocks/TableBlock'
import type { Artifact } from '../../hooks/useChatEngine'
import type { ArtifactTypeDefinition } from '../ArtifactRegistry'
import { downloadRowsAsCsv } from './utils'
import './artifact-renderers.css'

type TableBlockData = Extract<StructuredBlock, { kind: 'table' }>

function isTableArtifact(artifact: Artifact): artifact is Artifact & { block: TableBlockData } {
  return artifact.block.kind === 'table'
}

function inlineColumnPreview(columns: string[]): string {
  if (columns.length === 0) {
    return 'No columns'
  }

  return columns.slice(0, 3).join(', ')
}

function renderInline(artifact: Artifact): JSX.Element {
  if (!isTableArtifact(artifact)) {
    return <p className="cei-artifact-inline-preview">Unsupported table artifact.</p>
  }

  return (
    <>
      <div className="cei-artifact-inline-header">
        <span aria-hidden="true" className="cei-artifact-inline-icon">
          {'\u{1F4CB}'}
        </span>
        <span className="cei-artifact-inline-kind">Table</span>
      </div>
      <p className="cei-artifact-inline-title">{artifact.title}</p>
      <p className="cei-artifact-inline-preview">
        {artifact.block.rows.length.toString()} rows • {inlineColumnPreview(artifact.block.columns)}
      </p>
    </>
  )
}

function renderExpanded(artifact: Artifact): JSX.Element {
  if (!isTableArtifact(artifact)) {
    return <p>Unsupported table artifact.</p>
  }

  return (
    <div className="cei-artifact-expanded-content">
      <TableBlock block={artifact.block} />
    </div>
  )
}

interface TableFullScreenViewProps {
  artifact: Artifact & { block: TableBlockData }
}

function TableFullScreenView({ artifact }: TableFullScreenViewProps): JSX.Element {
  const [filterQuery, setFilterQuery] = useState<string>('')

  const normalizedFilter = filterQuery.trim().toLocaleLowerCase()

  const filteredRows = useMemo((): Record<string, unknown>[] => {
    if (!normalizedFilter) {
      return artifact.block.rows
    }

    return artifact.block.rows.filter((row) => {
      return artifact.block.columns.some((column) => {
        const value = row[column]
        const valueText = value === null || value === undefined ? '' : String(value)
        return valueText.toLocaleLowerCase().includes(normalizedFilter)
      })
    })
  }, [artifact.block.columns, artifact.block.rows, normalizedFilter])

  const filteredBlock = {
    ...artifact.block,
    rows: filteredRows,
  }

  return (
    <div className="cei-artifact-fullscreen-content">
      <div className="cei-artifact-fullscreen-actions">
        <input
          aria-label="Filter table rows"
          className="cei-artifact-table-filter"
          onChange={(event): void => setFilterQuery(event.target.value)}
          placeholder="Filter rows"
          type="search"
          value={filterQuery}
        />
        <button
          className="cei-artifact-fullscreen-action-btn"
          onClick={(): void =>
            downloadRowsAsCsv(artifact.title, artifact.block.columns, filteredRows)
          }
          type="button"
        >
          Export CSV
        </button>
      </div>
      <TableBlock block={filteredBlock} />
    </div>
  )
}

function renderFullScreen(artifact: Artifact): JSX.Element {
  if (!isTableArtifact(artifact)) {
    return <p>Unsupported table artifact.</p>
  }

  return <TableFullScreenView artifact={artifact} />
}

/**
 * Built-in table artifact renderer definition.
 */
export const tableArtifactDefinition: ArtifactTypeDefinition = {
  kind: 'table',
  renderInline,
  renderExpanded,
  renderFullScreen,
}
