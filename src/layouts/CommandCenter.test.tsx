import { createRef } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StructuredBlock } from '../agent/types'
import type { ChatMessageItem } from '../components/ChatMessageList'
import type { Artifact, ChatEngine, ToolLogItem } from '../hooks/useChatEngine'
import { CommandCenter } from './CommandCenter'

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

function createEngine(onToggleTool: (messageId: string, toolId: string) => void): ChatEngine {
  const recommendationBlock: StructuredBlock = {
    kind: 'recommendation',
    severity: 'medium',
    title: 'Patch vulnerable package',
    body: 'Update dependency xyz to 3.2.1.',
  }

  const message: ChatMessageItem = {
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

  const artifacts: Artifact[] = [
    {
      id: 'agent-1-block-1',
      sourceMessageId: message.id,
      segmentIndex: 1,
      block: recommendationBlock,
      kind: recommendationBlock.kind,
      title: recommendationBlock.title,
    },
  ]

  const toolLog: ToolLogItem[] = [
    {
      args: { query: 'latest dependencies' },
      id: 'tool-1',
      isExpanded: false,
      name: 'db_lookup',
      result: { documentId: 'DOC-7' },
      sourceMessageId: message.id,
      status: 'complete',
    },
  ]

  return {
    timelineItems: [message],
    streamStatus: 'idle',
    sessionId: 'session-1',
    isStreaming: false,
    statusLabelText: 'Idle',
    messages: [message],
    artifacts,
    toolLog,
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
      timelineItems: [message],
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
      <CommandCenter engine={engine} onLogout={(): void => {}} userEmail="analyst@example.com" />
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
})
