import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Thread } from '../threads/types'
import { useThreads } from './useThreads'

function createThreadAt(
  result: { current: ReturnType<typeof useThreads> },
  isoTime: string,
): Thread {
  vi.setSystemTime(new Date(isoTime))

  let createdThread: Thread | null = null

  act((): void => {
    createdThread = result.current.createThread()
  })

  if (!createdThread) {
    throw new Error('Expected thread to be created')
  }

  return createdThread
}

function offsetTime(baseIso: string, offsetMilliseconds: number): string {
  return new Date(new Date(baseIso).getTime() + offsetMilliseconds).toISOString()
}

describe('useThreads', (): void => {
  beforeEach((): void => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-12T10:00:00.000Z'))
  })

  afterEach((): void => {
    vi.useRealTimers()
  })

  it('supports create/switch/archive and metadata updates', (): void => {
    const { result } = renderHook(() => useThreads())

    const initialThread = result.current.threads[0]

    const nextThread = createThreadAt(result, '2026-02-12T10:01:00.000Z')

    expect(result.current.activeThreadId).toBe(nextThread.id)
    expect(result.current.threads).toHaveLength(2)

    act((): void => {
      result.current.switchThread(initialThread.id)
      result.current.updateThreadTitle(initialThread.id, 'Risk Matrix Coverage Analysis')
      result.current.updateThreadStatus(initialThread.id, 'active')
      result.current.incrementMessageCount(initialThread.id)
      result.current.incrementMessageCount(initialThread.id)
      result.current.updateArtifactCount(initialThread.id, 3)
      result.current.touchThread(initialThread.id)
      result.current.archiveThread(nextThread.id)
    })

    const updatedInitialThread = result.current.threads.find(
      (thread) => thread.id === initialThread.id,
    )

    expect(updatedInitialThread?.title).toBe('Risk Matrix Coverage Analysis')
    expect(updatedInitialThread?.status).toBe('active')
    expect(updatedInitialThread?.messageCount).toBe(2)
    expect(updatedInitialThread?.artifactCount).toBe(3)
    expect(result.current.threads.some((thread) => thread.id === nextThread.id)).toBe(false)
  })

  it('filters by search query and sorts pinned threads first', (): void => {
    const { result } = renderHook(() => useThreads())

    const first = createThreadAt(result, '2026-02-12T10:01:00.000Z')
    const second = createThreadAt(result, '2026-02-12T10:02:00.000Z')

    act((): void => {
      result.current.updateThreadTitle(first.id, 'Risk Matrix Coverage Analysis')
      result.current.updateThreadTitle(second.id, 'IAM Review')
      result.current.pinThread(first.id)
      result.current.setSearchQuery('risk')
    })

    expect(result.current.filteredThreads).toHaveLength(1)
    expect(result.current.filteredThreads[0].id).toBe(first.id)

    act((): void => {
      result.current.setSearchQuery('')
    })

    expect(result.current.threads[0].id).toBe(first.id)
    expect(result.current.threads[0].isPinned).toBe(true)
  })

  it('enforces a maximum of 20 pinned threads', (): void => {
    const { result } = renderHook(() => useThreads())

    const createdIds: string[] = []
    const baseIso = '2026-02-12T10:00:00.000Z'

    for (let index = 0; index < 21; index += 1) {
      const thread = createThreadAt(result, offsetTime(baseIso, (index + 1) * 60_000))
      createdIds.push(thread.id)
    }

    act((): void => {
      for (const threadId of createdIds) {
        result.current.pinThread(threadId)
      }
    })

    const pinnedCount = result.current.threads.filter(
      (thread: Thread): boolean => thread.isPinned,
    ).length

    expect(pinnedCount).toBe(20)
  })

  it('auto-archives the oldest unpinned thread when visible limit is exceeded', (): void => {
    const { result } = renderHook(() => useThreads())

    const initialThreadId = result.current.threads[0].id

    const baseIso = '2026-02-12T10:00:00.000Z'

    for (let index = 0; index < 200; index += 1) {
      createThreadAt(result, offsetTime(baseIso, (index + 1) * 1000))
    }

    expect(result.current.threads).toHaveLength(200)
    expect(
      result.current.threads.some((thread: Thread): boolean => thread.id === initialThreadId),
    ).toBe(false)
  })
})
