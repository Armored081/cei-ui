import type { CSSProperties, RefObject } from 'react'

import type { StructuredBlock } from '../agent/types'
import type { ToolActivityItem } from '../components/ChatMessageList'
import type {
  ChatMessageSegment,
  ChatTimelineItem,
} from '../components/ChatMessageList'
import { ChartBlock } from '../components/blocks/ChartBlock'
import { RecommendationBlock } from '../components/blocks/RecommendationBlock'
import { TableBlock } from '../components/blocks/TableBlock'
import './message-list.css'

export type BlockRenderer = 'inline' | 'pill' | 'mini-card' | 'tag'
export type DisplayMode = 'full' | 'clean'

interface MessageListProps {
  items: ChatTimelineItem[]
  listRef: RefObject<HTMLDivElement>
  onRetryMessage?: (messageId: string) => void
  onScroll: () => void
  onToggleTool: (messageId: string, toolId: string) => void
  displayMode?: DisplayMode
  blockRenderer?: BlockRenderer
  onArtifactClick?: (artifactId: string) => void
}

type ChatMessageRole = 'user' | 'agent'
type ToolActivityStatus = 'running' | 'complete'

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

function renderStructuredBlock(block: StructuredBlock): JSX.Element {
  if (block.kind === 'chart') {
    return <ChartBlock block={block} />
  }

  if (block.kind === 'table') {
    return <TableBlock block={block} />
  }

  return <RecommendationBlock block={block} />
}

function hasRenderableSegments(segments: ChatMessageSegment[]): boolean {
  return segments.some((segment) => {
    if (segment.type === 'text') {
      return Boolean(segment.content)
    }

    return true
  })
}

function blockKindIcon(kind: string): string {
  if (kind === 'chart') return '\u{1F4CA}'
  if (kind === 'table') return '\u{1F4CB}'
  return '\u{1F6E1}'
}

function renderBlockAsAlternate(
  block: StructuredBlock,
  renderer: BlockRenderer,
  segIndex: number,
  messageId: string,
  onArtifactClick?: (artifactId: string) => void,
): JSX.Element {
  const artifactId = `${messageId}-block-${segIndex.toString()}`

  if (renderer === 'pill') {
    return (
      <button
        className="cei-ml-artifact-pill"
        key={`pill-${segIndex.toString()}`}
        onClick={(): void => onArtifactClick?.(artifactId)}
        type="button"
      >
        <span className="cei-ml-artifact-pill-icon">{blockKindIcon(block.kind)}</span>
        <span className="cei-ml-artifact-pill-title">{block.title}</span>
      </button>
    )
  }

  if (renderer === 'mini-card') {
    return (
      <button
        className="cei-ml-artifact-mini-card"
        key={`mini-${segIndex.toString()}`}
        onClick={(): void => onArtifactClick?.(artifactId)}
        type="button"
      >
        <span className="cei-ml-artifact-mini-card-icon">{blockKindIcon(block.kind)}</span>
        <span className="cei-ml-artifact-mini-card-title">{block.title}</span>
      </button>
    )
  }

  // tag
  return (
    <span
      className="cei-ml-artifact-tag"
      key={`tag-${segIndex.toString()}`}
      onClick={(): void => onArtifactClick?.(artifactId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e): void => {
        if (e.key === 'Enter' || e.key === ' ') onArtifactClick?.(artifactId)
      }}
    >
      {blockKindIcon(block.kind)} {block.title}
    </span>
  )
}

function renderToolStatusBar(tools: ToolActivityItem[]): JSX.Element {
  return (
    <div className="cei-ml-tool-status-bar">
      <span className="cei-ml-tool-status-bar-line" />
      {tools.map((tool) => (
        <span key={tool.id} className="cei-ml-tool-status-bar-item">
          {tool.name} {tool.status === 'complete' ? '\u2713' : '\u27F3'}
        </span>
      ))}
      <span className="cei-ml-tool-status-bar-line" />
    </div>
  )
}

export function MessageList({
  items,
  listRef,
  onRetryMessage,
  onScroll,
  onToggleTool,
  displayMode = 'full',
  blockRenderer = 'inline',
  onArtifactClick,
}: MessageListProps): JSX.Element {
  const isClean = displayMode === 'clean'
  const useAlternateBlocks = isClean && blockRenderer !== 'inline'

  if (items.length === 0) {
    return (
      <div aria-live="polite" className="cei-empty-state">
        <div className="cei-empty-state-content">
          <p className="cei-empty-title">Welcome to CEI Agent</p>
          <p className="cei-empty-subtitle">Try one of these prompts:</p>
          <ul className="cei-empty-suggestions">
            <li>Ask me about your portfolio risk profile.</li>
            <li>Summarize security findings from recent scans.</li>
            <li>Recommend next actions for high-severity issues.</li>
          </ul>
        </div>
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
              {hasRenderableSegments(item.segments) ? (
                <div className="cei-message-content">
                  {item.segments.map((segment, index): JSX.Element => {
                    if (segment.type === 'text') {
                      return (
                        <span className="cei-message-text-segment" key={`text-${index.toString()}`}>
                          {segment.content}
                        </span>
                      )
                    }

                    if (useAlternateBlocks) {
                      return renderBlockAsAlternate(
                        segment.block,
                        blockRenderer,
                        index,
                        item.id,
                        onArtifactClick,
                      )
                    }

                    return (
                      <div className="cei-message-block-segment" key={`block-${index.toString()}`}>
                        {renderStructuredBlock(segment.block)}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <span className="cei-muted">Waiting for response...</span>
              )}
              {item.isStreaming ? (
                <span aria-hidden="true" className="cei-typing-cursor">
                  |
                </span>
              ) : null}
              {item.errorText ? (
                <div className="cei-message-error-row">
                  <p className="cei-error-text" data-testid="message-error">
                    {item.errorText}
                  </p>
                  {item.canRetry && onRetryMessage ? (
                    <button
                      className="cei-button-secondary cei-retry-button"
                      onClick={(): void => onRetryMessage(item.id)}
                      type="button"
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {isClean && item.role === 'agent' && item.tools.length > 0
              ? renderToolStatusBar(item.tools)
              : null}

            {!isClean && item.role === 'agent' && item.tools.length > 0 ? (
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
