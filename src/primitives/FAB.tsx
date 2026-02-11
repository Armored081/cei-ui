import './fab.css'

type FABPosition = 'bottom-left' | 'bottom-right'

interface FABProps {
  label: string
  badge?: number
  onClick: () => void
  position: FABPosition
}

export function FAB({ label, badge, onClick, position }: FABProps): JSX.Element {
  return (
    <button
      className={`cei-fab cei-fab-${position}`}
      onClick={onClick}
      type="button"
      aria-label={label}
    >
      <span className="cei-fab-label">{label}</span>
      {badge !== undefined && badge > 0 ? (
        <span className="cei-fab-badge">{badge}</span>
      ) : null}
    </button>
  )
}
