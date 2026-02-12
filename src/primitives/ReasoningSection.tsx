import { useId, useMemo, useState } from 'react'

import type { ArtifactReasoning } from '../components/ChatMessageList'
import './reasoning-section.css'

interface ReasoningSectionProps {
  reasoning?: ArtifactReasoning
}

function renderInlineMarkdown(text: string, keyPrefix: string): JSX.Element[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean)

  return tokens.map((token, index): JSX.Element => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={`${keyPrefix}-strong-${index.toString()}`}>{token.slice(2, -2)}</strong>
    }

    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={`${keyPrefix}-code-${index.toString()}`}>{token.slice(1, -1)}</code>
    }

    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={`${keyPrefix}-em-${index.toString()}`}>{token.slice(1, -1)}</em>
    }

    return <span key={`${keyPrefix}-text-${index.toString()}`}>{token}</span>
  })
}

function renderSimpleMarkdown(markdown: string): JSX.Element[] {
  const lines = markdown.split(/\r?\n/)
  const nodes: JSX.Element[] = []
  let listItems: string[] = []

  const flushList = (): void => {
    if (listItems.length === 0) {
      return
    }

    const listKey = `reasoning-list-${nodes.length.toString()}`
    const items = [...listItems]
    listItems = []

    nodes.push(
      <ul className="cei-reasoning-list" key={listKey}>
        {items.map((item, index) => (
          <li key={`${listKey}-item-${index.toString()}`}>
            {renderInlineMarkdown(item, `${listKey}-${index.toString()}`)}
          </li>
        ))}
      </ul>,
    )
  }

  lines.forEach((line, index): void => {
    const trimmed = line.trim()

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2).trim())
      return
    }

    flushList()

    if (!trimmed) {
      return
    }

    nodes.push(
      <p className="cei-reasoning-paragraph" key={`reasoning-p-${index.toString()}`}>
        {renderInlineMarkdown(trimmed, `reasoning-p-${index.toString()}`)}
      </p>,
    )
  })

  flushList()

  return nodes
}

function hasMarkdownProperty(
  reasoning: Record<string, unknown>,
): reasoning is { markdown: string } {
  return typeof reasoning.markdown === 'string'
}

/**
 * Expandable artifact reasoning panel for transparency and trust.
 */
export function ReasoningSection({ reasoning }: ReasoningSectionProps): JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const contentId = useId()

  const renderedReasoning = useMemo((): JSX.Element | null => {
    if (!reasoning) {
      return null
    }

    if (typeof reasoning === 'string') {
      return <div className="cei-reasoning-markdown">{renderSimpleMarkdown(reasoning)}</div>
    }

    if (hasMarkdownProperty(reasoning)) {
      return (
        <div className="cei-reasoning-markdown">{renderSimpleMarkdown(reasoning.markdown)}</div>
      )
    }

    return <pre className="cei-reasoning-structured">{JSON.stringify(reasoning, null, 2)}</pre>
  }, [reasoning])

  if (!reasoning || !renderedReasoning) {
    return null
  }

  return (
    <section className="cei-reasoning-section">
      <button
        aria-controls={contentId}
        aria-expanded={isExpanded}
        className="cei-reasoning-toggle"
        onClick={(): void => setIsExpanded((currentState): boolean => !currentState)}
        type="button"
      >
        Why this recommendation?
      </button>

      {isExpanded ? (
        <div className="cei-reasoning-content" id={contentId} role="region">
          <p className="cei-reasoning-attribution">Reasoning provided by CEI Agent</p>
          {renderedReasoning}
        </div>
      ) : null}
    </section>
  )
}
