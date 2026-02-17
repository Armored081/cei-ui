import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { FeedbackSlideOver } from '../feedback/FeedbackSlideOver'
import './top-bar.css'

interface TopBarProps {
  userEmail: string
  onLogout: () => void
}

export function TopBar({ userEmail, onLogout }: TopBarProps): JSX.Element {
  const navigate = useNavigate()
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false)
  const onNavigateHome = (): void => {
    navigate('/')
  }

  return (
    <>
      <header className="cei-topbar">
        <button
          aria-label="Go to home"
          className="cei-topbar-brand-button cei-topbar-left"
          onClick={onNavigateHome}
          type="button"
        >
          <span className="cei-topbar-diamond" aria-hidden="true">
            ◆
          </span>
          <span className="cei-topbar-wordmark">CEI</span>
        </button>
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
              onClick={(): void => navigate('/feedback')}
              type="button"
            >
              Dashboard
            </button>
            <button
              className="cei-topbar-nav-button"
              onClick={(): void => setIsFeedbackOpen(true)}
              type="button"
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
      {isFeedbackOpen ? (
        <FeedbackSlideOver isOpen={isFeedbackOpen} onClose={(): void => setIsFeedbackOpen(false)} />
      ) : null}
    </>
  )
}
