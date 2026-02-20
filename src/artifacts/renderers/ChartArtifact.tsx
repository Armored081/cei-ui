import type { StructuredBlock } from '../../agent/types.js'
import { ChartBlock } from '../../components/blocks/ChartBlock.js'
import type { Artifact } from '../../hooks/useChatEngine.js'
import type { ArtifactTypeDefinition } from '../ArtifactRegistry.js'
import { chartRows, downloadRowsAsCsv } from './utils.js'
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

function ExpandedChart({
  artifact,
}: {
  artifact: Artifact & { block: ChartBlockData }
}): JSX.Element {
  return (
    <div className="cei-artifact-expanded-chart">
      <ChartBlock block={artifact.block} />
    </div>
  )
}

function FullScreenChart({
  artifact,
}: {
  artifact: Artifact & { block: ChartBlockData }
}): JSX.Element {
  return <ChartBlock block={artifact.block} />
}

function renderExpanded(artifact: Artifact): JSX.Element {
  if (!isChartArtifact(artifact)) {
    return <p>Unsupported chart artifact.</p>
  }

  return (
    <div className="cei-artifact-expanded-content cei-artifact-expanded-content-chart">
      <ExpandedChart artifact={artifact} />
    </div>
  )
}

function renderFullScreen(artifact: Artifact): JSX.Element {
  if (!isChartArtifact(artifact)) {
    return <p>Unsupported chart artifact.</p>
  }

  const { columns, rows } = chartRows(artifact.block)

  return (
    <div className="cei-artifact-fullscreen-content cei-artifact-fullscreen-content-chart">
      <div className="cei-artifact-fullscreen-actions">
        <button
          className="cei-artifact-fullscreen-action-btn"
          onClick={(): void => downloadRowsAsCsv(artifact.title, columns, rows)}
          type="button"
        >
          Export CSV
        </button>
      </div>
      <FullScreenChart artifact={artifact} />
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
