import type { ToolActivityItem } from '../types/chat'
import './tool-status-bar.css'

interface ToolStatusBarProps {
  tools: ToolActivityItem[]
}

export function ToolStatusBar({ tools }: ToolStatusBarProps): JSX.Element {
  return (
    <div className="cei-tool-sbar">
      <span className="cei-tool-sbar-line" />
      {tools.map((tool) => (
        <span key={tool.id} className="cei-tool-sbar-item">
          {tool.name} {tool.status === 'complete' ? '\u2713' : '\u27F3'}
        </span>
      ))}
      <span className="cei-tool-sbar-line" />
    </div>
  )
}
