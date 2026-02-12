import type { Artifact } from '../hooks/useChatEngine'

/**
 * User-triggered action descriptor for a stateful artifact type.
 */
export interface ArtifactAction {
  type: string
  payload?: unknown
}

/**
 * Registry contract for rendering and optional state management per artifact type.
 */
export interface ArtifactTypeDefinition<TState = void> {
  kind: string
  renderInline: (artifact: Artifact, state?: TState) => JSX.Element
  renderExpanded: (artifact: Artifact, state?: TState, onClose?: () => void) => JSX.Element
  renderFullScreen: (
    artifact: Artifact,
    state?: TState,
    onClose?: () => void,
    onToggleFullScreen?: () => void,
  ) => JSX.Element
  onAction?: (artifact: Artifact, action: ArtifactAction) => Promise<TState>
  serializeState?: (state: TState) => string
  deserializeState?: (serialized: string) => TState
}

function validateDefinition(definition: ArtifactTypeDefinition<unknown>): void {
  const { kind, renderExpanded, renderFullScreen, renderInline } = definition

  if (!kind.trim()) {
    throw new Error('Artifact type definition kind must be non-empty.')
  }

  if (typeof renderInline !== 'function') {
    throw new Error(`Artifact type "${kind}" is missing renderInline.`)
  }

  if (typeof renderExpanded !== 'function') {
    throw new Error(`Artifact type "${kind}" is missing renderExpanded.`)
  }

  if (typeof renderFullScreen !== 'function') {
    throw new Error(`Artifact type "${kind}" is missing renderFullScreen.`)
  }
}

/**
 * In-memory artifact type registry.
 */
export class ArtifactRegistryImpl {
  private readonly registry: Map<string, ArtifactTypeDefinition<unknown>> = new Map()

  /**
   * Registers a type definition by artifact kind.
   */
  register<TState = void>(definition: ArtifactTypeDefinition<TState>): void {
    validateDefinition(definition as ArtifactTypeDefinition<unknown>)

    if (this.registry.has(definition.kind)) {
      throw new Error(`Artifact type "${definition.kind}" is already registered.`)
    }

    this.registry.set(definition.kind, definition as ArtifactTypeDefinition<unknown>)
  }

  /**
   * Resolves a definition by artifact kind.
   */
  get(kind: string): ArtifactTypeDefinition<unknown> | undefined {
    return this.registry.get(kind)
  }

  /**
   * Returns whether a kind has a registered definition.
   */
  has(kind: string): boolean {
    return this.registry.has(kind)
  }
}

/**
 * Global singleton registry used by Command Center artifact views.
 */
export const ArtifactRegistry = new ArtifactRegistryImpl()
