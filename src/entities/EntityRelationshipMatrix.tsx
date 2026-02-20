import { useMemo } from 'react'

import type { EntityGraph, EntityReference } from '../types/modern-context.js'
import './entity-topology.css'

interface EntityRelationshipMatrixProps {
  graph: EntityGraph
  onEntityClick?: (entity: EntityReference) => void
}

interface RelationshipRow {
  source: EntityReference
  relationshipType: string
  target: EntityReference
}

/**
 * Sorted relationship matrix fallback for large entity graphs.
 */
export function EntityRelationshipMatrix({
  graph,
  onEntityClick,
}: EntityRelationshipMatrixProps): JSX.Element {
  const rows = useMemo((): RelationshipRow[] => {
    return [...graph.edges]
      .sort((left, right) => left.relationshipType.localeCompare(right.relationshipType))
      .map((edge) => ({
        source: edge.source,
        relationshipType: edge.relationshipType,
        target: edge.target,
      }))
  }, [graph.edges])

  if (rows.length === 0) {
    return (
      <div className="cei-entity-matrix" data-testid="entity-relationship-matrix">
        <p className="cei-entity-matrix-empty">No entity relationships to display.</p>
      </div>
    )
  }

  return (
    <div className="cei-entity-matrix" data-testid="entity-relationship-matrix">
      <table>
        <thead>
          <tr>
            <th scope="col">Source Entity</th>
            <th scope="col">Relationship</th>
            <th scope="col">Target Entity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.source.id}-${row.target.id}-${row.relationshipType}-${index.toString()}`}
            >
              <td>
                <button
                  className="cei-entity-matrix-btn"
                  onClick={(): void => onEntityClick?.(row.source)}
                  type="button"
                >
                  {row.source.name}
                </button>
              </td>
              <td>{row.relationshipType}</td>
              <td>
                <button
                  className="cei-entity-matrix-btn"
                  onClick={(): void => onEntityClick?.(row.target)}
                  type="button"
                >
                  {row.target.name}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
