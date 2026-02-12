import type { StructuredBlock } from '../../agent/types'

type ChartBlockData = Extract<StructuredBlock, { kind: 'chart' }>

type CsvRow = Record<string, unknown>

function sanitizeFilenameSegment(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function escapeCsvCell(value: unknown): string {
  const valueText = value === null || value === undefined ? '' : String(value)

  if (
    valueText.includes(',') ||
    valueText.includes('"') ||
    valueText.includes('\n') ||
    valueText.includes('\r')
  ) {
    return `"${valueText.replace(/"/g, '""')}"`
  }

  return valueText
}

/**
 * Downloads provided rows as a CSV file.
 */
export function downloadRowsAsCsv(filenameBase: string, columns: string[], rows: CsvRow[]): void {
  if (columns.length === 0) {
    return
  }

  const header = columns.map((column) => escapeCsvCell(column)).join(',')
  const body = rows
    .map((row) => columns.map((column) => escapeCsvCell(row[column])).join(','))
    .join('\n')

  const csv = `${header}\n${body}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = `${sanitizeFilenameSegment(filenameBase) || 'artifact'}.csv`
  link.click()

  URL.revokeObjectURL(objectUrl)
}

/**
 * Converts chart block data points into generic table rows.
 */
export function chartRows(block: ChartBlockData): { columns: string[]; rows: CsvRow[] } {
  if (block.data.length === 0) {
    return {
      columns: [],
      rows: [],
    }
  }

  const normalizedRows = block.data.map((dataPoint) => ({ ...dataPoint }))
  const columns: string[] = []

  normalizedRows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!columns.includes(key)) {
        columns.push(key)
      }
    })
  })

  return {
    columns,
    rows: normalizedRows,
  }
}
