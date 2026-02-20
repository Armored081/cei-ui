import { createRef } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StructuredBlock } from '../agent/types'
import type { ChatMessageItem } from '../types/chat'
import type { Artifact, ChatEngine, ToolLogItem } from '../hooks/useChatEngine'
import type { ModernContext } from '../types/modern-context.js'
import { CommandCenterLayout } from './CommandCenter'

function mockCompactViewport(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string): MediaQueryList => {
      return {
        matches: query === '(max-width: 1024px)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn((): boolean => true),
      } as MediaQueryList
    }),
  })
}

interface EngineOptions {
  latestModernContext?: ModernContext | null
  messages?: ChatMessageItem[]
}

function buildModernContext(
  suffix: string,
  options: {
    includeStoryCards?: boolean
    relatedName?: string
  } = {},
): ModernContext {
  const includeStoryCards = options.includeStoryCards ?? true
  const activeEntity = {
    type: 'risk' as const,
    id: `RS-${suffix}`,
    name: `Risk ${suffix}`,
  }

  return {
    storyCards: includeStoryCards
      ? [
          {
            id: `story-${suffix}`,
            title: `Story ${suffix}`,
            severity: 'medium',
            narrative: `Narrative ${suffix}`,
            correlatedEntities: [
              {
                type: 'control',
                id: `AC-${suffix}`,
                name: `Control ${suffix}`,
              },
            ],
          },
        ]
      : [],
    entityGraph: {
      nodes: [
        activeEntity,
        {
          type: 'control',
          id: `CTRL-${suffix}`,
          name: options.relatedName || `Related ${suffix}`,
        },
      ],
      edges: [
        {
          source: activeEntity,
          target: {
            type: 'control',
            id: `CTRL-${suffix}`,
            name: options.relatedName || `Related ${suffix}`,
          },
          relationshipType: 'mitigated-by',
        },
      ],
    },
    vizHints: [],
    pivotTargets: [],
  }
}

function createEngine(
  onToggleTool: (messageId: string, toolId: string) => void,
  options: EngineOptions = {},
): ChatEngine {
  const recommendationBlock: StructuredBlock = {
    kind: 'recommendation',
    severity: 'medium',
    title: 'Patch vulnerable package',
    body: 'Update dependency xyz to 3.2.1.',
  }

  const defaultMessage: ChatMessageItem = {
    canRetry: false,
    errorText: '',
    id: 'agent-1',
    isStreaming: false,
    role: 'agent',
    segments: [
      { type: 'text', content: 'Here is the recommendation.' },
      { type: 'block', block: recommendationBlock },
    ],
    tools: [
      {
        args: { query: 'latest dependencies' },
        id: 'tool-1',
        isExpanded: false,
        name: 'db_lookup',
        result: { documentId: 'DOC-7' },
        status: 'complete',
      },
    ],
    type: 'message',
  }

  let messages = options.messages
  if (!messages) {
    messages = [defaultMessage]
    if (options.latestModernContext) {
      messages = [
        {
          ...defaultMessage,
          modernContext: options.latestModernContext,
        },
      ]
    }
  }

  const artifacts: Artifact[] = messages.flatMap((message) =>
    message.segments.flatMap((segment, segmentIndex): Artifact[] => {
      if (segment.type !== 'block') {
        return []
      }

      return [
        {
          id: `${message.id}-block-${segmentIndex.toString()}`,
          sourceMessageId: message.id,
          segmentIndex,
          block: segment.block,
          kind: segment.block.kind,
          title: segment.block.title,
        },
      ]
    }),
  )

  const toolLog: ToolLogItem[] = messages.flatMap((message) =>
    message.tools.map((tool) => ({
      args: tool.args,
      id: tool.id,
      isExpanded: tool.isExpanded,
      name: tool.name,
      result: tool.result,
      sourceMessageId: message.id,
      status: tool.status,
    })),
  )

  return {
    timelineItems: messages,
    streamStatus: 'idle',
    sessionId: 'session-1',
    isStreaming: false,
    statusLabelText: 'Idle',
    messages,
    artifacts,
    toolLog,
    latestModernContext: options.latestModernContext || null,
    draftMessage: '',
    setDraftMessage: (): void => {},
    errorBanner: '',
    setErrorBanner: (): void => {},
    attachmentError: '',
    attachments: [],
    isDragOver: false,
    isAttachmentProcessing: false,
    hasFailedAttachment: false,
    submitPrompt: async (): Promise<void> => {},
    cancelActiveStream: (): void => {},
    createNewThread: (): void => {},
    getConversationSnapshot: () => ({
      sessionId: 'session-1',
      timelineItems: messages,
    }),
    restoreConversationSnapshot: (): void => {},
    onRetryMessage: (): void => {},
    onToggleTool,
    addFilesToAttachments: (): void => {},
    removeAttachment: (): void => {},
    onAttachmentInputChange: (): void => {},
    onPickAttachment: (): void => {},
    onComposerDragEnter: (): void => {},
    onComposerDragOver: (): void => {},
    onComposerDragLeave: (): void => {},
    onComposerDrop: (): void => {},
    onSubmit: (event): void => event.preventDefault(),
    onComposerKeyDown: (): void => {},
    attachmentInputRef: createRef<HTMLInputElement>(),
    composerRef: createRef<HTMLTextAreaElement>(),
    messageListRef: createRef<HTMLDivElement>(),
    updateMessageScrollIntent: (): void => {},
    scrollToBottom: (): void => {},
  }
}

