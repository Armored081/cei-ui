import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { invokeAgentStream } from '../agent/AgentClient'
import type { StructuredBlock } from '../agent/types'
import { describeAuthError, useAuth } from '../auth/AuthProvider'
import {
  ChatMessageList,
  type ChatMessageItem,
  type ChatMessageSegment,
  type ChatTimelineItem,
} from './ChatMessageList'
import { SectionCard } from './SectionCard'
import './ChatPage.css'

type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error'

interface FriendlyError {
  bannerText: string
  messageText: string
  shouldRelogin: boolean
}

function statusLabel(status: StreamStatus): string {
  if (status === 'connecting') {
    return 'Connecting...'
  }

  if (status === 'streaming') {
    return 'Streaming...'
  }

  if (status === 'done') {
    return 'Done'
  }

  if (status === 'error') {
    return 'Error'
  }

  return 'Idle'
}

function isLikelyAuthExpiry(code: string, message: string): boolean {
  const normalized = `${code} ${message}`.toLowerCase()

  return (
    code === 'auth_error' ||
    normalized.includes('expired') ||
    normalized.includes('unauthorized') ||
    normalized.includes('forbidden') ||
    normalized.includes('jwt') ||
    normalized.includes('token') ||
    normalized.includes('401')
  )
}

function toFriendlyError(code: string, message: string): FriendlyError {
  if (isLikelyAuthExpiry(code, message)) {
    return {
      bannerText: 'Your session expired. Please sign in again.',
      messageText: 'Session expired. Sign in again to continue this conversation.',
      shouldRelogin: true,
    }
  }

  if (code === 'connection_error') {
    return {
      bannerText: 'Unable to reach the CEI service. Check your connection and try again.',
      messageText: 'Network connection failed before a response was received.',
      shouldRelogin: false,
    }
  }

  if (code === 'stream_interrupted') {
    return {
      bannerText: 'The response was interrupted before completion.',
      messageText: 'Stream interrupted. Retry to continue this thread.',
      shouldRelogin: false,
    }
  }

  if (code === 'configuration_error') {
    return {
      bannerText: 'App configuration is incomplete. Contact your administrator.',
      messageText: 'Missing required API configuration.',
      shouldRelogin: false,
    }
  }

  if (code === 'http_error' || code === 'response_parse_error' || code === 'stream_error') {
    return {
      bannerText: 'The CEI service returned an unexpected response. Please retry.',
      messageText: 'The response could not be processed successfully.',
      shouldRelogin: false,
    }
  }

  return {
    bannerText: 'Something went wrong while processing your request. Please try again.',
    messageText: 'Request failed. Retry when ready.',
    shouldRelogin: false,
  }
}

function isMessageItem(item: ChatTimelineItem): item is ChatMessageItem {
  return item.type === 'message'
}

function appendTextSegment(segments: ChatMessageSegment[], content: string): ChatMessageSegment[] {
  if (!content) {
    return segments
  }

  const nextSegments = [...segments]
  const lastSegment = nextSegments[nextSegments.length - 1]

  if (lastSegment?.type === 'text') {
    nextSegments[nextSegments.length - 1] = {
      ...lastSegment,
      content: `${lastSegment.content}${content}`,
    }

    return nextSegments
  }

  nextSegments.push({
    content,
    type: 'text',
  })

  return nextSegments
}

function appendBlockSegment(
  segments: ChatMessageSegment[],
  block: StructuredBlock,
): ChatMessageSegment[] {
  return [
    ...segments,
    {
      block,
      type: 'block',
    },
  ]
}

function hasRenderableSegment(segments: ChatMessageSegment[]): boolean {
  return segments.some((segment) => {
    if (segment.type === 'text') {
      return Boolean(segment.content)
    }

    return true
  })
}

function buildUserMessage(content: string): ChatMessageItem {
  return {
    canRetry: false,
    errorText: '',
    id: uuidv4(),
    isStreaming: false,
    retryPrompt: '',
    role: 'user',
    segments: [{ content, type: 'text' }],
    tools: [],
    type: 'message',
  }
}

function buildAgentMessage(retryPrompt: string): ChatMessageItem {
  return {
    canRetry: false,
    errorText: '',
    id: uuidv4(),
    isStreaming: true,
    retryPrompt,
    role: 'agent',
    segments: [],
    tools: [],
    type: 'message',
  }
}

