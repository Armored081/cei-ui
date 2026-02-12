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
      <CommandCenter
        activeLayout="command-center"
        engine={engine}
        onChangeLayout={(): void => {}}
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

  it('opens artifacts drawer when an artifact pill is clicked', (): void => {
    const onToggleTool = vi.fn()
    renderLayout(createEngine(onToggleTool))

    expect(screen.queryByRole('dialog', { name: 'Artifacts' })).not.toBeInTheDocument()

    const conversation = screen.getByRole('log', { name: 'Conversation' })
    fireEvent.click(within(conversation).getByRole('button', { name: /Patch vulnerable package/ }))

    const artifactsDialog = screen.getByRole('dialog', { name: 'Artifacts' })
    expect(artifactsDialog).toBeInTheDocument()
    expect(within(artifactsDialog).getByRole('button', { name: 'JSON' })).toBeInTheDocument()
  })

  it('exposes tool log actions through the compact activity drawer', (): void => {
    const onToggleTool = vi.fn()
    renderLayout(createEngine(onToggleTool))

    fireEvent.click(screen.getByRole('button', { name: 'Menu Activity' }))

    const activityDialog = screen.getByRole('dialog', { name: 'Activity' })
    const toggleButton = within(activityDialog).getByRole('button', { name: /db_lookup/i })

    fireEvent.click(toggleButton)

    expect(onToggleTool).toHaveBeenCalledWith('agent-1', 'tool-1')
  })
})
