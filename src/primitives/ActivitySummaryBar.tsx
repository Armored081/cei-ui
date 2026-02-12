import type { ToolLogItem } from '../hooks/useChatEngine'
import './activity-bar.css'

interface ActivitySummaryBarProps {
  toolLog: ToolLogItem[]
}

function formatToolName(name: string): string {
  return name
    .split(/[_-]+/)
    .filter((part: string): boolean => part.length > 0)
    .join(' ')
}

export function ActivitySummaryBar({ toolLog }: ActivitySummaryBarProps): JSX.Element {
  const latestTool = toolLog.length > 0 ? toolLog[toolLog.length - 1] : null
  const countForLatestExchange = latestTool
    ? toolLog.filter(
        (tool: ToolLogItem): boolean => tool.sourceMessageId === latestTool.sourceMessageId,
      ).length
    : 0

  const isActive = latestTool?.status === 'running'

  const summary = latestTool
    ? isActive
      ? `Querying ${formatToolName(latestTool.name)}...`
      : `Last tool: ${formatToolName(latestTool.name)}`
    : 'No recent activity'

  return (
    <button
      className="cei-activity-bar"
      onClick={(): void => {}}
      type="button"
      aria-label="Activity summary"
    >
      <span
        aria-hidden="true"
        className={`cei-activity-bar-icon${isActive ? ' cei-activity-bar-icon-active' : ''}`}
      >
        ⚡
      </span>
      <span className="cei-activity-bar-summary">{summary}</span>
      <span className="cei-activity-bar-count">{countForLatestExchange.toString()}</span>
    </button>
  )
}
