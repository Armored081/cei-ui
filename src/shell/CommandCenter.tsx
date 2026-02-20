import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import { registerBuiltinArtifactTypes } from '../artifacts/registerBuiltinTypes'
import { useAuth } from '../auth/AuthProvider'
import { Composer } from '../conversation/Composer'
import '../conversation/conversation.css'
import { MessageList } from '../conversation/MessageList'
import { composerPropsFromEngine } from '../conversation/composerPropsFromEngine'
import type { Artifact, ConversationSnapshot } from '../hooks/useChatEngine'
import { useChatEngine } from '../hooks/useChatEngine'
import { useThreads } from '../hooks/useThreads'
import { ArtifactCard } from '../primitives/ArtifactCard'
import { ActivityDrawer } from '../primitives/ActivityDrawer'
import { ArtifactFullScreen } from '../primitives/ArtifactFullScreen'
import { ArtifactOverlay } from '../primitives/ArtifactOverlay'
import { SlideOver } from '../primitives/SlideOver'
import { SlideUpDrawer } from '../primitives/SlideUpDrawer'
import { ThreadList } from '../primitives/ThreadList'
import type { ChatMessageItem, ChatTimelineItem } from '../types/chat'
import { TopBar } from './TopBar'
import type { LayoutProps } from './types'
import './layout-shell.css'

registerBuiltinArtifactTypes()

const COMPACT_VIEWPORT_QUERY = '(max-width: 1024px)'

type ArtifactZoomLevel = 'inline' | 'expanded' | 'fullscreen'

interface ArtifactZoomState {
  artifactId: string | null
  zoomLevel: ArtifactZoomLevel
  previousZoomLevel: ArtifactZoomLevel | null
}

function createInlineZoomState(): ArtifactZoomState {
  return {
    artifactId: null,
    zoomLevel: 'inline',
    previousZoomLevel: null,
  }
}

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

function latestAgentMessageId(messages: ChatMessageItem[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]

    if (message.role === 'agent') {
      return message.id
    }
  }

  return null
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

function readEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    Boolean(target.isContentEditable)
  )
}

function zoomAnnouncementText(
  zoomLevel: ArtifactZoomLevel,
  artifactTitle: string | undefined,
): string {
  if (zoomLevel === 'inline') {
    return 'Artifact view closed.'
  }

  if (zoomLevel === 'expanded') {
    return artifactTitle
      ? `Expanded artifact view open: ${artifactTitle}.`
      : 'Expanded artifact view open.'
  }

  return artifactTitle
    ? `Full-screen artifact view open: ${artifactTitle}.`
    : 'Full-screen artifact view open.'
}

export function CommandCenter(): JSX.Element {
  const { getAccessToken, logout, userEmail } = useAuth()
  const engine = useChatEngine({ getAccessToken, logout })
  const [searchParams] = useSearchParams()
  const hasAppliedDraftRef = useRef<boolean>(false)

  useEffect((): void => {
    if (hasAppliedDraftRef.current) {
      return
    }

    hasAppliedDraftRef.current = true
    const draft = searchParams.get('draft')

    if (!draft) {
      return
    }

    const decodedDraft = decodeURIComponent(draft)

    if (!decodedDraft.trim()) {
      return
    }

    engine.setDraftMessage(decodedDraft)
  }, [engine, searchParams])

  return (
    <CommandCenterLayout
      engine={engine}
      onLogout={(): Promise<void> => logout()}
      userEmail={userEmail}
    />
  )
}

