import { useMemo, useState } from 'react'

import type { StructuredBlock } from '../../agent/types'
import { BlockDownloadButton } from './BlockDownloadButton'
import './StructuredBlocks.css'

type TableBlockData = Extract<StructuredBlock, { kind: 'table' }>
type SortDirection = 'asc' | 'desc'

interface SortState {
  column: string
  direction: SortDirection
}

interface TableBlockProps {
  block: TableBlockData
}

function toComparableValue(value: unknown): number | string {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }

  if (typeof value === 'string') {
    return value.toLocaleLowerCase()
  }

  if (value === null || value === undefined) {
    return ''
  }

  const serialized = JSON.stringify(value)

  if (serialized === undefined) {
    return ''
  }

  return serialized
}

function compareRowValues(leftValue: unknown, rightValue: unknown): number {
  const leftComparable = toComparableValue(leftValue)
  const rightComparable = toComparableValue(rightValue)

  if (typeof leftComparable === 'number' && typeof rightComparable === 'number') {
    return leftComparable - rightComparable
  }

  return leftComparable
    .toString()
    .localeCompare(rightComparable.toString(), undefined, { numeric: true, sensitivity: 'base' })
}

function formatCellValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  const serialized = JSON.stringify(value)

  if (serialized === undefined) {
    return ''
  }

  return serialized
}

export function TableBlock({ block }: TableBlockProps): JSX.Element {
  const [sortState, setSortState] = useState<SortState | null>(null)

  const sortedRows = useMemo((): Record<string, unknown>[] => {
    if (!sortState) {
      return block.rows
    }

    const rowsCopy = [...block.rows]

    rowsCopy.sort((leftRow, rightRow): number => {
      const comparison = compareRowValues(leftRow[sortState.column], rightRow[sortState.column])

      if (sortState.direction === 'asc') {
        return comparison
      }

      return comparison * -1
    })

    return rowsCopy
  }, [block.rows, sortState])

  const onSortColumn = (column: string): void => {
    setSortState((currentSortState): SortState => {
      if (!currentSortState || currentSortState.column !== column) {
        return {
          column,
          direction: 'asc',
        }
      }

      return {
        column,
        direction: currentSortState.direction === 'asc' ? 'desc' : 'asc',
      }
    })
  }

  return (
    <section className="cei-block" data-testid="table-block">
      <header className="cei-block-header">
        <h4 className="cei-block-title">{block.title}</h4>
        <BlockDownloadButton filenameBase={`${block.title}-table`} payload={block} />
      </header>

      <div className="cei-table-scroll" data-testid="table-scroll-container">
        <table className="cei-table">
          <thead>
            <tr>
              {block.columns.map((column) => {
                const isSorted = sortState?.column === column
                const ariaSort = isSorted
                  ? sortState?.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'

                return (
                  <th aria-sort={ariaSort} key={column} scope="col">
                    <button
                      className="cei-table-sort"
                      onClick={(): void => onSortColumn(column)}
                      type="button"
                    >
                      <span>{column}</span>
                      <span aria-hidden="true" className="cei-table-sort-indicator">
                        {isSorted ? (sortState?.direction === 'asc' ? '^' : 'v') : '<>'}
                      </span>
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {sortedRows.map((row, index) => (
              <tr key={`row-${index.toString()}`}>
                {block.columns.map((column) => (
                  <td key={`${column}-${index.toString()}`}>{formatCellValue(row[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
