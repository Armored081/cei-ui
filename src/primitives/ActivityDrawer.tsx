import { useMemo } from 'react'

import type { ToolLogItem } from '../hooks/useChatEngine'
import './activity-drawer.css'

interface ActivityDrawerProps {
  currentExchangeMessageId: string | null
  isExpanded: boolean
  onToggleExpanded: () => void
  toolLog: ToolLogItem[]
}

function formatToolName(name: string): string {
  return name
    .split(/[_-]+/)
    .filter((part: string): boolean => part.length > 0)
    .join(' ')
}

function formatTimestamp(isoTimestamp: string | null): string {
  if (!isoTimestamp) {
    return '--:--:--'
  }

  const parsed = new Date(isoTimestamp)

  if (Number.isNaN(parsed.getTime())) {
    return '--:--:--'
  }

  return parsed.toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function summarizeToolEntry(entry: ToolLogItem): string {
  if (entry.status === 'running') {
    const argumentKeys = Object.keys(entry.args)

    if (argumentKeys.length === 0) {
      return 'Running'
    }

    return `Running with ${argumentKeys.slice(0, 2).join(', ')}`
  }

  if (typeof entry.result === 'string') {
    return entry.result.slice(0, 80)
  }

  if (entry.result && typeof entry.result === 'object') {
    if ('summary' in entry.result && typeof entry.result.summary === 'string') {
      return entry.result.summary.slice(0, 80)
    }

    const keys = Object.keys(entry.result as Record<string, unknown>)

    if (keys.length > 0) {
      return `Completed with ${keys.slice(0, 2).join(', ')}`
    }
  }

  return 'Complete'
}

function timestampFromEntry(entry: ToolLogItem): string | null {
  return entry.startedAt || entry.completedAt || null
}

function downloadActivityLogAsJson(
  entries: ToolLogItem[],
  currentExchangeMessageId: string | null,
): void {
  const payload = {
    exchangeMessageId: currentExchangeMessageId,
    exportedAt: new Date().toISOString(),
    items: entries.map((entry: ToolLogItem) => ({
      args: entry.args,
      completedAt: entry.completedAt || null,
      id: entry.id,
      name: entry.name,
      result: entry.result,
      sourceMessageId: entry.sourceMessageId,
      startedAt: entry.startedAt || null,
      status: entry.status,
      summary: summarizeToolEntry(entry),
    })),
  }

  const jsonPayload = JSON.stringify(payload, null, 2)
  const blob = new Blob([jsonPayload], { type: 'application/json' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = `activity-log-${currentExchangeMessageId || 'exchange'}.json`
  anchor.click()

  URL.revokeObjectURL(objectUrl)
}

export function ActivityDrawer({
  currentExchangeMessageId,
  isExpanded,
  onToggleExpanded,
  toolLog,
}: ActivityDrawerProps): JSX.Element {
  const exchangeToolLog = useMemo(
    (): ToolLogItem[] =>
      currentExchangeMessageId
        ? toolLog.filter(
            (entry: ToolLogItem): boolean => entry.sourceMessageId === currentExchangeMessageId,
          )
        : [],
    [currentExchangeMessageId, toolLog],
  )

  const latestTool = exchangeToolLog.length > 0 ? exchangeToolLog[exchangeToolLog.length - 1] : null
  const isActive = latestTool?.status === 'running'

  const summary = latestTool
    ? isActive
      ? `Querying ${formatToolName(latestTool.name)}...`
      : `Last tool: ${formatToolName(latestTool.name)}`
    : 'No recent activity'
  const actionTabIndex = isExpanded ? 0 : -1

  return (
    <div className={`cei-activity-drawer${isExpanded ? ' cei-activity-drawer-expanded' : ''}`}>
      <div
        aria-hidden={!isExpanded}
        className="cei-activity-drawer-panel"
        data-testid="activity-drawer-panel"
      >
        <header className="cei-activity-drawer-header">
          <h4 className="cei-activity-drawer-title">Activity Log</h4>
          <div className="cei-activity-drawer-actions">
            <button
              className="cei-activity-drawer-action"
              onClick={(): void =>
                downloadActivityLogAsJson(exchangeToolLog, currentExchangeMessageId)
              }
              tabIndex={actionTabIndex}
              type="button"
            >
              Export JSON
            </button>
            <button
              aria-label="Collapse activity log"
              className="cei-activity-drawer-action"
              onClick={onToggleExpanded}
              tabIndex={actionTabIndex}
              type="button"
            >
              Collapse
            </button>
          </div>
        </header>

        <div className="cei-activity-drawer-body" role="log" aria-label="Activity log entries">
          {exchangeToolLog.length === 0 ? (
            <p className="cei-activity-drawer-empty">No activity in this exchange yet</p>
          ) : (
            <ul className="cei-activity-drawer-list">
              {exchangeToolLog.map((entry: ToolLogItem): JSX.Element => {
                const statusLabel = entry.status === 'running' ? 'In progress' : 'Complete'
                const statusClassName =
                  entry.status === 'running'
                    ? 'cei-activity-drawer-dot-running'
                    : 'cei-activity-drawer-dot-complete'

                return (
                  <li className="cei-activity-drawer-entry" key={entry.id}>
                    <span
                      className={`cei-activity-drawer-dot ${statusClassName}`}
                      aria-hidden="true"
                    />
                    <div className="cei-activity-drawer-entry-content">
                      <div className="cei-activity-drawer-entry-line">
                        <time
                          className="cei-activity-drawer-entry-time"
                          dateTime={timestampFromEntry(entry) || undefined}
                        >
                          {formatTimestamp(timestampFromEntry(entry))}
                        </time>
                        <span className="cei-activity-drawer-entry-name">
                          {formatToolName(entry.name)}
                        </span>
                        <span className="cei-activity-drawer-entry-status">{statusLabel}</span>
                      </div>
                      <p className="cei-activity-drawer-entry-summary">
                        {summarizeToolEntry(entry)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <button
        aria-expanded={isExpanded}
        aria-label="Activity summary"
        className="cei-activity-bar"
        onClick={onToggleExpanded}
        type="button"
      >
        <span
          aria-hidden="true"
          className={`cei-activity-bar-icon${isActive ? ' cei-activity-bar-icon-active' : ''}`}
        >
          ⚡
        </span>
        <span className="cei-activity-bar-summary">{summary}</span>
        <span className="cei-activity-bar-count">{exchangeToolLog.length.toString()}</span>
        <span aria-hidden="true" className="cei-activity-bar-chevron">
          {isExpanded ? '▼' : '▲'}
        </span>
      </button>
    </div>
  )
}
