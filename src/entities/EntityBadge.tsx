import type { CSSProperties } from 'react'

import type { EntityType } from '../types/entity.js'
import { ENTITY_TYPE_CONFIG } from './entityTypeConfig.js'
import './entity-badge.css'

/**
 * Props for rendering a compact entity type badge.
 */
export interface EntityBadgeProps {
  type: EntityType
  showLabel?: boolean
}

/**
 * Displays an entity icon and optional label using type-specific color.
 */
export function EntityBadge({ type, showLabel = true }: EntityBadgeProps): JSX.Element {
  const config = ENTITY_TYPE_CONFIG[type]

  return (
    <span
      className="entity-badge"
      style={{ '--badge-color': `var(${config.color})` } as CSSProperties}
    >
      <span className="entity-badge__icon" aria-hidden="true">
        {config.icon}
      </span>
      {showLabel ? <span className="entity-badge__label">{config.label}</span> : null}
    </span>
  )
}
