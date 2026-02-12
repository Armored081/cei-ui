import type { RoadmapCategory, RoadmapItem } from './types'
import { CATEGORY_LABELS, STATUS_ICONS } from './types'

interface RoadmapCategorySectionProps {
  category: RoadmapCategory
  items: RoadmapItem[]
}

export function RoadmapCategorySection({
  category,
  items,
}: RoadmapCategorySectionProps): JSX.Element {
  return (
    <div className="roadmap-category-section">
      <h3 className="roadmap-category-title">{CATEGORY_LABELS[category]}</h3>
      <ul className="roadmap-category-list">
        {items.map((item) => (
          <li key={item.id} className="roadmap-category-item" data-status={item.status}>
            <span className="roadmap-category-item-status">{STATUS_ICONS[item.status]}</span>
            <span className="roadmap-category-item-title">{item.title}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
