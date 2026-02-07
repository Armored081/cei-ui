import type { CSSProperties, RefObject } from 'react'

export type ChatMessageRole = 'user' | 'agent'
export type ToolActivityStatus = 'running' | 'complete'

export interface ToolActivityItem {
  args: Record<string, unknown>
  id: string
  isExpanded: boolean
  name: string
  result: unknown
  status: ToolActivityStatus
}

export interface ChatMessageItem {
  content: string
  errorText: string
  id: string
  isStreaming: boolean
  role: ChatMessageRole
  tools: ToolActivityItem[]
  type: 'message'
}

export interface ThreadSeparatorItem {
  id: string
  label: string
  type: 'thread_separator'
}

export type ChatTimelineItem = ChatMessageItem | ThreadSeparatorItem

interface ChatMessageListProps {
  items: ChatTimelineItem[]
  listRef: RefObject<HTMLDivElement>
  onScroll: () => void
  onToggleTool: (messageId: string, toolId: string) => void
}

function roleLabel(role: ChatMessageRole): string {
  return role === 'user' ? 'User' : 'Agent'
}

function formatToolValue(value: unknown): string {
  return JSON.stringify(value, null, 2) || ''
}

function renderToolStatus(status: ToolActivityStatus): JSX.Element {
  if (status === 'running') {
    return (
      <span className="cei-tool-status" data-testid="tool-running">
        <span aria-hidden="true" className="cei-spinner" />
        In progress
      </span>
    )
  }

  return (
    <span className="cei-tool-status" data-testid="tool-complete">
      <svg
        aria-hidden="true"
        className="cei-check-icon"
        viewBox="0 0 16 16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M3 8.5L6.2 11.5L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      Complete
    </span>
  )
}

export function ChatMessageList({
  items,
  listRef,
  onScroll,
  onToggleTool,
}: ChatMessageListProps): JSX.Element {
  if (items.length === 0) {
    return (
      <div aria-live="polite" className="cei-empty-state">
        Start a thread by sending your first message.
      </div>
    )
  }

  return (
    <div
      aria-live="polite"
      className="cei-message-list"
      onScroll={onScroll}
      ref={listRef}
      role="log"
      aria-label="Conversation"
    >
      {items.map((item): JSX.Element => {
        if (item.type === 'thread_separator') {
          return (
            <div className="cei-thread-separator" key={item.id}>
              <span>{item.label}</span>
            </div>
          )
        }

        const bubbleClassName =
          item.role === 'user' ? 'cei-message-bubble cei-message-user' : 'cei-message-bubble'

        return (
          <article className="cei-message" key={item.id}>
            <header className="cei-message-header">
              <span className="cei-role-pill">{roleLabel(item.role)}</span>
            </header>

            <div className={bubbleClassName}>
              {item.content || <span className="cei-muted">Waiting for response...</span>}
              {item.isStreaming ? (
                <span aria-hidden="true" className="cei-typing-cursor">
                  |
                </span>
              ) : null}
              {item.errorText ? (
                <p className="cei-error-text" data-testid="message-error">
                  {item.errorText}
                </p>
              ) : null}
            </div>

            {item.role === 'agent' && item.tools.length > 0 ? (
              <div className="cei-tool-list" data-testid="tool-activity-list">
                {item.tools.map((tool): JSX.Element => {
                  const detailsStyle: CSSProperties = {
                    display: tool.isExpanded ? 'block' : 'none',
                  }

                  return (
                    <section className="cei-tool-item" key={tool.id}>
                      <button
                        aria-expanded={tool.isExpanded}
                        className="cei-tool-toggle"
                        onClick={(): void => onToggleTool(item.id, tool.id)}
                        type="button"
                      >
                        <span>{tool.name}</span>
                        {renderToolStatus(tool.status)}
                      </button>

                      <pre className="cei-tool-body" style={detailsStyle}>
                        {tool.status === 'running'
                          ? formatToolValue(tool.args)
                          : formatToolValue(tool.result)}
                      </pre>
                    </section>
                  )
                })}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
