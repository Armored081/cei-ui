import type { VizHint } from '../../types/modern-context.js'
import { EnhancedChartBlock } from '../../viz/EnhancedChartBlock.js'
import { StandardChartBlock, type ChartBlockData } from './StandardChartBlock.js'

interface ChartBlockProps {
  block: ChartBlockData
  vizHint?: VizHint
  expandedHeight?: number
}

/**
 * Chart block entry point with optional viz-hint override support.
 */
export function ChartBlock({ block, vizHint, expandedHeight }: ChartBlockProps): JSX.Element {
  if (vizHint) {
    return <EnhancedChartBlock block={block} vizHint={vizHint} />
  }

  return <StandardChartBlock block={block} expandedHeight={expandedHeight} />
}
