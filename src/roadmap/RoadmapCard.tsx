import type { RoadmapItem } from './types'
import { STATUS_ICONS, CATEGORY_LABELS } from './types'

interface RoadmapCardProps {
  item: RoadmapItem
}

export function RoadmapCard({ item }: RoadmapCardProps): JSX.Element {
  return (
    <div className="roadmap-card" data-status={item.status}>
      <div className="roadmap-card-header">
        <span className="roadmap-card-status" aria-label={item.status}>
          {STATUS_ICONS[item.status]}
        </span>
        <span className="roadmap-card-category">{CATEGORY_LABELS[item.category]}</span>
      </div>
      <h3 className="roadmap-card-title">{item.title}</h3>
      <p className="roadmap-card-description">{item.description}</p>
      {item.shipped_at && (
        <span className="roadmap-card-shipped">Shipped {formatShippedDate(item.shipped_at)}</span>
      )}
    </div>
  )
}

function formatShippedDate(dateStr: string): string {
  const date = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00Z' : dateStr)
  if (isNaN(date.getTime())) {
    return dateStr
  }
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}