export function ChatPage(): JSX.Element {
  const { getAccessToken, logout, userEmail } = useAuth()

  const [draftMessage, setDraftMessage] = useState<string>('')
  const [errorBanner, setErrorBanner] = useState<string>('')
  const [sessionId, setSessionId] = useState<string>(uuidv4())
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle')
  const [timelineItems, setTimelineItems] = useState<ChatTimelineItem[]>([])

  const activeAbortControllerRef = useRef<AbortController | null>(null)
  const activeStreamIdRef = useRef<number>(0)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const shouldAutoScrollRef = useRef<boolean>(true)

  const status = useMemo((): string => statusLabel(streamStatus), [streamStatus])
  const isStreaming = streamStatus === 'connecting' || streamStatus === 'streaming'

  const updateMessageScrollIntent = (): void => {
    const messageListElement = messageListRef.current

    if (!messageListElement) {
      return
    }

    const distanceFromBottom =
      messageListElement.scrollHeight -
      (messageListElement.scrollTop + messageListElement.clientHeight)

    shouldAutoScrollRef.current = distanceFromBottom < 24
  }

  const scrollToBottom = (): void => {
    const messageListElement = messageListRef.current

    if (!messageListElement) {
      return
    }

    messageListElement.scrollTop = messageListElement.scrollHeight
  }

  useEffect((): void => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom()
    }
  }, [timelineItems])

  useEffect((): (() => void) => {
    return (): void => {
      activeAbortControllerRef.current?.abort()
    }
  }, [])

  useEffect((): void => {
    if (!isStreaming) {
      composerRef.current?.focus()
    }
  }, [isStreaming])

  useEffect((): (() => void) => {
    const onWindowKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return
      }

      if (!isStreaming) {
        return
      }

      cancelActiveStream()
      setStreamStatus('idle')
    }

    window.addEventListener('keydown', onWindowKeyDown)

    return (): void => {
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [isStreaming])

  const setAgentMessageState = (
    messageId: string,
    updater: (message: ChatMessageItem) => ChatMessageItem,
  ): void => {
    setTimelineItems((currentItems: ChatTimelineItem[]): ChatTimelineItem[] => {
      return currentItems.map((item: ChatTimelineItem): ChatTimelineItem => {
        if (!isMessageItem(item) || item.id !== messageId) {
          return item
        }

        return updater(item)
      })
    })
  }

  const cancelActiveStream = (): void => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort()
      activeAbortControllerRef.current = null
    }

    activeStreamIdRef.current += 1
  }

  const createNewThread = (): void => {
    cancelActiveStream()
    setSessionId(uuidv4())
    setTimelineItems([
      {
        id: uuidv4(),
        label: 'New thread started',
        type: 'thread_separator',
      },
    ])
    setDraftMessage('')
    setErrorBanner('')
    setStreamStatus('idle')
    composerRef.current?.focus()
  }

  const submitPrompt = async (messageToSend: string): Promise<void> => {
    const trimmedMessage = messageToSend.trim()

    if (!trimmedMessage) {
      return
    }

    cancelActiveStream()

    const streamId = activeStreamIdRef.current + 1
    activeStreamIdRef.current = streamId

    const abortController = new AbortController()
    activeAbortControllerRef.current = abortController

    const requestId = uuidv4()
    const userMessage = buildUserMessage(trimmedMessage)
    const agentMessage = buildAgentMessage(trimmedMessage)

    setDraftMessage('')
    setErrorBanner('')
    setStreamStatus('connecting')
    setTimelineItems((currentItems: ChatTimelineItem[]): ChatTimelineItem[] => [
      ...currentItems,
      userMessage,
      agentMessage,
    ])

    let sawDoneEvent = false
    let sawErrorEvent = false

    try {
      const accessToken = await getAccessToken()

      if (activeStreamIdRef.current !== streamId || abortController.signal.aborted) {
        return
      }

      for await (const streamEvent of invokeAgentStream({
        accessToken,
        message: trimmedMessage,
        requestId,
        sessionId,
        signal: abortController.signal,
      })) {
        if (activeStreamIdRef.current !== streamId || abortController.signal.aborted) {
          return
        }

        if (streamEvent.type === 'delta') {
          setStreamStatus('streaming')
          setAgentMessageState(
            agentMessage.id,
            (currentMessage: ChatMessageItem): ChatMessageItem => ({
              ...currentMessage,
              isStreaming: true,
              segments: appendTextSegment(currentMessage.segments, streamEvent.content),
            }),
          )
          continue
        }

        if (streamEvent.type === 'block') {
          setStreamStatus('streaming')
          setAgentMessageState(
            agentMessage.id,
            (currentMessage: ChatMessageItem): ChatMessageItem => ({
              ...currentMessage,
              isStreaming: true,
              segments: appendBlockSegment(currentMessage.segments, streamEvent.block),
            }),
          )
          continue
        }

        if (streamEvent.type === 'tool_call') {
          setAgentMessageState(
            agentMessage.id,
            (currentMessage: ChatMessageItem): ChatMessageItem => ({
              ...currentMessage,
              tools: [
                ...currentMessage.tools,
                {
                  args: streamEvent.args,
                  id: uuidv4(),
                  isExpanded: true,
                  name: streamEvent.name,
                  result: null,
                  status: 'running',
                },
              ],
            }),
          )
          continue
        }

        if (streamEvent.type === 'tool_result') {
          setAgentMessageState(
            agentMessage.id,
            (currentMessage: ChatMessageItem): ChatMessageItem => {
              const nextTools = [...currentMessage.tools]
              let matchedIndex = -1

              for (let index = nextTools.length - 1; index >= 0; index -= 1) {
                const tool = nextTools[index]

                if (tool.name === streamEvent.name && tool.status === 'running') {
                  matchedIndex = index
                  break
                }
              }

              if (matchedIndex === -1) {
                nextTools.push({
                  args: {},
                  id: uuidv4(),
                  isExpanded: false,
                  name: streamEvent.name,
                  result: streamEvent.result,
                  status: 'complete',
                })
              } else {
                nextTools[matchedIndex] = {
                  ...nextTools[matchedIndex],
                  isExpanded: false,
                  result: streamEvent.result,
                  status: 'complete',
                }
              }

              return {
                ...currentMessage,
                tools: nextTools,
              }
            },
          )
          continue
        }

        if (streamEvent.type === 'error') {
          sawErrorEvent = true
          const friendlyError = toFriendlyError(streamEvent.code, streamEvent.message)
          setErrorBanner(friendlyError.bannerText)
          setStreamStatus('error')
          setAgentMessageState(
            agentMessage.id,
            (currentMessage: ChatMessageItem): ChatMessageItem => ({
              ...currentMessage,
              canRetry: !friendlyError.shouldRelogin,
              errorText: friendlyError.messageText,
              isStreaming: false,
            }),
          )

          if (friendlyError.shouldRelogin) {
            await logout()
          }

          return
        }

        if (streamEvent.type === 'done') {
          sawDoneEvent = true
          setStreamStatus('done')
          setAgentMessageState(
            agentMessage.id,
            (currentMessage: ChatMessageItem): ChatMessageItem => {
              const nextSegments = hasRenderableSegment(currentMessage.segments)
                ? currentMessage.segments
                : appendTextSegment(currentMessage.segments, streamEvent.summary || '')

              return {
                ...currentMessage,
                isStreaming: false,
                segments: nextSegments,
              }
            },
          )
        }
      }

      if (!sawDoneEvent && !sawErrorEvent) {
        setStreamStatus('done')
        setAgentMessageState(
          agentMessage.id,
          (currentMessage: ChatMessageItem): ChatMessageItem => ({
            ...currentMessage,
            isStreaming: false,
          }),
        )
      }
    } catch (submitError) {
      if (activeStreamIdRef.current !== streamId || abortController.signal.aborted) {
        return
      }

      const authErrorMessage = describeAuthError(submitError)
      const friendlyError = toFriendlyError('auth_client_error', authErrorMessage)
      setErrorBanner(friendlyError.bannerText)
      setStreamStatus('error')
      setAgentMessageState(
        agentMessage.id,
        (currentMessage: ChatMessageItem): ChatMessageItem => ({
          ...currentMessage,
          canRetry: !friendlyError.shouldRelogin,
          errorText: friendlyError.messageText,
          isStreaming: false,
        }),
      )

      if (friendlyError.shouldRelogin) {
        await logout()
      }
    } finally {
      setAgentMessageState(
        agentMessage.id,
        (currentMessage: ChatMessageItem): ChatMessageItem => ({
          ...currentMessage,
          isStreaming: false,
        }),
      )

      if (
        activeStreamIdRef.current === streamId &&
        activeAbortControllerRef.current === abortController
      ) {
        activeAbortControllerRef.current = null
      }
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    void submitPrompt(draftMessage)
  }

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submitPrompt(draftMessage)
    }
  }

  const onToggleTool = (messageId: string, toolId: string): void => {
    setTimelineItems((currentItems: ChatTimelineItem[]): ChatTimelineItem[] => {
      return currentItems.map((item: ChatTimelineItem): ChatTimelineItem => {
        if (!isMessageItem(item) || item.id !== messageId) {
          return item
        }

        return {
          ...item,
          tools: item.tools.map((tool) => {
            if (tool.id !== toolId) {
              return tool
            }

            return {
              ...tool,
              isExpanded: !tool.isExpanded,
            }
          }),
        }
      })
    })
  }

  const onRetryMessage = (messageId: string): void => {
    if (isStreaming) {
      return
    }

    const retrySource = timelineItems.find((item: ChatTimelineItem): boolean => {
      return isMessageItem(item) && item.id === messageId
    })

    if (!retrySource || !isMessageItem(retrySource) || !retrySource.retryPrompt) {
      return
    }

    setTimelineItems((currentItems: ChatTimelineItem[]): ChatTimelineItem[] => {
      return currentItems.map((item: ChatTimelineItem): ChatTimelineItem => {
        if (!isMessageItem(item) || item.id !== messageId) {
          return item
        }

        return {
          ...item,
          canRetry: false,
        }
      })
    })

    void submitPrompt(retrySource.retryPrompt)
  }

  return (
    <main className="cei-chat-shell">
      <header className="cei-chat-header">
        <div>
          <p className="cei-chat-kicker">CEI Agent UI - Phase 4</p>
          <h1 className="cei-chat-title">Polish and Deployment Readiness</h1>
          <p className="cei-chat-subtitle">Signed in as {userEmail}</p>
        </div>

        <button
          onClick={(): Promise<void> => logout()}
          type="button"
          className="cei-button-secondary"
        >
          Sign out
        </button>
      </header>

      <SectionCard title="Conversation">
        <div className="cei-chat-layout">
          {errorBanner ? (
            <div className="cei-error-banner" role="alert">
              <span>{errorBanner}</span>
              <button
                aria-label="Dismiss error"
                className="cei-error-dismiss"
                onClick={(): void => setErrorBanner('')}
                type="button"
              >
                Dismiss
              </button>
            </div>
          ) : null}

          {streamStatus === 'connecting' ? (
            <div className="cei-connection-indicator" data-testid="connecting-indicator">
              <span aria-hidden="true" className="cei-spinner" />
              Connecting to CEI service...
            </div>
          ) : null}

          <ChatMessageList
            items={timelineItems}
            listRef={messageListRef}
            onRetryMessage={onRetryMessage}
            onScroll={updateMessageScrollIntent}
            onToggleTool={onToggleTool}
          />

          <form className="cei-composer" onSubmit={onSubmit} data-testid="chat-form">
            <label htmlFor="cei-message">Instruction</label>
            <textarea
              id="cei-message"
              value={draftMessage}
              onChange={(event): void => setDraftMessage(event.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder="Ask the CEI agent to investigate a security scenario..."
              className="cei-textarea"
              disabled={isStreaming}
              ref={composerRef}
              rows={5}
            />

            <div className="cei-button-row">
              <button className="cei-button-primary" disabled={isStreaming} type="submit">
                {isStreaming ? 'Sending...' : 'Send'}
              </button>
              <button className="cei-button-secondary" onClick={createNewThread} type="button">
                New Thread
              </button>
            </div>
          </form>
        </div>
      </SectionCard>

      <SectionCard title="Session">
        <p className="cei-meta-row">
          Session ID: <code>{sessionId}</code>
        </p>
        <p className="cei-meta-row">Status: {status}</p>
        {errorBanner ? <p className="cei-meta-row cei-error-text">{errorBanner}</p> : null}
      </SectionCard>
    </main>
  )
}
