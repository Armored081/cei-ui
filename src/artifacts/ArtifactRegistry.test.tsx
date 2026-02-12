import { describe, expect, it } from 'vitest'

import type { ArtifactTypeDefinition } from './ArtifactRegistry'
import { ArtifactRegistryImpl } from './ArtifactRegistry'

function buildDefinition(kind: string): ArtifactTypeDefinition {
  return {
    kind,
    renderInline: () => <div>inline</div>,
    renderExpanded: () => <div>expanded</div>,
    renderFullScreen: () => <div>fullscreen</div>,
  }
}

describe('ArtifactRegistry', (): void => {
  it('registers and resolves definitions by kind', (): void => {
    const registry = new ArtifactRegistryImpl()
    const definition = buildDefinition('custom-kind')

    registry.register(definition)

    expect(registry.has('custom-kind')).toBe(true)
    expect(registry.get('custom-kind')).toBe(definition)
  })

  it('throws when registering a duplicate kind', (): void => {
    const registry = new ArtifactRegistryImpl()

    registry.register(buildDefinition('duplicate-kind'))

    expect((): void => {
      registry.register(buildDefinition('duplicate-kind'))
    }).toThrowError('already registered')
  })

  it('validates required definition fields', (): void => {
    const registry = new ArtifactRegistryImpl()

    expect((): void => {
      registry.register(buildDefinition(''))
    }).toThrowError('must be non-empty')
  })
})
