import { ArtifactRegistry } from './ArtifactRegistry'
import { chartArtifactDefinition } from './renderers/ChartArtifact'
import { recommendationArtifactDefinition } from './renderers/RecommendationArtifact'
import { tableArtifactDefinition } from './renderers/TableArtifact'

let areBuiltinTypesRegistered = false

const builtinDefinitions = [
  chartArtifactDefinition,
  tableArtifactDefinition,
  recommendationArtifactDefinition,
]

/**
 * Registers built-in artifact renderers exactly once.
 */
export function registerBuiltinArtifactTypes(): void {
  if (areBuiltinTypesRegistered) {
    return
  }

  builtinDefinitions.forEach((definition) => {
    if (!ArtifactRegistry.has(definition.kind)) {
      ArtifactRegistry.register(definition)
    }
  })

  areBuiltinTypesRegistered = true
}
