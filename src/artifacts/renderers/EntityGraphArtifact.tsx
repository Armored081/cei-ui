import { z } from 'zod'

import { EntityRelationshipMatrix } from '../../entities/EntityRelationshipMatrix.js'
import { EntityTopology } from '../../entities/EntityTopology.js'
import type { Artifact } from '../../hooks/useChatEngine.js'
import { entityGraphSchema } from '../../types/modern-context.js'
import type { ArtifactTypeDefinition } from '../ArtifactRegistry.js'
import './artifact-renderers.css'

const wrappedGraphSchema = z.object({
  graph: entityGraphSchema,
})

function parseEntityGraph(artifact: Artifact) {
  const direct = entityGraphSchema.safeParse(artifact.block as unknown)

  if (direct.success) {
    return direct.data
  }

  const wrapped = wrappedGraphSchema.safeParse(artifact.block as unknown)

  if (wrapped.success) {
    return wrapped.data.graph
  }

  return null
}

function renderGraph(
  graph: ReturnType<typeof parseEntityGraph>,
  width: number,
  height: number,
): JSX.Element {
  if (!graph) {
    return <p>Unsupported entity graph artifact.</p>
  }

  if (graph.nodes.length > 50) {
    return <EntityRelationshipMatrix graph={graph} />
  }

  return <EntityTopology graph={graph} height={height} width={width} />
}

function renderInline(artifact: Artifact): JSX.Element {
  const graph = parseEntityGraph(artifact)

  if (!graph) {
    return <p className="cei-artifact-inline-preview">Unsupported entity graph artifact.</p>
  }

  return (
    <>
      <div className="cei-artifact-inline-header">
        <span aria-hidden="true" className="cei-artifact-inline-icon">
          {'\u{1F517}'}
        </span>
        <span className="cei-artifact-inline-kind">Entity Graph</span>
      </div>
      <p className="cei-artifact-inline-title">{artifact.title}</p>
      <p className="cei-artifact-inline-preview">
        {graph.nodes.length.toString()} nodes • {graph.edges.length.toString()} edges
      </p>
    </>
  )
}

function renderExpanded(artifact: Artifact): JSX.Element {
  const graph = parseEntityGraph(artifact)

  return <div className="cei-artifact-expanded-content">{renderGraph(graph, 760, 420)}</div>
}

function renderFullScreen(artifact: Artifact): JSX.Element {
  const graph = parseEntityGraph(artifact)

  return <div className="cei-artifact-fullscreen-content">{renderGraph(graph, 1180, 760)}</div>
}

/**
 * Built-in entity-graph artifact renderer definition.
 */
export const entityGraphArtifactDefinition: ArtifactTypeDefinition = {
  kind: 'entity-graph',
  renderInline,
  renderExpanded,
  renderFullScreen,
}