function renderLayout(engine: ChatEngine): void {
  render(
    <MemoryRouter>
      <CommandCenterLayout
        engine={engine}
        onLogout={(): void => {}}
        userEmail="analyst@example.com"
      />
    </MemoryRouter>,
  )
}

describe('CommandCenter compact layout', (): void => {
  beforeEach((): void => {
    mockCompactViewport()
  })

  it('opens expanded overlay when an artifact pill is clicked', (): void => {
    renderLayout(createEngine(vi.fn()))

    expect(
      screen.queryByRole('dialog', { name: 'Expanded artifact: Patch vulnerable package' }),
    ).not.toBeInTheDocument()

    const conversation = screen.getByRole('log', { name: 'Conversation' })
    fireEvent.click(within(conversation).getByRole('button', { name: /Patch vulnerable package/ }))

    expect(
      screen.getByRole('dialog', { name: 'Expanded artifact: Patch vulnerable package' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Open full-screen artifact view' }),
    ).toBeInTheDocument()
  })

  it('transitions between expanded and full-screen with keyboard shortcuts', (): void => {
    renderLayout(createEngine(vi.fn()))

    const conversation = screen.getByRole('log', { name: 'Conversation' })
    fireEvent.click(within(conversation).getByRole('button', { name: /Patch vulnerable package/ }))

    fireEvent.keyDown(window, { key: 'f' })

    expect(
      screen.getByRole('dialog', { name: 'Full-screen artifact: Patch vulnerable package' }),
    ).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(
      screen.getByRole('dialog', { name: 'Expanded artifact: Patch vulnerable package' }),
    ).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(
      screen.queryByRole('dialog', { name: 'Expanded artifact: Patch vulnerable package' }),
    ).not.toBeInTheDocument()
  })

  it('opens the thread drawer through compact controls', (): void => {
    renderLayout(createEngine(vi.fn()))

    fireEvent.click(screen.getByRole('button', { name: 'Menu Threads' }))

    const threadDialog = screen.getByRole('dialog', { name: 'Threads' })
    expect(
      within(threadDialog).getByRole('button', {
        name: 'Create New Thread',
      }),
    ).toBeInTheDocument()
    expect(within(threadDialog).getByPlaceholderText('Search threads')).toBeInTheDocument()
  })

  it('shows and expands activity drawer in the artifacts rail', (): void => {
    renderLayout(createEngine(vi.fn()))

    const summaryBar = screen.getByRole('button', { name: 'Activity summary' })
    expect(summaryBar).toHaveTextContent('Last tool: db lookup')
    expect(within(summaryBar).getByText('1')).toBeInTheDocument()

    expect(screen.queryByRole('heading', { name: 'Activity Log' })).not.toBeInTheDocument()

    fireEvent.click(summaryBar)

    expect(screen.getByRole('heading', { name: 'Activity Log' })).toBeInTheDocument()
  })

  it('shows context rail title when story cards are available', (): void => {
    renderLayout(
      createEngine(vi.fn(), {
        latestModernContext: buildModernContext('context', { includeStoryCards: true }),
      }),
    )

    const contextHeadings = screen.getAllByRole('heading', { name: 'Context' })
    expect(contextHeadings.length).toBeGreaterThan(0)
  })

  it('opens entity detail from message chip and restores previous rail mode on back', (): void => {
    const modernContext = buildModernContext('story', {
      includeStoryCards: true,
      relatedName: 'Legacy Control',
    })

    const message: ChatMessageItem = {
      canRetry: false,
      errorText: '',
      id: 'agent-entity',
      isStreaming: false,
      modernContext,
      role: 'agent',
      segments: [{ type: 'text', content: 'Investigate [[entity:risk:RS-story|Risk story]].' }],
      tools: [],
      type: 'message',
    }

    renderLayout(
      createEngine(vi.fn(), {
        latestModernContext: modernContext,
        messages: [message],
      }),
    )

    const conversation = screen.getByRole('log', { name: 'Conversation' })
    fireEvent.click(within(conversation).getByRole('button', { name: 'Risk story' }))

    const entityDialog = screen.getByRole('dialog', { name: 'Entity Detail' })
    expect(within(entityDialog).getByRole('heading', { name: 'Risk story' })).toBeInTheDocument()

    fireEvent.click(within(entityDialog).getByRole('tab', { name: 'Related' }))
    expect(within(entityDialog).getByText('Legacy Control')).toBeInTheDocument()

    fireEvent.click(within(entityDialog).getByRole('button', { name: 'Back to Artifacts' }))
    expect(screen.getAllByRole('heading', { name: 'Story cards' }).length).toBeGreaterThan(0)
  })

  it('uses clicked message modernContext for entity detail instead of latestModernContext', (): void => {
    const firstContext = buildModernContext('one', {
      includeStoryCards: false,
      relatedName: 'Legacy Control',
    })
    const latestContext = buildModernContext('two', {
      includeStoryCards: true,
      relatedName: 'Current Control',
    })

    const firstMessage: ChatMessageItem = {
      canRetry: false,
      errorText: '',
      id: 'agent-1',
      isStreaming: false,
      modernContext: firstContext,
      role: 'agent',
      segments: [{ type: 'text', content: 'Inspect [[entity:risk:RS-one|Risk one]].' }],
      tools: [],
      type: 'message',
    }

    const secondMessage: ChatMessageItem = {
      canRetry: false,
      errorText: '',
      id: 'agent-2',
      isStreaming: false,
      modernContext: latestContext,
      role: 'agent',
      segments: [{ type: 'text', content: 'Latest response in thread.' }],
      tools: [],
      type: 'message',
    }

    renderLayout(
      createEngine(vi.fn(), {
        latestModernContext: latestContext,
        messages: [firstMessage, secondMessage],
      }),
    )

    const conversation = screen.getByRole('log', { name: 'Conversation' })
    fireEvent.click(within(conversation).getByRole('button', { name: 'Risk one' }))

    const entityDialog = screen.getByRole('dialog', { name: 'Entity Detail' })
    fireEvent.click(within(entityDialog).getByRole('tab', { name: 'Related' }))

    expect(within(entityDialog).getByText('Legacy Control')).toBeInTheDocument()
    expect(within(entityDialog).queryByText('Current Control')).not.toBeInTheDocument()
  })

  it('restores previous rail mode when entity panel is closed via Close button', (): void => {
    const modernContext = buildModernContext('restore', {
      includeStoryCards: true,
      relatedName: 'Restore Control',
    })

    const message: ChatMessageItem = {
      canRetry: false,
      errorText: '',
      id: 'agent-restore',
      isStreaming: false,
      modernContext,
      role: 'agent',
      segments: [{ type: 'text', content: 'Track [[entity:risk:RS-restore|Risk restore]].' }],
      tools: [],
      type: 'message',
    }

    renderLayout(
      createEngine(vi.fn(), {
        latestModernContext: modernContext,
        messages: [message],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Risk restore' }))

    const entityDialog = screen.getByRole('dialog', { name: 'Entity Detail' })
    fireEvent.click(within(entityDialog).getByRole('button', { name: 'Close' }))

    expect(screen.getAllByRole('heading', { name: 'Story cards' }).length).toBeGreaterThan(0)
  })

  it('opens entity detail from message chip and restores previous rail mode on back', (): void => {
    const modernContext = buildModernContext('story', {
      includeStoryCards: true,
      relatedName: 'Legacy Control',
    })

    const message: ChatMessageItem = {
      canRetry: false,
      errorText: '',
      id: 'agent-entity',
      isStreaming: false,
      modernContext,
      role: 'agent',
      segments: [{ type: 'text', content: 'Investigate [[entity:risk:RS-story|Risk story]].' }],
      tools: [],
      type: 'message',
    }

    renderLayout(
      createEngine(vi.fn(), {
        latestModernContext: modernContext,
        messages: [message],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Risk story' }))

    const entityDialog = screen.getByRole('dialog', { name: 'Entity Detail' })
    expect(
      within(entityDialog).getByRole('heading', { name: 'Risk story' }),
    ).toBeInTheDocument()

    fireEvent.click(within(entityDialog).getByRole('button', { name: 'Close' }))

    expect(screen.getAllByRole('heading', { name: 'Story cards' }).length).toBeGreaterThan(0)
  })

  it('uses Entity Detail as mobile drawer title when entity panel opens', (): void => {
    const modernContext = buildModernContext('drawer', { includeStoryCards: false })

    const message: ChatMessageItem = {
      canRetry: false,
      errorText: '',
      id: 'agent-drawer',
      isStreaming: false,
      modernContext,
      role: 'agent',
      segments: [{ type: 'text', content: 'Open [[entity:risk:RS-drawer|Risk drawer]].' }],
      tools: [],
      type: 'message',
    }

    renderLayout(
      createEngine(vi.fn(), {
        latestModernContext: modernContext,
        messages: [message],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Risk drawer' }))

    expect(screen.getByRole('dialog', { name: 'Entity Detail' })).toBeInTheDocument()
  })

  it('keeps artifacts rail title when no story cards exist', (): void => {
    renderLayout(
      createEngine(vi.fn(), {
        latestModernContext: buildModernContext('none', { includeStoryCards: false }),
      }),
    )

    const artifactsHeadings = screen.getAllByRole('heading', { name: 'Artifacts' })
    expect(artifactsHeadings.length).toBeGreaterThan(0)
  })

  it('shows context rail title when story cards are available', (): void => {
    renderLayout(
      createEngine(vi.fn(), {
        latestModernContext: buildModernContext('context', { includeStoryCards: true }),
      }),
    )

    const contextHeadings = screen.getAllByRole('heading', { name: 'Context' })
    expect(contextHeadings.length).toBeGreaterThan(0)
  })
})