export function CommandCenterLayout({ engine, userEmail, onLogout }: LayoutProps): JSX.Element {
  const [artifactZoomState, setArtifactZoomState] =
    useState<ArtifactZoomState>(createInlineZoomState)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [isActivityDrawerExpanded, setIsActivityDrawerExpanded] = useState(false)
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
    (): Artifact | null =>
      engine.artifacts.find((artifact) => artifact.id === artifactZoomState.artifactId) ?? null,
    [artifactZoomState.artifactId, engine.artifacts],
  )

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads],
  )
  const currentExchangeMessageId = useMemo(
    (): string | null => latestAgentMessageId(engine.messages),
    [engine.messages],
  )
  const zoomAnnouncement = useMemo(
    (): string => zoomAnnouncementText(artifactZoomState.zoomLevel, selectedArtifact?.title),
    [artifactZoomState.zoomLevel, selectedArtifact?.title],
  )

  const onResetArtifactZoom = useCallback((): void => {
    setArtifactZoomState(createInlineZoomState())
  }, [])

  const onSelectArtifact = useCallback((artifactId: string): void => {
    setArtifactZoomState({
      artifactId,
      zoomLevel: 'expanded',
      previousZoomLevel: 'inline',
    })
    setMobileArtifactsOpen(false)
  }, [])

  const onEnterArtifactFullScreen = useCallback((): void => {
    setArtifactZoomState((currentZoomState): ArtifactZoomState => {
      if (!currentZoomState.artifactId || currentZoomState.zoomLevel === 'fullscreen') {
        return currentZoomState
      }

      return {
        artifactId: currentZoomState.artifactId,
        zoomLevel: 'fullscreen',
        previousZoomLevel: currentZoomState.zoomLevel,
      }
    })
  }, [])

  const onExitArtifactFullScreen = useCallback((): void => {
    setArtifactZoomState((currentZoomState): ArtifactZoomState => {
      if (!currentZoomState.artifactId || currentZoomState.zoomLevel !== 'fullscreen') {
        return currentZoomState
      }

      return {
        artifactId: currentZoomState.artifactId,
        zoomLevel: 'expanded',
        previousZoomLevel: 'fullscreen',
      }
    })
  }, [])

  const onPrevArtifact = useCallback((): void => {
    setArtifactZoomState((current): ArtifactZoomState => {
      if (!current.artifactId || current.zoomLevel === 'inline') return current
      const currentIndex = engine.artifacts.findIndex((a) => a.id === current.artifactId)
      if (currentIndex <= 0) return current
      return {
        artifactId: engine.artifacts[currentIndex - 1].id,
        zoomLevel: current.zoomLevel,
        previousZoomLevel: current.previousZoomLevel,
      }
    })
  }, [engine.artifacts])

  const onNextArtifact = useCallback((): void => {
    setArtifactZoomState((current): ArtifactZoomState => {
      if (!current.artifactId || current.zoomLevel === 'inline') return current
      const currentIndex = engine.artifacts.findIndex((a) => a.id === current.artifactId)
      if (currentIndex < 0 || currentIndex >= engine.artifacts.length - 1) return current
      return {
        artifactId: engine.artifacts[currentIndex + 1].id,
        zoomLevel: current.zoomLevel,
        previousZoomLevel: current.previousZoomLevel,
      }
    })
  }, [engine.artifacts])

  const selectedArtifactIndex = useMemo((): number => {
    if (!artifactZoomState.artifactId) return -1
    return engine.artifacts.findIndex((a) => a.id === artifactZoomState.artifactId)
  }, [artifactZoomState.artifactId, engine.artifacts])

  const artifactPositionLabel = useMemo((): string | undefined => {
    if (selectedArtifactIndex < 0 || engine.artifacts.length <= 1) return undefined
    return `${(selectedArtifactIndex + 1).toString()}/${engine.artifacts.length.toString()}`
  }, [selectedArtifactIndex, engine.artifacts.length])

  const onStepBackArtifactZoom = useCallback((): void => {
    setArtifactZoomState((currentZoomState): ArtifactZoomState => {
      if (currentZoomState.zoomLevel === 'inline') {
        return currentZoomState
      }

      if (currentZoomState.zoomLevel === 'expanded') {
        return createInlineZoomState()
      }

      if (
        currentZoomState.zoomLevel === 'fullscreen' &&
        currentZoomState.previousZoomLevel === 'expanded' &&
        currentZoomState.artifactId
      ) {
        return {
          artifactId: currentZoomState.artifactId,
          zoomLevel: 'expanded',
          previousZoomLevel: 'fullscreen',
        }
      }

      return createInlineZoomState()
    })
  }, [])

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

  useEffect((): (() => void) => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && artifactZoomState.zoomLevel !== 'inline') {
        event.preventDefault()
        onStepBackArtifactZoom()
        return
      }

      if (event.key.toLocaleLowerCase() !== 'f') {
        if (event.key.toLocaleLowerCase() !== 'a') {
          return
        }

        if (readEditableTarget(event.target) || rightCollapsed) {
          return
        }

        event.preventDefault()
        setIsActivityDrawerExpanded((currentExpanded: boolean): boolean => !currentExpanded)
        return
      }

      if (artifactZoomState.zoomLevel !== 'expanded' || readEditableTarget(event.target)) {
        return
      }

      event.preventDefault()
      onEnterArtifactFullScreen()
    }

    window.addEventListener('keydown', onKeyDown)
    return (): void => window.removeEventListener('keydown', onKeyDown)
  }, [
    artifactZoomState.zoomLevel,
    onEnterArtifactFullScreen,
    onStepBackArtifactZoom,
    rightCollapsed,
  ])

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
    onResetArtifactZoom()
    setMobileThreadsOpen(false)
  }, [activeThreadId, createThread, engine, onResetArtifactZoom])

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
      onResetArtifactZoom()
      setMobileThreadsOpen(false)
    },
    [activeThreadId, engine, onResetArtifactZoom, switchThread],
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
        onResetArtifactZoom()
        return
      }

      const nextThread = createThread()
      const emptySnapshot = createEmptyConversationSnapshot()
      threadStateMapRef.current.set(nextThread.id, emptySnapshot)
      threadMessageCountsRef.current.set(nextThread.id, 0)
      engine.restoreConversationSnapshot(emptySnapshot)
      onResetArtifactZoom()
    },
    [
      activeThreadId,
      archiveThread,
      createThread,
      engine,
      onResetArtifactZoom,
      switchThread,
      threads,
    ],
  )

  const onSelectArtifactFromMessage = useCallback((artifactId: string): void => {
    setArtifactZoomState({
      artifactId,
      zoomLevel: 'expanded',
      previousZoomLevel: 'inline',
    })
    setMobileArtifactsOpen(false)
  }, [])

  const onToggleActivityDrawer = useCallback((): void => {
    setIsActivityDrawerExpanded((currentExpanded: boolean): boolean => !currentExpanded)
  }, [])

  const gridClassName = `cei-cc-grid${leftCollapsed ? ' cei-cc-grid-left-collapsed' : ''}${
    rightCollapsed ? ' cei-cc-grid-right-collapsed' : ''
  }`

  return (
    <div className="cei-cc-shell">
      <TopBar userEmail={userEmail} onLogout={onLogout} />

      <p aria-atomic="true" aria-live="polite" className="cei-sr-only">
        {zoomAnnouncement}
      </p>

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
              aria-label="Expand thread rail"
              className="cei-cc-expand-btn cei-cc-expand-left"
              onClick={(): void => setLeftCollapsed(false)}
              title="Expand thread rail"
              type="button"
            >
              &rsaquo;
            </button>
          ) : (
            <>
              <div className="cei-cc-rail-header">
                <h3 className="cei-cc-rail-title">Threads</h3>
                <button
                  aria-label="Collapse thread rail"
                  className="cei-cc-collapse-btn"
                  onClick={(): void => setLeftCollapsed(true)}
                  type="button"
                >
                  &lsaquo;
                </button>
              </div>
              <ThreadList
                activeThreadId={activeThreadId}
                onArchiveThread={onArchiveThread}
                onCreateThread={onCreateThread}
                onPinThread={pinThread}
                onSearchQueryChange={setSearchQuery}
                onSelectThread={onSwitchThread}
                onUnpinThread={unpinThread}
                searchQuery={searchQuery}
                threads={filteredThreads}
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
            blockRenderer="pill"
            displayMode="clean"
            items={engine.timelineItems}
            listRef={engine.messageListRef}
            onArtifactClick={onSelectArtifactFromMessage}
            onRetryMessage={engine.onRetryMessage}
            onScroll={engine.updateMessageScrollIntent}
            onToggleTool={engine.onToggleTool}
          />
          <Composer {...composerPropsFromEngine(engine, 'full')} />
        </main>

        {/* Right rail: Artifacts */}
        <aside className={`cei-cc-right${rightCollapsed ? ' cei-cc-rail-collapsed' : ''}`}>
          {rightCollapsed ? (
            <button
              aria-label="Expand artifacts rail"
              className="cei-cc-expand-btn cei-cc-expand-right"
              onClick={(): void => setRightCollapsed(false)}
              title="Expand artifacts rail"
              type="button"
            >
              &lsaquo;
            </button>
          ) : (
            <>
              <div className="cei-cc-rail-header">
                <h3 className="cei-cc-rail-title">Artifacts</h3>
                <button
                  aria-label="Collapse artifacts rail"
                  className="cei-cc-collapse-btn"
                  onClick={(): void => {
                    setRightCollapsed(true)
                    setIsActivityDrawerExpanded(false)
                  }}
                  type="button"
                >
                  &rsaquo;
                </button>
              </div>
              <div className="cei-cc-artifacts">
                {engine.artifacts.length === 0 ? (
                  <p className="cei-muted cei-cc-empty-hint">Artifacts will appear here.</p>
                ) : (
                  engine.artifacts.map((artifact) => (
                    <ArtifactCard
                      artifact={artifact}
                      isSelected={artifact.id === artifactZoomState.artifactId}
                      key={artifact.id}
                      onClick={onSelectArtifact}
                    />
                  ))
                )}
              </div>
              <ActivityDrawer
                currentExchangeMessageId={currentExchangeMessageId}
                isExpanded={isActivityDrawerExpanded}
                onToggleExpanded={onToggleActivityDrawer}
                toolLog={engine.toolLog}
              />
            </>
          )}
        </aside>

        {selectedArtifact && artifactZoomState.zoomLevel === 'expanded' ? (
          <ArtifactOverlay
            artifact={selectedArtifact}
            artifactPosition={artifactPositionLabel}
            onBack={onStepBackArtifactZoom}
            onClose={onResetArtifactZoom}
            onNextArtifact={
              selectedArtifactIndex < engine.artifacts.length - 1 ? onNextArtifact : null
            }
            onPrevArtifact={selectedArtifactIndex > 0 ? onPrevArtifact : null}
            onToggleFullScreen={onEnterArtifactFullScreen}
          />
        ) : null}
      </div>

      {selectedArtifact && artifactZoomState.zoomLevel === 'fullscreen' ? (
        <ArtifactFullScreen
          artifact={selectedArtifact}
          onBack={onStepBackArtifactZoom}
          onClose={onResetArtifactZoom}
          onEscape={onStepBackArtifactZoom}
          onToggleFullScreen={onExitArtifactFullScreen}
        />
      ) : null}

      <SlideOver
        isOpen={isCompactLayout && mobileThreadsOpen}
        onClose={(): void => setMobileThreadsOpen(false)}
        title="Threads"
        width="320px"
      >
        <ThreadList
          activeThreadId={activeThreadId}
          onArchiveThread={onArchiveThread}
          onCreateThread={onCreateThread}
          onPinThread={pinThread}
          onSearchQueryChange={setSearchQuery}
          onSelectThread={onSwitchThread}
          onUnpinThread={unpinThread}
          searchQuery={searchQuery}
          threads={filteredThreads}
        />
      </SlideOver>

      <SlideUpDrawer
        isOpen={isCompactLayout && mobileArtifactsOpen}
        maxHeight="72vh"
        onClose={(): void => setMobileArtifactsOpen(false)}
        title="Artifacts"
      >
        <div className="cei-cc-artifacts">
          {engine.artifacts.length === 0 ? (
            <p className="cei-muted cei-cc-empty-hint">Artifacts will appear here.</p>
          ) : (
            engine.artifacts.map((artifact) => (
              <ArtifactCard
                artifact={artifact}
                isSelected={artifact.id === artifactZoomState.artifactId}
                key={artifact.id}
                onClick={onSelectArtifact}
              />
            ))
          )}
        </div>
      </SlideUpDrawer>
    </div>
  )
}
