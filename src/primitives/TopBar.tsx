import { useNavigate } from 'react-router-dom'

import './top-bar.css'

interface TopBarProps {
  userEmail: string
  onLogout: () => void
}

export function TopBar({ userEmail, onLogout }: TopBarProps): JSX.Element {
  const navigate = useNavigate()

  return (
    <header className="cei-topbar">
      <div className="cei-topbar-left">
        <span className="cei-topbar-diamond" aria-hidden="true">
          ◆
        </span>
        <span className="cei-topbar-wordmark">CEI</span>
      </div>
      <div className="cei-topbar-right">
        <nav className="cei-topbar-nav">
          <button
            className="cei-topbar-nav-button"
            onClick={() => navigate('/roadmap')}
            type="button"
          >
            Roadmap
          </button>
          <button
            className="cei-topbar-nav-button"
            onClick={() => undefined}
            type="button"
            disabled
            title="Coming soon"
          >
            Feedback
          </button>
        </nav>
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
