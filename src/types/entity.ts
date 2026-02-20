import { entityTypeSchema, type EntityType as ModernContextEntityType } from './modern-context.js'

/**
 * All supported entity types referenced by inline entity notations.
 */
export type EntityType = ModernContextEntityType

/**
 * Canonical list of supported entity types.
 */
export const ENTITY_TYPES: readonly EntityType[] = entityTypeSchema.options

const ENTITY_TYPE_SET: ReadonlySet<string> = new Set(ENTITY_TYPES)

/**
 * Runtime guard for entity type values parsed from free-form text.
 */
export function isEntityType(value: string): value is EntityType {
  return ENTITY_TYPE_SET.has(value)
}

/**
 * Minimal entity reference used by click handlers and parser output.
 */
export interface EntityReference {
  type: EntityType
  id: string
  name: string
}
