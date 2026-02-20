import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StreamEvent } from '../agent/types.js'
import type { ChatMessageItem, ChatTimelineItem } from '../types/chat.js'
import type { ModernContext } from '../types/modern-context.js'
import { useChatEngine } from './useChatEngine'

const invokeAgentStreamMock = vi.hoisted(() => vi.fn())

vi.mock('../agent/AgentClient', () => {
  return {
    invokeAgentStream: invokeAgentStreamMock,
  }
})

function buildModernContext(id: string): ModernContext {
  const entity = {
    type: 'risk' as const,
    id: `risk-${id}`,
    name: `Risk ${id}`,
  }

  return {
    storyCards: [
      {
        id: `story-${id}`,
        title: `Story ${id}`,
        severity: 'medium',
        narrative: `Narrative ${id}`,
        correlatedEntities: [entity],
      },
    ],
    entityGraph: {
      nodes: [entity],
      edges: [],
    },
    vizHints: [
      {
        id: `hint-${id}`,
        chartType: 'timeline',
        title: `Hint ${id}`,
        data: [{ timestamp: '2026-02-01T00:00:00Z', label: `Event ${id}` }],
      },
    ],
    pivotTargets: [
      {
        entity,
        suggestedAction: `Action ${id}`,
      },
    ],
  }
}

async function* streamFromEvents(events: unknown[]): AsyncGenerator<StreamEvent, void, undefined> {
  for (const event of events) {
    yield event as StreamEvent
  }
}

function getAgentMessages(items: ChatTimelineItem[]): ChatMessageItem[] {
  return items.filter(
    (item: ChatTimelineItem): item is ChatMessageItem =>
      item.type === 'message' && item.role === 'agent',
  )
}

function getLastAgentMessage(items: ChatTimelineItem[]): ChatMessageItem {
  const messages = getAgentMessages(items)
  const lastMessage = messages[messages.length - 1]

  if (!lastMessage) {
    throw new Error('Expected an agent message to exist')
  }

  return lastMessage
}

