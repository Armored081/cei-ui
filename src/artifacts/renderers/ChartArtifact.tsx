import { ChartBlock } from '../../components/blocks/ChartBlock'
import type { Artifact } from '../../hooks/useChatEngine'
import type { StructuredBlock } from '../../agent/types'
import type { ArtifactTypeDefinition } from '../ArtifactRegistry'
import { chartRows, downloadRowsAsCsv } from './utils'
import './artifact-renderers.css'

type ChartBlockData = Extract<StructuredBlock, { kind: 'chart' }>

function isChartArtifact(artifact: Artifact): artifact is Artifact & { block: ChartBlockData } {
  return artifact.block.kind === 'chart'
}

function chartTypeLabel(chartType: ChartBlockData['chartType']): string {
  return chartType.replace(/-/g, ' ')
}

function renderInline(artifact: Artifact): JSX.Element {
  if (!isChartArtifact(artifact)) {
    return <p className="cei-artifact-inline-preview">Unsupported chart artifact.</p>
  }

  return (
    <>
      <div className="cei-artifact-inline-header">
        <span aria-hidden="true" className="cei-artifact-inline-icon">
          {'\u{1F4CA}'}
        </span>
        <span className="cei-artifact-inline-kind">Chart</span>
      </div>
      <p className="cei-artifact-inline-title">{artifact.title}</p>
      <p className="cei-artifact-inline-preview">
        {chartTypeLabel(artifact.block.chartType)} • {artifact.block.data.length.toString()} data
        points
      </p>
    </>
  )
}

function renderExpanded(artifact: Artifact): JSX.Element {
  if (!isChartArtifact(artifact)) {
    return <p>Unsupported chart artifact.</p>
  }

  return (
    <div
      className="cei-artifact-expanded-content"
      style={{ height: 'calc(100vh - 140px)', minHeight: '300px' }}
    >
      <ChartBlock block={artifact.block} />
    </div>
  )
}

function renderFullScreen(artifact: Artifact): JSX.Element {
  if (!isChartArtifact(artifact)) {
    return <p>Unsupported chart artifact.</p>
  }

  const { columns, rows } = chartRows(artifact.block)

  return (
    <div className="cei-artifact-fullscreen-content">
      <div className="cei-artifact-fullscreen-actions">
        <button
          className="cei-artifact-fullscreen-action-btn"
          onClick={(): void => downloadRowsAsCsv(artifact.title, columns, rows)}
          type="button"
        >
          Export CSV
        </button>
      </div>
      <ChartBlock block={artifact.block} />
      <section aria-label="Chart data table" className="cei-artifact-chart-table">
        {rows.length === 0 || columns.length === 0 ? (
          <p className="cei-artifact-inline-preview">No data rows available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`chart-row-${rowIndex.toString()}`}>
                  {columns.map((column) => (
                    <td key={`${column}-${rowIndex.toString()}`}>{String(row[column] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

/**
 * Built-in chart artifact renderer definition.
 */
export const chartArtifactDefinition: ArtifactTypeDefinition = {
  kind: 'chart',
  renderInline,
  renderExpanded,
  renderFullScreen,
}
