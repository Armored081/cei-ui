import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

import type { Thread } from '../types/chat'
import { relativeTime } from '../utils/relativeTime'
import './thread-card.css'

interface ThreadCardProps {
  thread: Thread
  isActive: boolean
  onSelect: (threadId: string) => void
  onArchive: (threadId: string) => void
  onPin: (threadId: string) => void
  onUnpin: (threadId: string) => void
}

function statusClassName(status: Thread['status']): string {
  if (status === 'active') {
    return 'cei-thread-card-status-dot cei-thread-card-status-dot-active'
  }

  if (status === 'archived') {
    return 'cei-thread-card-status-dot cei-thread-card-status-dot-archived'
  }

  return 'cei-thread-card-status-dot cei-thread-card-status-dot-idle'
}

export function ThreadCard({
  thread,
  isActive,
  onSelect,
  onArchive,
  onPin,
  onUnpin,
}: ThreadCardProps): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect((): (() => void) | void => {
    if (!isMenuOpen) {
      return
    }

    const onWindowMouseDown = (event: MouseEvent): void => {
      if (!menuRef.current) {
        return
      }

      if (!(event.target instanceof Node)) {
        return
      }

      if (menuRef.current.contains(event.target)) {
        return
      }

      setIsMenuOpen(false)
    }

    window.addEventListener('mousedown', onWindowMouseDown)

    return (): void => {
      window.removeEventListener('mousedown', onWindowMouseDown)
    }
  }, [isMenuOpen])

  const displayTitle = thread.title || 'New Thread'

  const onOpenContextMenu = (event: ReactMouseEvent): void => {
    event.preventDefault()
    setIsMenuOpen(true)
  }

  const cardClassName = `cei-thread-card${isActive ? ' cei-thread-card-active' : ''}`

  return (
    <article className={cardClassName} onContextMenu={onOpenContextMenu}>
      <button
        className="cei-thread-card-main"
        onClick={(): void => onSelect(thread.id)}
        type="button"
        aria-label={`Open thread ${displayTitle}`}
      >
        <span aria-hidden="true" className={statusClassName(thread.status)} />
        <div className="cei-thread-card-content">
          <p className="cei-thread-card-title">{displayTitle}</p>
          <p className="cei-thread-card-time">{relativeTime(thread.lastActivityAt)}</p>
        </div>
        {thread.artifactCount > 0 ? (
          <span className="cei-thread-card-artifacts" aria-label="Artifact count">
            {thread.artifactCount.toString()}
          </span>
        ) : null}
      </button>

      <div className="cei-thread-card-menu" ref={menuRef}>
        <button
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          className="cei-thread-card-menu-trigger"
          onClick={(): void => setIsMenuOpen((currentOpen: boolean): boolean => !currentOpen)}
          type="button"
          aria-label="Thread options"
        >
          ...
        </button>

        {isMenuOpen ? (
          <div className="cei-thread-card-menu-popover" role="menu">
            <button
              className="cei-thread-card-menu-item"
              onClick={(): void => {
                if (thread.isPinned) {
                  onUnpin(thread.id)
                } else {
                  onPin(thread.id)
                }
                setIsMenuOpen(false)
              }}
              type="button"
              role="menuitem"
            >
              {thread.isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              className="cei-thread-card-menu-item"
              onClick={(): void => {
                onArchive(thread.id)
                setIsMenuOpen(false)
              }}
              type="button"
              role="menuitem"
            >
              Archive
            </button>
          </div>
        ) : null}
      </div>
    </article>
  )
}
