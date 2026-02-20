import { z } from 'zod'

import type { Artifact } from '../../hooks/useChatEngine.js'
import { vizHintSchema } from '../../types/modern-context.js'
import { VizHintRenderer } from '../../viz/VizHintRenderer.js'
import type { ArtifactTypeDefinition } from '../ArtifactRegistry.js'
import './artifact-renderers.css'

const wrappedHintSchema = z.object({
  hint: vizHintSchema,
})

function parseVizHint(artifact: Artifact) {
  const direct = vizHintSchema.safeParse(artifact.block as unknown)

  if (direct.success) {
    return direct.data
  }

  const wrapped = wrappedHintSchema.safeParse(artifact.block as unknown)

  if (wrapped.success) {
    return wrapped.data.hint
  }

  return null
}

function renderInline(artifact: Artifact): JSX.Element {
  const hint = parseVizHint(artifact)

  if (!hint) {
    return <p className="cei-artifact-inline-preview">Unsupported viz hint artifact.</p>
  }

  return (
    <>
      <div className="cei-artifact-inline-header">
        <span aria-hidden="true" className="cei-artifact-inline-icon">
          {'\u{1F4C8}'}
        </span>
        <span className="cei-artifact-inline-kind">Visualization</span>
      </div>
      <p className="cei-artifact-inline-title">{hint.title || artifact.title}</p>
      <p className="cei-artifact-inline-preview">{hint.chartType}</p>
    </>
  )
}

function renderExpanded(artifact: Artifact): JSX.Element {
  const hint = parseVizHint(artifact)

  if (!hint) {
    return <p>Unsupported viz hint artifact.</p>
  }

  return (
    <div className="cei-artifact-expanded-content">
      <VizHintRenderer height={320} hint={hint} width={760} />
    </div>
  )
}

function renderFullScreen(artifact: Artifact): JSX.Element {
  const hint = parseVizHint(artifact)

  if (!hint) {
    return <p>Unsupported viz hint artifact.</p>
  }

  return (
    <div className="cei-artifact-fullscreen-content">
      <VizHintRenderer height={680} hint={hint} width={1120} />
    </div>
  )
}

/**
 * Built-in viz-hint artifact renderer definition.
 */
export const vizHintArtifactDefinition: ArtifactTypeDefinition = {
  kind: 'viz-hint',
  renderInline,
  renderExpanded,
  renderFullScreen,
}
