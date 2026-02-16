import { DocumentCard } from '../../primitives/DocumentCard.js'
import { DocumentPanel } from '../../primitives/DocumentPanel.js'
import type { Artifact } from '../../hooks/useChatEngine.js'
import type { ArtifactTypeDefinition } from '../ArtifactRegistry.js'

function renderInline(artifact: Artifact): JSX.Element {
  return <DocumentCard artifact={artifact} onClick={(): void => {}} />
}

function renderExpanded(artifact: Artifact, _state?: void, onClose?: () => void): JSX.Element {
  return <DocumentPanel artifact={artifact} onClose={onClose || ((): void => {})} />
}

function renderFullScreen(artifact: Artifact, _state?: void, onClose?: () => void): JSX.Element {
  return <DocumentPanel artifact={artifact} onClose={onClose || ((): void => {})} fullScreen />
}

export const documentArtifactDefinition: ArtifactTypeDefinition = {
  kind: 'document',
  renderInline,
  renderExpanded,
  renderFullScreen,
}
