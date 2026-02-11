import type { CSSProperties } from 'react'
import type { ToolLogItem } from '../hooks/useChatEngine'
import './tool-log-entry.css'

interface ToolLogEntryProps {
  entry: ToolLogItem
  onToggleExpand: (entryId: string) => void
}

function formatToolValue(value: unknown): string {
  return JSON.stringify(value, null, 2) || ''
}

export function ToolLogEntry({ entry, onToggleExpand }: ToolLogEntryProps): JSX.Element {
  const detailsStyle: CSSProperties = {
    display: entry.isExpanded ? 'block' : 'none',
  }

  return (
    <section className="cei-tool-log-entry">
      <button
        aria-expanded={entry.isExpanded}
        className="cei-tool-log-entry-toggle"
        onClick={(): void => onToggleExpand(entry.id)}
        type="button"
      >
        <span className="cei-tool-log-entry-indicator">
          {entry.status === 'running' ? (
            <span aria-hidden="true" className="cei-spinner" />
          ) : (
            <span className="cei-tool-log-entry-dot" />
          )}
        </span>
        <span className="cei-tool-log-entry-name">{entry.name}</span>
        <span className="cei-tool-log-entry-status">
          {entry.status === 'running' ? 'In progress' : 'Complete'}
        </span>
      </button>

      <pre className="cei-tool-log-entry-body" style={detailsStyle}>
        {entry.status === 'running' ? formatToolValue(entry.args) : formatToolValue(entry.result)}
      </pre>
    </section>
  )
}
