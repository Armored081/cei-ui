import './artifact-pill.css'

interface ArtifactPillProps {
  artifactId: string
  kind: string
  title: string
  onClick: (artifactId: string) => void
}

function kindIcon(kind: string): string {
  if (kind === 'chart') return '\u{1F4CA}'
  if (kind === 'table') return '\u{1F4CB}'
  return '\u{1F6E1}'
}

export function ArtifactPill({ artifactId, kind, title, onClick }: ArtifactPillProps): JSX.Element {
  return (
    <button className="cei-artifact-pill" onClick={(): void => onClick(artifactId)} type="button">
      <span className="cei-artifact-pill-icon">{kindIcon(kind)}</span>
      <span className="cei-artifact-pill-title">{title}</span>
    </button>
  )
}
