import { useMemo } from 'react'

import { EntityChip, type EntityChipClickRef } from '../entities/EntityChip.js'
import { parseEntityNotations } from '../entities/entityUtils.js'
import type { EntityType } from '../types/entity.js'

/**
 * Props for parsing entity notations in text and rendering inline chips.
 */
export interface EntityChipParserProps {
  text: string
  onEntityClick?: (entityRef: { type: EntityType; id: string; name: string }) => void
}

type ParserSegment =
  | {
      type: 'text'
      content: string
    }
  | {
      type: 'entity'
      content: EntityChipClickRef
    }

/**
 * Parse text containing [[entity:type:id|name]] notation and render EntityChips.
 */
export function EntityChipParser({ text, onEntityClick }: EntityChipParserProps): JSX.Element {
  const segments = useMemo((): ParserSegment[] => {
    const entities = parseEntityNotations(text)

    if (entities.length === 0) {
      return [{ type: 'text', content: text }]
    }

    const results: ParserSegment[] = []
    let lastIndex = 0

    for (const entity of entities) {
      if (entity.startIndex > lastIndex) {
        results.push({
          type: 'text',
          content: text.slice(lastIndex, entity.startIndex),
        })
      }

      results.push({
        type: 'entity',
        content: {
          type: entity.type,
          id: entity.id,
          name: entity.displayName,
        },
      })

      lastIndex = entity.endIndex
    }

    if (lastIndex < text.length) {
      results.push({
        type: 'text',
        content: text.slice(lastIndex),
      })
    }

    return results
  }, [text])

  return (
    <>
      {segments.map((segment, index): JSX.Element => {
        if (segment.type === 'text') {
          return <span key={`text-${index.toString()}`}>{segment.content}</span>
        }

        return (
          <EntityChip
            key={`entity-${index.toString()}`}
            type={segment.content.type}
            id={segment.content.id}
            name={segment.content.name}
            onClick={onEntityClick}
          />
        )
      })}
    </>
  )
}
