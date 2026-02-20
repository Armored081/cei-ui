import { isEntityType, type EntityType } from '../types/entity.js'

const ENTITY_PATTERN = /\[\[entity:([a-z_]+):([^\]|]+)\|([^\]]+)\]\]/g

/**
 * Parsed entity reference derived from inline entity notation.
 */
export interface ParsedEntityRef {
  type: EntityType
  id: string
  displayName: string
  raw: string
  startIndex: number
  endIndex: number
}

/**
 * Parse all [[entity:type:id|name]] references from text.
 * Returns parsed references and their text positions.
 */
export function parseEntityNotations(text: string): ParsedEntityRef[] {
  const results: ParsedEntityRef[] = []
  let match: RegExpExecArray | null

  const regex = new RegExp(ENTITY_PATTERN)

  while ((match = regex.exec(text)) !== null) {
    const [raw, parsedType, id, displayName] = match

    if (!isEntityType(parsedType)) {
      continue
    }

    results.push({
      type: parsedType,
      id,
      displayName,
      raw,
      startIndex: match.index,
      endIndex: match.index + raw.length,
    })
  }

  return results
}

/**
 * Strip [[entity:...]] notation from text, preserving display names.
 */
export function stripEntityNotation(text: string): string {
  return text.replace(ENTITY_PATTERN, '$3')
}
