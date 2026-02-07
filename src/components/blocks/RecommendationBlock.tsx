import type { StructuredBlock } from '../../agent/types'
import { BlockDownloadButton } from './BlockDownloadButton'
import './StructuredBlocks.css'

type RecommendationBlockData = Extract<StructuredBlock, { kind: 'recommendation' }>

interface RecommendationBlockProps {
  block: RecommendationBlockData
}

function severitySymbol(severity: RecommendationBlockData['severity']): string {
  if (severity === 'critical') {
    return 'CRIT'
  }

  if (severity === 'high') {
    return 'HIGH'
  }

  if (severity === 'medium') {
    return 'MED'
  }

  return 'LOW'
}

export function RecommendationBlock({ block }: RecommendationBlockProps): JSX.Element {
  return (
    <section
      className={`cei-block cei-recommendation cei-recommendation-${block.severity}`}
      data-testid="recommendation-block"
    >
      <header className="cei-block-header">
        <div className="cei-recommendation-heading">
          <span className="cei-recommendation-badge" data-testid="recommendation-severity-badge">
            {severitySymbol(block.severity)}
          </span>
          <h4 className="cei-block-title">{block.title}</h4>
        </div>
        <BlockDownloadButton filenameBase={`${block.title}-recommendation`} payload={block} />
      </header>

      <p className="cei-recommendation-body">{block.body}</p>
    </section>
  )
}