describe('useChatEngine modern-context integration', (): void => {
  let queuedStreams: unknown[][]

  beforeEach((): void => {
    queuedStreams = []

    invokeAgentStreamMock.mockReset()
    invokeAgentStreamMock.mockImplementation(() => {
      const nextEvents = queuedStreams.shift() || []
      return streamFromEvents(nextEvents)
    })
  })

  it('attaches modernContext to the message when modern-context event is streamed', async (): Promise<void> => {
    const modernContext = buildModernContext('a')
    queuedStreams.push([
      { type: 'modern-context', modernContext },
      { type: 'done', summary: 'complete' },
    ])

    const { result } = renderHook(() =>
      useChatEngine({
        getAccessToken: async (): Promise<string> => 'token',
        logout: async (): Promise<void> => {},
      }),
    )

    await act(async (): Promise<void> => {
      await result.current.submitPrompt('Analyze this')
    })

    expect(getLastAgentMessage(result.current.timelineItems).modernContext).toEqual(modernContext)
  })

  it('attaches fallback modernContext from done event when no modern-context event exists', async (): Promise<void> => {
    const modernContext = buildModernContext('b')
    queuedStreams.push([{ type: 'done', summary: 'complete', modernContext }])

    const { result } = renderHook(() =>
      useChatEngine({
        getAccessToken: async (): Promise<string> => 'token',
        logout: async (): Promise<void> => {},
      }),
    )

    await act(async (): Promise<void> => {
      await result.current.submitPrompt('Analyze this')
    })

    expect(getLastAgentMessage(result.current.timelineItems).modernContext).toEqual(modernContext)
  })

  it('prefers streamed modern-context over done fallback modernContext when both are present', async (): Promise<void> => {
    const modernContextFromStream = buildModernContext('stream')
    const modernContextFromDone = buildModernContext('done')

    queuedStreams.push([
      { type: 'modern-context', modernContext: modernContextFromStream },
      { type: 'done', summary: 'complete', modernContext: modernContextFromDone },
    ])

    const { result } = renderHook(() =>
      useChatEngine({
        getAccessToken: async (): Promise<string> => 'token',
        logout: async (): Promise<void> => {},
      }),
    )

    await act(async (): Promise<void> => {
      await result.current.submitPrompt('Analyze this')
    })

    expect(getLastAgentMessage(result.current.timelineItems).modernContext).toEqual(
      modernContextFromStream,
    )
  })

  it('leaves modernContext undefined when stream has no modern-context data', async (): Promise<void> => {
    queuedStreams.push([{ type: 'done', summary: 'complete' }])

    const { result } = renderHook(() =>
      useChatEngine({
        getAccessToken: async (): Promise<string> => 'token',
        logout: async (): Promise<void> => {},
      }),
    )

    await act(async (): Promise<void> => {
      await result.current.submitPrompt('Analyze this')
    })

    expect(getLastAgentMessage(result.current.timelineItems).modernContext).toBeUndefined()
  })

  it('gracefully degrades when modern-context event payload is malformed', async (): Promise<void> => {
    queuedStreams.push([
      {
        type: 'modern-context',
        modernContext: {
          storyCards: [],
          entityGraph: { nodes: [{ type: 'not-valid', id: 'x', name: 'x' }], edges: [] },
          vizHints: [],
          pivotTargets: [],
        },
      },
      { type: 'done', summary: 'complete' },
    ])

    const { result } = renderHook(() =>
      useChatEngine({
        getAccessToken: async (): Promise<string> => 'token',
        logout: async (): Promise<void> => {},
      }),
    )

    await act(async (): Promise<void> => {
      await result.current.submitPrompt('Analyze this')
    })

    const agentMessage = getLastAgentMessage(result.current.timelineItems)

    expect(agentMessage.modernContext).toBeUndefined()
    expect(agentMessage.errorText).toBe('')
  })

  it('gracefully degrades when done fallback modernContext payload is malformed', async (): Promise<void> => {
    queuedStreams.push([
      {
        type: 'done',
        summary: 'complete',
        modernContext: {
          storyCards: [],
          entityGraph: { nodes: [{ type: 'not-valid', id: 'x', name: 'x' }], edges: [] },
          vizHints: [],
          pivotTargets: [],
        },
      },
    ])

    const { result } = renderHook(() =>
      useChatEngine({
        getAccessToken: async (): Promise<string> => 'token',
        logout: async (): Promise<void> => {},
      }),
    )

    await act(async (): Promise<void> => {
      await result.current.submitPrompt('Analyze this')
    })

    expect(getLastAgentMessage(result.current.timelineItems).modernContext).toBeUndefined()
  })

  it('preserves per-message modernContext across thread snapshot restore', async (): Promise<void> => {
    const modernContext = buildModernContext('persist')
    queuedStreams.push([
      { type: 'modern-context', modernContext },
      { type: 'done', summary: 'complete' },
    ])

    const { result } = renderHook(() =>
      useChatEngine({
        getAccessToken: async (): Promise<string> => 'token',
        logout: async (): Promise<void> => {},
      }),
    )

    await act(async (): Promise<void> => {
      await result.current.submitPrompt('Analyze this')
    })

    const snapshot = result.current.getConversationSnapshot()

    act((): void => {
      result.current.createNewThread()
    })

    expect(result.current.timelineItems).toHaveLength(0)

    act((): void => {
      result.current.restoreConversationSnapshot(snapshot)
    })

    expect(getLastAgentMessage(result.current.timelineItems).modernContext).toEqual(modernContext)
  })

  it('returns latestModernContext from the most recent assistant message', async (): Promise<void> => {
    const first = buildModernContext('first')
    const second = buildModernContext('second')

    queuedStreams.push([
      { type: 'modern-context', modernContext: first },
      { type: 'done', summary: 'complete' },
    ])
    queuedStreams.push([
      { type: 'modern-context', modernContext: second },
      { type: 'done', summary: 'complete' },
    ])

    const { result } = renderHook(() =>
      useChatEngine({
        getAccessToken: async (): Promise<string> => 'token',
        logout: async (): Promise<void> => {},
      }),
    )

    await act(async (): Promise<void> => {
      await result.current.submitPrompt('First')
    })

    await act(async (): Promise<void> => {
      await result.current.submitPrompt('Second')
    })

    expect(result.current.latestModernContext).toEqual(second)
  })

  it('returns null for latestModernContext when no assistant message has modernContext', async (): Promise<void> => {
    queuedStreams.push([{ type: 'done', summary: 'complete' }])

    const { result } = renderHook(() =>
      useChatEngine({
        getAccessToken: async (): Promise<string> => 'token',
        logout: async (): Promise<void> => {},
      }),
    )

    await act(async (): Promise<void> => {
      await result.current.submitPrompt('Analyze this')
    })

    expect(result.current.latestModernContext).toBeNull()
  })
})
