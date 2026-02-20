import type { StructuredBlock } from '../agent/types.js'
import { BlockDownloadButton } from '../components/blocks/BlockDownloadButton.js'
import { StandardChartBlock, type ChartBlockData } from '../components/blocks/StandardChartBlock.js'
import type { VizHint } from '../types/modern-context.js'
import { VizHintRenderer } from './VizHintRenderer.js'

interface EnhancedChartBlockProps {
  block: StructuredBlock
  vizHint?: VizHint
}

function isChartBlock(block: StructuredBlock): block is ChartBlockData {
  return block.kind === 'chart'
}

/**
 * Chart block wrapper that renders custom viz hints when available.
 */
export function EnhancedChartBlock({
  block,
  vizHint,
}: EnhancedChartBlockProps): JSX.Element | null {
  if (!isChartBlock(block)) {
    console.warn('[EnhancedChartBlock] Expected a chart block payload.')
    return null
  }

  if (!vizHint) {
    return <StandardChartBlock block={block} />
  }

  return (
    <section className="cei-block" data-testid={`chart-block-${block.chartType}`}>
      <header className="cei-block-header">
        <h4 className="cei-block-title">{vizHint.title || block.title}</h4>
        <BlockDownloadButton filenameBase={`${block.title}-chart`} payload={{ block, vizHint }} />
      </header>

      <div className="cei-chart-wrapper" data-testid="chart-container">
        <VizHintRenderer hint={vizHint} />
      </div>
    </section>
  )
}
