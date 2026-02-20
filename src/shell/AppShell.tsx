import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { TopBar } from './TopBar'
import './app-shell.css'

interface AppNavLinkProps {
  end?: boolean
  icon: string
  label: string
  to: string
}

function toNavLinkClassName(isActive: boolean): string {
  return `cei-app-nav-link${isActive ? ' cei-app-nav-link-active' : ''}`
}

function AppNavLink({ to, label, icon, end }: AppNavLinkProps): JSX.Element {
  return (
    <NavLink to={to} end={end} className={({ isActive }): string => toNavLinkClassName(isActive)}>
      <span aria-hidden="true" className="cei-app-nav-icon">
        {icon}
      </span>
      <span className="cei-app-nav-text">{label}</span>
    </NavLink>
  )
}

/**
 * Application shell with sidebar navigation and route outlet.
 */
export function AppShell(): JSX.Element {
  const { logout, userEmail } = useAuth()
  const { pathname } = useLocation()
  const hideTopBar = pathname.startsWith('/chat')

  return (
    <div className="cei-app-layout">
      <aside aria-label="Primary navigation" className="cei-app-sidebar">
        <div className="cei-app-sidebar-main">
          <AppNavLink to="/" end icon="🏠" label="Home" />
          <AppNavLink to="/chat" icon="💬" label="Chat" />
          <AppNavLink to="/metrics" icon="📊" label="Metrics" />
          <AppNavLink to="/operations" icon="⚙️" label="Operations" />
          <AppNavLink to="/roadmap" icon="🗺️" label="Roadmap" />
        </div>

        <div className="cei-app-sidebar-footer">
          <AppNavLink to="/admin" icon="🔧" label="Admin" />
        </div>
      </aside>

      <div className="cei-app-frame">
        {hideTopBar ? null : <TopBar userEmail={userEmail} onLogout={(): void => void logout()} />}
        <main className="cei-app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
