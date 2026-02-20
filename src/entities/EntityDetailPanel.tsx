import { useMemo, useState } from 'react'

import type { ModernContext, EntityReference } from '../types/modern-context.js'
import { entityTypeSchema } from '../types/modern-context.js'
import { EntityBadge } from './EntityBadge.js'
import '../styles/entity-detail-panel.css'

type EntityDetailTab = 'overview' | 'related' | 'graph'

interface RelatedEntityItem {
  direction: 'incoming' | 'outgoing'
  entity: EntityReference
  relationshipType: string
}

/**
 * Props for rendering a right-rail entity detail panel.
 */
export interface EntityDetailPanelProps {
  entity: EntityReference
  modernContext: ModernContext | null
  onBack: () => void
  onClose: () => void
}

function isSameEntity(left: EntityReference, right: EntityReference): boolean {
  return left.type === right.type && left.id === right.id
}

function toRelatedEntityItems(
  entity: EntityReference,
  modernContext: ModernContext | null,
): RelatedEntityItem[] {
  if (!modernContext) {
    return []
  }

  const uniqueEntries = new Set<string>()
  const results: RelatedEntityItem[] = []

  for (const edge of modernContext.entityGraph.edges) {
    if (isSameEntity(edge.source, entity)) {
      const key = `outgoing:${edge.relationshipType}:${edge.target.type}:${edge.target.id}`

      if (!uniqueEntries.has(key)) {
        uniqueEntries.add(key)
        results.push({
          direction: 'outgoing',
          entity: edge.target,
          relationshipType: edge.relationshipType,
        })
      }
    }

    if (isSameEntity(edge.target, entity)) {
      const key = `incoming:${edge.relationshipType}:${edge.source.type}:${edge.source.id}`

      if (!uniqueEntries.has(key)) {
        uniqueEntries.add(key)
        results.push({
          direction: 'incoming',
          entity: edge.source,
          relationshipType: edge.relationshipType,
        })
      }
    }
  }

  return results
}

function renderAttributeValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value.toString()
  }

  return JSON.stringify(value) || ''
}

/**
 * Slide-in panel for entity-level details and graph relationships.
 */
export function EntityDetailPanel({
  entity,
  modernContext,
  onBack,
  onClose,
}: EntityDetailPanelProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<EntityDetailTab>('overview')
  const parsedEntityType = entityTypeSchema.safeParse(entity.type)

  const relatedEntities = useMemo(
    (): RelatedEntityItem[] => toRelatedEntityItems(entity, modernContext),
    [entity, modernContext],
  )

  const attributeEntries = useMemo(
    (): Array<[string, unknown]> => Object.entries(entity.attributes || {}),
    [entity.attributes],
  )

  const description =
    typeof entity.attributes?.description === 'string'
      ? entity.attributes.description
      : 'Description coming soon.'

  if (!parsedEntityType.success) {
    return (
      <section className="cei-entity-detail-panel">
        <header className="cei-entity-detail-header">
          <h3 className="cei-entity-detail-title">Entity detail unavailable</h3>
          <button className="cei-entity-detail-close" onClick={onClose} type="button">
            Close
          </button>
        </header>
        <p className="cei-entity-detail-empty">
          Entity payload was invalid and could not be rendered.
        </p>
      </section>
    )
  }

  return (
    <section className="cei-entity-detail-panel" aria-label="Entity details">
      <header className="cei-entity-detail-header">
        <div className="cei-entity-detail-heading">
          <h3 className="cei-entity-detail-title">{entity.name}</h3>
          <EntityBadge type={parsedEntityType.data} />
        </div>
        <button className="cei-entity-detail-close" onClick={onClose} type="button">
          Close
        </button>
      </header>

      <button className="cei-entity-detail-back" onClick={onBack} type="button">
        Back to Artifacts
      </button>

      <div aria-label="Entity detail tabs" className="cei-entity-detail-tabs" role="tablist">
        <button
          aria-controls="entity-overview-panel"
          aria-selected={activeTab === 'overview'}
          className="cei-entity-detail-tab"
          id="entity-overview-tab"
          onClick={(): void => setActiveTab('overview')}
          role="tab"
          type="button"
        >
          Overview
        </button>
        <button
          aria-controls="entity-related-panel"
          aria-selected={activeTab === 'related'}
          className="cei-entity-detail-tab"
          id="entity-related-tab"
          onClick={(): void => setActiveTab('related')}
          role="tab"
          type="button"
        >
          Related
        </button>
        <button
          aria-controls="entity-graph-panel"
          aria-selected={activeTab === 'graph'}
          className="cei-entity-detail-tab"
          id="entity-graph-tab"
          onClick={(): void => setActiveTab('graph')}
          role="tab"
          type="button"
        >
          Graph
        </button>
      </div>

      <div className="cei-entity-detail-body">
        {activeTab === 'overview' ? (
          <section
            aria-labelledby="entity-overview-tab"
            className="cei-entity-detail-section"
            id="entity-overview-panel"
            role="tabpanel"
          >
            <dl className="cei-entity-detail-metadata">
              <div>
                <dt>Type</dt>
                <dd>{parsedEntityType.data}</dd>
              </div>
              <div>
                <dt>ID</dt>
                <dd>{entity.id}</dd>
              </div>
              <div>
                <dt>Name</dt>
                <dd>{entity.name}</dd>
              </div>
            </dl>
            <p className="cei-entity-detail-description">{description}</p>
            {attributeEntries.length > 0 ? (
              <ul className="cei-entity-detail-attributes">
                {attributeEntries.map(([key, value]) => (
                  <li key={key}>
                    <span>{key}</span>
                    <code>{renderAttributeValue(value)}</code>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {activeTab === 'related' ? (
          <section
            aria-labelledby="entity-related-tab"
            className="cei-entity-detail-section"
            id="entity-related-panel"
            role="tabpanel"
          >
            {relatedEntities.length === 0 ? (
              <p className="cei-entity-detail-empty">
                No related entities in this message context.
              </p>
            ) : (
              <ul className="cei-entity-detail-related-list">
                {relatedEntities.map((item, index) => (
                  <li
                    key={`${item.entity.type}:${item.entity.id}:${item.relationshipType}:${index.toString()}`}
                  >
                    <EntityBadge type={item.entity.type} />
                    <div>
                      <p>{item.entity.name}</p>
                      <p>
                        {item.relationshipType} ({item.direction})
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {activeTab === 'graph' ? (
          <section
            aria-labelledby="entity-graph-tab"
            className="cei-entity-detail-section"
            id="entity-graph-panel"
            role="tabpanel"
          >
            <div className="cei-entity-detail-graph-placeholder">
              <p>Mini topology preview</p>
              <p>Coming soon</p>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  )
}
