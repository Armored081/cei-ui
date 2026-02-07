import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { invokeAgentStream } from '../agent/AgentClient'
import { describeAuthError, useAuth } from '../auth/AuthProvider'
import { ChatMessageList, type ChatMessageItem, type ChatTimelineItem } from './ChatMessageList'
import { SectionCard } from './SectionCard'
import './ChatPage.css'

type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error'

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

function isMessageItem(item: ChatTimelineItem): item is ChatMessageItem {
  return item.type === 'message'
}

function buildUserMessage(content: string): ChatMessageItem {
  return {
    content,
    errorText: '',
    id: uuidv4(),
    isStreaming: false,
    role: 'user',
    tools: [],
    type: 'message',
  }
}

function buildAgentMessage(): ChatMessageItem {
  return {
    content: '',
    errorText: '',
    id: uuidv4(),
    isStreaming: true,
    role: 'agent',
    tools: [],
    type: 'message',
  }
}

export function ChatPage(): JSX.Element {
  const { getAccessToken, logout, userEmail } = useAuth()

  const [draftMessage, setDraftMessage] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [sessionId, setSessionId] = useState<string>(uuidv4())
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle')
  const [timelineItems, setTimelineItems] = useState<ChatTimelineItem[]>([])

  const activeAbortControllerRef = useRef<AbortController | null>(null)
  const activeStreamIdRef = useRef<number>(0)
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
    setError('')
    setStreamStatus('idle')
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
    const agentMessage = buildAgentMessage()

    setDraftMessage('')
    setError('')
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
              content: `${currentMessage.content}${streamEvent.content}`,
              isStreaming: true,
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
          setError(`${streamEvent.code}: ${streamEvent.message}`)
          setStreamStatus('error')
          setAgentMessageState(
            agentMessage.id,
            (currentMessage: ChatMessageItem): ChatMessageItem => ({
              ...currentMessage,
              errorText: `${streamEvent.code}: ${streamEvent.message}`,
              isStreaming: false,
            }),
          )
          return
        }

        if (streamEvent.type === 'done') {
          sawDoneEvent = true
          setStreamStatus('done')
          setAgentMessageState(
            agentMessage.id,
            (currentMessage: ChatMessageItem): ChatMessageItem => ({
              ...currentMessage,
              content: currentMessage.content || streamEvent.summary || currentMessage.content,
              isStreaming: false,
            }),
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

      const errorMessage = describeAuthError(submitError)
      setError(errorMessage)
      setStreamStatus('error')
      setAgentMessageState(
        agentMessage.id,
        (currentMessage: ChatMessageItem): ChatMessageItem => ({
          ...currentMessage,
          errorText: errorMessage,
          isStreaming: false,
        }),
      )
    } finally {
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

  return (
    <main className="cei-chat-shell">
      <header className="cei-chat-header">
        <div>
          <p className="cei-chat-kicker">CEI Agent UI - Phase 2</p>
          <h1 className="cei-chat-title">Chat Interface and Session Management</h1>
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
          <ChatMessageList
            items={timelineItems}
            listRef={messageListRef}
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
              rows={5}
            />

            <div className="cei-button-row">
              <button className="cei-button-primary" disabled={isStreaming} type="submit">
                Send
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
        {error ? <p className="cei-meta-row cei-error-text">{error}</p> : null}
      </SectionCard>
    </main>
  )
}
