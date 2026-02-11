import type { LayoutId } from '../layouts/types'
import { AppNavigation } from '../components/AppNavigation'
import './top-bar.css'

interface TopBarProps {
  activeLayout: LayoutId
  onChangeLayout: (layout: LayoutId) => void
  userEmail: string
  onLogout: () => void
}

const layoutIcons: { id: LayoutId; label: string; symbol: string }[] = [
  { id: 'command-center', label: 'Command Center', symbol: '\u25A6' },
  { id: 'focus', label: 'Focus', symbol: '\u25CE' },
  { id: 'workspace', label: 'Workspace', symbol: '\u25A4' },
]

export function TopBar({
  activeLayout,
  onChangeLayout,
  userEmail,
  onLogout,
}: TopBarProps): JSX.Element {
  return (
    <header className="cei-topbar">
      <div className="cei-topbar-left">
        <span className="cei-topbar-wordmark">CEI</span>
      </div>

      <div className="cei-topbar-center">
        <AppNavigation />
      </div>

      <div className="cei-topbar-right">
        <div className="cei-topbar-layout-switcher" role="group" aria-label="Layout switcher">
          {layoutIcons.map((layout) => (
            <button
              key={layout.id}
              className={`cei-topbar-layout-btn${activeLayout === layout.id ? ' cei-topbar-layout-btn-active' : ''}`}
              onClick={(): void => onChangeLayout(layout.id)}
              title={layout.label}
              type="button"
              aria-pressed={activeLayout === layout.id}
            >
              {layout.symbol}
            </button>
          ))}
        </div>

        <div className="cei-topbar-user">
          <span className="cei-topbar-email">{userEmail}</span>
          <button className="cei-topbar-signout" onClick={onLogout} type="button">
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
