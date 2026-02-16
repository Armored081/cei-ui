import { ArtifactRegistry } from './ArtifactRegistry'
import { assessmentDetailArtifactDefinition } from './renderers/AssessmentDetailArtifact'
import { assessmentListArtifactDefinition } from './renderers/AssessmentListArtifact'
import { chartArtifactDefinition } from './renderers/ChartArtifact'
import { documentArtifactDefinition } from './renderers/DocumentArtifact'
import { recommendationArtifactDefinition } from './renderers/RecommendationArtifact'
import { tableArtifactDefinition } from './renderers/TableArtifact'

let areBuiltinTypesRegistered = false

const builtinDefinitions = [
  chartArtifactDefinition,
  tableArtifactDefinition,
  recommendationArtifactDefinition,
  assessmentListArtifactDefinition,
  assessmentDetailArtifactDefinition,
  documentArtifactDefinition,
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
