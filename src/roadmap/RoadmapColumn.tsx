import type { RoadmapHorizon, RoadmapItem } from './types'
import { HORIZON_LABELS } from './types'
import { RoadmapCard } from './RoadmapCard'

interface RoadmapColumnProps {
  horizon: RoadmapHorizon
  items: RoadmapItem[]
}

export function RoadmapColumn({ horizon, items }: RoadmapColumnProps): JSX.Element {
  return (
    <div className="roadmap-column" data-horizon={horizon}>
      <h2 className="roadmap-column-title">{HORIZON_LABELS[horizon]}</h2>
      <div className="roadmap-column-items">
        {items.length === 0 && <p className="roadmap-column-empty">No items</p>}
        {items.map((item) => (
          <RoadmapCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
