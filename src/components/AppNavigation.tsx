import { NavLink } from 'react-router-dom'

import './AppNavigation.css'

function toNavLinkClassName(isActive: boolean): string {
  return isActive ? 'cei-app-nav-link cei-app-nav-link-active' : 'cei-app-nav-link'
}

export function AppNavigation(): JSX.Element {
  return (
    <nav aria-label="Primary" className="cei-app-nav">
      <NavLink className={({ isActive }): string => toNavLinkClassName(isActive)} to="/">
        Chat
      </NavLink>
      <NavLink className={({ isActive }): string => toNavLinkClassName(isActive)} to="/assessments">
        Assessments
      </NavLink>
    </nav>
  )
}
