import { useCallback, useState } from 'react'

import { entityTypeSchema, type EntityReference } from '../types/modern-context.js'

/**
 * Artifact-focused rail modes that can be restored when entity detail closes.
 */
export type ArtifactRailMode = 'artifacts-only' | 'stories+artifacts'

/**
 * Full set of context rail modes.
 */
export type ContextRailMode = ArtifactRailMode | 'entity-detail'

/**
 * State for the entity detail panel and restoration behavior.
 */
export interface EntityPanelState {
  isOpen: boolean
  activeEntity: EntityReference | null
  sourceMessageId: string | null
  previousRailMode: ArtifactRailMode
}

/**
 * Hook API for opening and closing entity detail.
 */
export interface UseEntityPanelResult {
  isOpen: boolean
  activeEntity: EntityReference | null
  sourceMessageId: string | null
  openEntity: (entity: EntityReference, messageId: string) => void
  closePanel: () => void
  previousRailMode: ArtifactRailMode
}

function createInitialState(): EntityPanelState {
  return {
    isOpen: false,
    activeEntity: null,
    sourceMessageId: null,
    previousRailMode: 'artifacts-only',
  }
}

/**
 * Tracks entity panel state while remembering the prior rail mode for restoration.
 */
export function useEntityPanel(currentRailMode: ArtifactRailMode): UseEntityPanelResult {
  const [state, setState] = useState<EntityPanelState>(createInitialState)

  const openEntity = useCallback(
    (entity: EntityReference, messageId: string): void => {
      const parsedType = entityTypeSchema.safeParse(entity.type)

      if (!parsedType.success) {
        return
      }

      setState({
        isOpen: true,
        activeEntity: {
          ...entity,
          type: parsedType.data,
        },
        sourceMessageId: messageId,
        previousRailMode: currentRailMode,
      })
    },
    [currentRailMode],
  )

  const closePanel = useCallback((): void => {
    setState(
      (currentState: EntityPanelState): EntityPanelState => ({
        ...currentState,
        isOpen: false,
        activeEntity: null,
        sourceMessageId: null,
      }),
    )
  }, [])

  return {
    isOpen: state.isOpen,
    activeEntity: state.activeEntity,
    sourceMessageId: state.sourceMessageId,
    openEntity,
    closePanel,
    previousRailMode: state.previousRailMode,
  }
}
