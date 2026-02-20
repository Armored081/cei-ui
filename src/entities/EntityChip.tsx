import type { CSSProperties } from 'react'

import type { EntityType } from '../types/entity.js'
import { ENTITY_TYPE_CONFIG } from './entityTypeConfig.js'
import './entity-chip.css'

/**
 * Entity chip click payload.
 */
export interface EntityChipClickRef {
  type: EntityType
  id: string
  name: string
}

/**
 * Props for rendering an inline, clickable entity chip.
 */
export interface EntityChipProps {
  type: EntityType
  id: string
  name: string
  onClick?: (entityRef: EntityChipClickRef) => void
}

/**
 * Inline chip for entity references embedded in assistant text.
 */
export function EntityChip({ type, id, name, onClick }: EntityChipProps): JSX.Element {
  const config = ENTITY_TYPE_CONFIG[type]

  const onChipClick = (): void => {
    if (onClick) {
      onClick({ type, id, name })
    }
  }

  return (
    <button
      type="button"
      className="entity-chip"
      onClick={onChipClick}
      title={`${config.label}: ${name} (${id})`}
      style={{ '--chip-color': `var(${config.color})` } as CSSProperties}
    >
      <span className="entity-chip__icon" aria-hidden="true">
        {config.icon}
      </span>
      <span className="entity-chip__name">{name}</span>
    </button>
  )
}
