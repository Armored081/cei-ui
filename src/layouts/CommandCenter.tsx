import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

import type { ChatMessageItem, ChatTimelineItem } from '../components/ChatMessageList'
import type { ConversationSnapshot } from '../hooks/useChatEngine'
import type { Artifact } from '../hooks/useChatEngine'
import { useThreads } from '../hooks/useThreads'
import { TopBar } from '../primitives/TopBar'
import { MessageList } from '../primitives/MessageList'
import { Composer } from '../primitives/Composer'
import { composerPropsFromEngine } from '../primitives/composerPropsFromEngine'
import { SlideOver } from '../primitives/SlideOver'
import { SlideUpDrawer } from '../primitives/SlideUpDrawer'
import { ArtifactCard } from '../primitives/ArtifactCard'
import { ArtifactExpanded } from '../primitives/ArtifactExpanded'
import { ActivitySummaryBar } from '../primitives/ActivitySummaryBar'
import { ThreadList } from '../primitives/ThreadList'
import type { LayoutProps } from './types'
import './layout-command-center.css'

const COMPACT_VIEWPORT_QUERY = '(max-width: 1024px)'

function readIsCompactLayout(): boolean {
  if (typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(COMPACT_VIEWPORT_QUERY).matches
}

function isMessageItem(item: ChatTimelineItem): item is ChatMessageItem {
  return item.type === 'message'
}

function messageCountFromSnapshot(snapshot: ConversationSnapshot): number {
  return snapshot.timelineItems.filter((item: ChatTimelineItem): boolean => isMessageItem(item))
    .length
}

function createEmptyConversationSnapshot(): ConversationSnapshot {
  return {
    sessionId: uuidv4(),
    timelineItems: [],
  }
}

function textFromUserMessage(message: ChatMessageItem): string {
  return message.segments
    .filter((segment): segment is { content: string; type: 'text' } => segment.type === 'text')
    .map((segment) => segment.content)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildThreadTitle(userMessageText: string): string {
  const normalizedMessage = userMessageText.replace(/\s+/g, ' ').trim()

  if (!normalizedMessage) {
    return 'New Thread'
  }

  const firstSentence =
    normalizedMessage
      .split(/[.!?]/)
      .map((segment: string): string => segment.trim())
      .find((segment: string): boolean => segment.length > 0) || normalizedMessage

  const firstWords = normalizedMessage
    .split(' ')
    .filter((word: string): boolean => word.length > 0)
    .slice(0, 8)
    .join(' ')

  const shortestCandidate = firstSentence.length <= firstWords.length ? firstSentence : firstWords

  if (shortestCandidate.length <= 50) {
    return shortestCandidate
  }

  return `${shortestCandidate.slice(0, 47).trimEnd()}...`
}

export function CommandCenter({ engine, userEmail, onLogout }: LayoutProps): JSX.Element {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [isCompactLayout, setIsCompactLayout] = useState<boolean>(readIsCompactLayout)
  const [mobileThreadsOpen, setMobileThreadsOpen] = useState(false)
  const [mobileArtifactsOpen, setMobileArtifactsOpen] = useState(false)

  const {
    threads,
    filteredThreads,
    activeThreadId,
    createThread,
    switchThread,
    archiveThread,
    pinThread,
    unpinThread,
    searchQuery,
    setSearchQuery,
    updateThreadTitle,
    updateThreadStatus,
    incrementMessageCount,
    updateArtifactCount,
    touchThread,
  } = useThreads()

  const threadStateMapRef = useRef<Map<string, ConversationSnapshot>>(new Map())
  const threadMessageCountsRef = useRef<Map<string, number>>(new Map())

  const selectedArtifact: Artifact | null = useMemo(
    (): Artifact | null => engine.artifacts.find((a) => a.id === selectedArtifactId) ?? null,
    [engine.artifacts, selectedArtifactId],
  )

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads],
  )

  useEffect((): void => {
    if (!activeThreadId) {
      return
    }

    if (!threadStateMapRef.current.has(activeThreadId)) {
      threadStateMapRef.current.set(activeThreadId, engine.getConversationSnapshot())
    }

    if (!threadMessageCountsRef.current.has(activeThreadId)) {
      threadMessageCountsRef.current.set(activeThreadId, engine.messages.length)
    }
  }, [activeThreadId, engine])

  useEffect((): (() => void) => {
    if (typeof window.matchMedia !== 'function') {
      return (): void => {}
    }

    const mediaQuery = window.matchMedia(COMPACT_VIEWPORT_QUERY)

    const onViewportChange = (event: MediaQueryListEvent): void => {
      setIsCompactLayout(event.matches)
      if (!event.matches) {
        setMobileThreadsOpen(false)
        setMobileArtifactsOpen(false)
      }
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onViewportChange)
      return (): void => mediaQuery.removeEventListener('change', onViewportChange)
    }

    mediaQuery.addListener(onViewportChange)
    return (): void => mediaQuery.removeListener(onViewportChange)
  }, [])

  useEffect((): void => {
    if (!activeThreadId) {
      return
    }

    const previousMessageCount = threadMessageCountsRef.current.get(activeThreadId) || 0
    const currentMessageCount = engine.messages.length

    if (currentMessageCount > previousMessageCount) {
      const incrementCount = currentMessageCount - previousMessageCount

      for (let index = 0; index < incrementCount; index += 1) {
        incrementMessageCount(activeThreadId)
      }

      touchThread(activeThreadId)
    }

    threadMessageCountsRef.current.set(activeThreadId, currentMessageCount)
  }, [activeThreadId, engine.messages.length, incrementMessageCount, touchThread])

  useEffect((): void => {
    if (!activeThreadId) {
      return
    }

    updateArtifactCount(activeThreadId, engine.artifacts.length)
  }, [activeThreadId, engine.artifacts.length, updateArtifactCount])

  useEffect((): void => {
    if (!activeThreadId) {
      return
    }

    updateThreadStatus(activeThreadId, engine.isStreaming ? 'active' : 'idle')
  }, [activeThreadId, engine.isStreaming, updateThreadStatus])

  useEffect((): void => {
    if (!activeThreadId) {
      return
    }

    if (engine.messages.length === 0 && engine.toolLog.length === 0) {
      return
    }

    touchThread(activeThreadId)
  }, [activeThreadId, engine.messages.length, engine.toolLog.length, touchThread])

  useEffect((): void => {
    if (!activeThreadId || !activeThread || activeThread.title) {
      return
    }

    const firstUserMessage = engine.messages.find((message): boolean => message.role === 'user')
    const firstAgentMessage = engine.messages.find((message): boolean => message.role === 'agent')

    if (!firstUserMessage || !firstAgentMessage || firstAgentMessage.isStreaming) {
      return
    }

    const firstUserMessageText = textFromUserMessage(firstUserMessage)

    if (!firstUserMessageText) {
      return
    }

    updateThreadTitle(activeThreadId, buildThreadTitle(firstUserMessageText))
  }, [activeThread, activeThreadId, engine.messages, updateThreadTitle])

  const onCreateThread = useCallback((): void => {
    if (activeThreadId) {
      threadStateMapRef.current.set(activeThreadId, engine.getConversationSnapshot())
      threadMessageCountsRef.current.set(activeThreadId, engine.messages.length)
    }

    const nextThread = createThread()
    const emptySnapshot = createEmptyConversationSnapshot()

    threadStateMapRef.current.set(nextThread.id, emptySnapshot)
    threadMessageCountsRef.current.set(nextThread.id, 0)

    engine.restoreConversationSnapshot(emptySnapshot)
    setSelectedArtifactId(null)
    setMobileThreadsOpen(false)
  }, [activeThreadId, createThread, engine])

  const onSwitchThread = useCallback(
    (threadId: string): void => {
      if (threadId === activeThreadId) {
        setMobileThreadsOpen(false)
        return
      }

      if (activeThreadId) {
        threadStateMapRef.current.set(activeThreadId, engine.getConversationSnapshot())
        threadMessageCountsRef.current.set(activeThreadId, engine.messages.length)
      }

      const targetSnapshot =
        threadStateMapRef.current.get(threadId) || createEmptyConversationSnapshot()

      threadStateMapRef.current.set(threadId, targetSnapshot)
      threadMessageCountsRef.current.set(threadId, messageCountFromSnapshot(targetSnapshot))

      switchThread(threadId)
      engine.restoreConversationSnapshot(targetSnapshot)
      setSelectedArtifactId(null)
      setMobileThreadsOpen(false)
    },
    [activeThreadId, engine, switchThread],
  )

  const onArchiveThread = useCallback(
    (threadId: string): void => {
      const isActiveThread = activeThreadId === threadId

      if (isActiveThread && activeThreadId) {
        threadStateMapRef.current.set(activeThreadId, engine.getConversationSnapshot())
        threadMessageCountsRef.current.set(activeThreadId, engine.messages.length)
      }

      archiveThread(threadId)
      threadStateMapRef.current.delete(threadId)
      threadMessageCountsRef.current.delete(threadId)

      if (!isActiveThread) {
        return
      }

      const fallbackThread = threads.find((thread) => thread.id !== threadId)

      if (fallbackThread) {
        const fallbackSnapshot =
          threadStateMapRef.current.get(fallbackThread.id) || createEmptyConversationSnapshot()

        threadStateMapRef.current.set(fallbackThread.id, fallbackSnapshot)
        threadMessageCountsRef.current.set(
          fallbackThread.id,
          messageCountFromSnapshot(fallbackSnapshot),
        )

        switchThread(fallbackThread.id)
        engine.restoreConversationSnapshot(fallbackSnapshot)
        setSelectedArtifactId(null)
        return
      }

      const nextThread = createThread()
      const emptySnapshot = createEmptyConversationSnapshot()
      threadStateMapRef.current.set(nextThread.id, emptySnapshot)
      threadMessageCountsRef.current.set(nextThread.id, 0)
      engine.restoreConversationSnapshot(emptySnapshot)
      setSelectedArtifactId(null)
    },
    [activeThreadId, archiveThread, createThread, engine, switchThread, threads],
  )

  const onSelectArtifact = useCallback((artifactId: string): void => {
    setSelectedArtifactId(artifactId)
  }, [])

  const onSelectArtifactFromMessage = useCallback(
    (artifactId: string): void => {
      setSelectedArtifactId(artifactId)
      if (isCompactLayout) {
        setMobileArtifactsOpen(true)
      }
    },
    [isCompactLayout],
  )

  const gridClassName = `cei-cc-grid${leftCollapsed ? ' cei-cc-grid-left-collapsed' : ''}${
    rightCollapsed ? ' cei-cc-grid-right-collapsed' : ''
  }`

  return (
    <div className="cei-cc-shell">
      <TopBar userEmail={userEmail} onLogout={onLogout} />

      {engine.errorBanner ? (
        <div className="cei-error-banner" role="alert">
          <span>{engine.errorBanner}</span>
          <button
            aria-label="Dismiss error"
            className="cei-error-dismiss"
            onClick={(): void => engine.setErrorBanner('')}
            type="button"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {engine.streamStatus === 'connecting' ? (
        <div className="cei-connection-indicator" data-testid="connecting-indicator">
          <span aria-hidden="true" className="cei-spinner" />
          Connecting to CEI service...
        </div>
      ) : null}

      <div className={gridClassName}>
        {/* Left rail: Threads */}
        <aside className={`cei-cc-left${leftCollapsed ? ' cei-cc-rail-collapsed' : ''}`}>
          {leftCollapsed ? (
            <button
              className="cei-cc-expand-btn cei-cc-expand-left"
              onClick={(): void => setLeftCollapsed(false)}
              title="Expand thread rail"
              type="button"
              aria-label="Expand thread rail"
            >
              &rsaquo;
            </button>
          ) : (
            <>
              <div className="cei-cc-rail-header">
                <h3 className="cei-cc-rail-title">Threads</h3>
                <button
                  className="cei-cc-collapse-btn"
                  onClick={(): void => setLeftCollapsed(true)}
                  type="button"
                  aria-label="Collapse thread rail"
                >
                  &lsaquo;
                </button>
              </div>
              <ThreadList
                threads={filteredThreads}
                activeThreadId={activeThreadId}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onCreateThread={onCreateThread}
                onSelectThread={onSwitchThread}
                onArchiveThread={onArchiveThread}
                onPinThread={pinThread}
                onUnpinThread={unpinThread}
              />
            </>
          )}
        </aside>

        {/* Center: Conversation */}
        <main className="cei-cc-center">
          <div className="cei-cc-mobile-controls">
            <button
              aria-haspopup="dialog"
              className="cei-cc-mobile-control-btn"
              onClick={(): void => setMobileThreadsOpen(true)}
              type="button"
            >
              Menu Threads
            </button>
            <button
              aria-haspopup="dialog"
              className="cei-cc-mobile-control-btn"
              onClick={(): void => setMobileArtifactsOpen(true)}
              type="button"
            >
              Artifacts{' '}
              {engine.artifacts.length > 0 ? `(${engine.artifacts.length.toString()})` : ''}
            </button>
          </div>
          <MessageList
            items={engine.timelineItems}
            listRef={engine.messageListRef}
            onRetryMessage={engine.onRetryMessage}
            onScroll={engine.updateMessageScrollIntent}
            onToggleTool={engine.onToggleTool}
            displayMode="clean"
            blockRenderer="pill"
            onArtifactClick={onSelectArtifactFromMessage}
          />
          <Composer {...composerPropsFromEngine(engine, 'full')} />
        </main>

        {/* Right rail: Artifacts */}
        <aside className={`cei-cc-right${rightCollapsed ? ' cei-cc-rail-collapsed' : ''}`}>
          {rightCollapsed ? (
            <button
              className="cei-cc-expand-btn cei-cc-expand-right"
              onClick={(): void => setRightCollapsed(false)}
              title="Expand artifacts rail"
              type="button"
              aria-label="Expand artifacts rail"
            >
              &lsaquo;
            </button>
          ) : (
            <>
              <div className="cei-cc-rail-header">
                <h3 className="cei-cc-rail-title">Artifacts</h3>
                <button
                  className="cei-cc-collapse-btn"
                  onClick={(): void => setRightCollapsed(true)}
                  type="button"
                  aria-label="Collapse artifacts rail"
                >
                  &rsaquo;
                </button>
              </div>
              <div className="cei-cc-artifacts">
                {selectedArtifact ? (
                  <ArtifactExpanded
                    artifact={selectedArtifact}
                    onClose={(): void => setSelectedArtifactId(null)}
                  />
                ) : engine.artifacts.length === 0 ? (
                  <p className="cei-muted cei-cc-empty-hint">Artifacts will appear here.</p>
                ) : (
                  engine.artifacts.map((artifact) => (
                    <ArtifactCard
                      key={artifact.id}
                      artifact={artifact}
                      isSelected={artifact.id === selectedArtifactId}
                      onClick={onSelectArtifact}
                    />
                  ))
                )}
              </div>
              <ActivitySummaryBar toolLog={engine.toolLog} />
            </>
          )}
        </aside>
      </div>

      <SlideOver
        isOpen={isCompactLayout && mobileThreadsOpen}
        onClose={(): void => setMobileThreadsOpen(false)}
        title="Threads"
        width="320px"
      >
        <ThreadList
          threads={filteredThreads}
          activeThreadId={activeThreadId}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onCreateThread={onCreateThread}
          onSelectThread={onSwitchThread}
          onArchiveThread={onArchiveThread}
          onPinThread={pinThread}
          onUnpinThread={unpinThread}
        />
      </SlideOver>

      <SlideUpDrawer
        isOpen={isCompactLayout && mobileArtifactsOpen}
        onClose={(): void => setMobileArtifactsOpen(false)}
        title="Artifacts"
        maxHeight="72vh"
      >
        <div className="cei-cc-artifacts">
          {selectedArtifact ? (
            <ArtifactExpanded
              artifact={selectedArtifact}
              onClose={(): void => setSelectedArtifactId(null)}
            />
          ) : engine.artifacts.length === 0 ? (
            <p className="cei-muted cei-cc-empty-hint">Artifacts will appear here.</p>
          ) : (
            engine.artifacts.map((artifact) => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                isSelected={artifact.id === selectedArtifactId}
                onClick={onSelectArtifact}
              />
            ))
          )}
        </div>
      </SlideUpDrawer>
    </div>
  )
}
