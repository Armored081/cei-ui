import { useEffect, useState, type CSSProperties } from 'react'

import type { ToolLogItem } from '../hooks/useChatEngine'
import './tool-log-entry.css'

interface ToolLogEntryProps {
  entry: ToolLogItem
  isActive: boolean
  onToggleExpand: (entryId: string) => void
}

type ToolLogEntryStatus = 'complete' | 'idle' | 'running'

function formatToolValue(value: unknown): string {
  return JSON.stringify(value, null, 2) || ''
}

function toEntryStatus(status: ToolLogItem['status']): ToolLogEntryStatus {
  if (status === 'running') {
    return 'running'
  }

  if (status === 'complete') {
    return 'complete'
  }

  return 'idle'
}

function toStatusLabel(status: ToolLogEntryStatus): string {
  if (status === 'running') {
    return 'In progress'
  }

  if (status === 'complete') {
    return 'Complete'
  }

  return 'Idle'
}

function toStatusShape(status: ToolLogEntryStatus): string {
  if (status === 'running') {
    return '◔'
  }

  if (status === 'complete') {
    return '●'
  }

  return '○'
}

export function ToolLogEntry({ entry, isActive, onToggleExpand }: ToolLogEntryProps): JSX.Element {
  const [showPulse, setShowPulse] = useState<boolean>(false)
  const detailsStyle: CSSProperties = {
    display: entry.isExpanded ? 'block' : 'none',
  }

  const status = toEntryStatus(entry.status)

  useEffect((): (() => void) | void => {
    if (status !== 'running') {
      return
    }

    const startPulseTimeoutId = window.setTimeout((): void => {
      setShowPulse(true)
    }, 0)

    const timeoutId = window.setTimeout((): void => {
      setShowPulse(false)
    }, 420)

    return (): void => {
      window.clearTimeout(startPulseTimeoutId)
      window.clearTimeout(timeoutId)
    }
  }, [entry.id, status])

  const activeClassName = isActive ? ' cei-tool-log-entry-active' : ''
  const pulseClassName = showPulse ? ' cei-tool-log-entry-pulse' : ''

  return (
    <section className={`cei-tool-log-entry${activeClassName}${pulseClassName}`}>
      <button
        aria-expanded={entry.isExpanded}
        className="cei-tool-log-entry-toggle"
        onClick={(): void => onToggleExpand(entry.id)}
        type="button"
      >
        <span className="cei-tool-log-entry-indicator" aria-hidden="true">
          <span className={`cei-tool-log-entry-dot cei-tool-log-entry-dot-${status}`} />
        </span>
        <span className="cei-tool-log-entry-name">{entry.name}</span>
        <span className="cei-tool-log-entry-status">
          <span aria-hidden="true" className="cei-tool-log-entry-status-shape">
            {toStatusShape(status)}
          </span>
          {toStatusLabel(status)}
        </span>
      </button>

      <pre className="cei-tool-log-entry-body" style={detailsStyle}>
        {status === 'running' ? formatToolValue(entry.args) : formatToolValue(entry.result)}
      </pre>
    </section>
  )
}
