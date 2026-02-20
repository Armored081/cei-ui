import { ArtifactRegistry } from './ArtifactRegistry.js'
import { assessmentDetailArtifactDefinition } from './renderers/AssessmentDetailArtifact.js'
import { assessmentListArtifactDefinition } from './renderers/AssessmentListArtifact.js'
import { chartArtifactDefinition } from './renderers/ChartArtifact.js'
import { documentArtifactDefinition } from './renderers/DocumentArtifact.js'
import { entityGraphArtifactDefinition } from './renderers/EntityGraphArtifact.js'
import { recommendationArtifactDefinition } from './renderers/RecommendationArtifact.js'
import { storyCardArtifactDefinition } from './renderers/StoryCardArtifact.js'
import { tableArtifactDefinition } from './renderers/TableArtifact.js'
import { vizHintArtifactDefinition } from './renderers/VizHintArtifact.js'

let areBuiltinTypesRegistered = false

const builtinDefinitions = [
  chartArtifactDefinition,
  tableArtifactDefinition,
  recommendationArtifactDefinition,
  assessmentListArtifactDefinition,
  assessmentDetailArtifactDefinition,
  documentArtifactDefinition,
  storyCardArtifactDefinition,
  vizHintArtifactDefinition,
  entityGraphArtifactDefinition,
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
