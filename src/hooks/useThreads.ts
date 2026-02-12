import { useCallback, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

import type { Thread } from '../threads/types'

const MAX_VISIBLE_THREADS = 200
const MAX_PINNED_THREADS = 20

function nowIso(): string {
  return new Date().toISOString()
}

function createThreadRecord(createdAt: string): Thread {
  return {
    id: uuidv4(),
    title: null,
    status: 'idle',
    isPinned: false,
    createdAt,
    updatedAt: createdAt,
    lastActivityAt: createdAt,
    messageCount: 0,
    artifactCount: 0,
  }
}

function sortThreads(threads: Thread[]): Thread[] {
  return [...threads].sort((left: Thread, right: Thread): number => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1
    }

    return Date.parse(right.lastActivityAt) - Date.parse(left.lastActivityAt)
  })
}

function enforceThreadLimit(threads: Thread[]): Thread[] {
  const nextThreads = [...threads]

  let visibleThreadCount = nextThreads.filter(
    (thread: Thread): boolean => thread.status !== 'archived',
  ).length

  while (visibleThreadCount > MAX_VISIBLE_THREADS) {
    const candidate = nextThreads
      .filter((thread: Thread): boolean => thread.status !== 'archived' && !thread.isPinned)
      .sort((left: Thread, right: Thread): number => {
        return Date.parse(left.createdAt) - Date.parse(right.createdAt)
      })[0]

    if (!candidate) {
      break
    }

    const archivedAt = nowIso()

    for (let index = 0; index < nextThreads.length; index += 1) {
      if (nextThreads[index].id !== candidate.id) {
        continue
      }

      nextThreads[index] = {
        ...nextThreads[index],
        status: 'archived',
        isPinned: false,
        updatedAt: archivedAt,
      }
      visibleThreadCount -= 1
      break
    }
  }

  return nextThreads
}

function updateThread(
  threads: Thread[],
  threadId: string,
  updater: (thread: Thread, timestamp: string) => Thread,
): Thread[] {
  const timestamp = nowIso()

  return threads.map((thread: Thread): Thread => {
    if (thread.id !== threadId) {
      return thread
    }

    return updater(thread, timestamp)
  })
}

export interface UseThreadsResult {
  threads: Thread[]
  activeThreadId: string | null

  createThread: () => Thread
  switchThread: (threadId: string) => void
  archiveThread: (threadId: string) => void
  pinThread: (threadId: string) => void
  unpinThread: (threadId: string) => void

  searchQuery: string
  setSearchQuery: (q: string) => void
  filteredThreads: Thread[]

  updateThreadTitle: (threadId: string, title: string) => void
  updateThreadStatus: (threadId: string, status: Thread['status']) => void
  incrementMessageCount: (threadId: string) => void
  updateArtifactCount: (threadId: string, count: number) => void
  touchThread: (threadId: string) => void
}

/**
 * Maintains thread metadata and active-thread selection for the command center.
 *
 * The state is intentionally client-side and in-memory for this phase so it can
 * later be swapped with server-backed storage behind the same interface.
 */
export function useThreads(): UseThreadsResult {
  const initialTimestamp = nowIso()
  const initialThread = createThreadRecord(initialTimestamp)

  const [allThreads, setAllThreads] = useState<Thread[]>([initialThread])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThread.id)
  const [searchQuery, setSearchQuery] = useState<string>('')

  const createThread = useCallback((): Thread => {
    const createdAt = nowIso()
    const thread = createThreadRecord(createdAt)

    setAllThreads((currentThreads: Thread[]): Thread[] => {
      return enforceThreadLimit([...currentThreads, thread])
    })

    setActiveThreadId(thread.id)

    return thread
  }, [])

  const switchThread = useCallback(
    (threadId: string): void => {
      const exists = allThreads.some(
        (thread: Thread): boolean => thread.id === threadId && thread.status !== 'archived',
      )

      if (!exists) {
        return
      }

      setActiveThreadId(threadId)
    },
    [allThreads],
  )

  const archiveThread = useCallback((threadId: string): void => {
    setAllThreads((currentThreads: Thread[]): Thread[] => {
      return updateThread(
        currentThreads,
        threadId,
        (thread: Thread, timestamp: string): Thread => ({
          ...thread,
          status: 'archived',
          isPinned: false,
          updatedAt: timestamp,
        }),
      )
    })

    setActiveThreadId((currentThreadId: string | null): string | null => {
      if (currentThreadId !== threadId) {
        return currentThreadId
      }

      return null
    })
  }, [])

  const pinThread = useCallback((threadId: string): void => {
    setAllThreads((currentThreads: Thread[]): Thread[] => {
      const target = currentThreads.find((thread: Thread): boolean => thread.id === threadId)

      if (!target || target.status === 'archived' || target.isPinned) {
        return currentThreads
      }

      const pinnedThreadCount = currentThreads.filter(
        (thread: Thread): boolean => thread.status !== 'archived' && thread.isPinned,
      ).length

      if (pinnedThreadCount >= MAX_PINNED_THREADS) {
        return currentThreads
      }

      return updateThread(
        currentThreads,
        threadId,
        (thread: Thread, timestamp: string): Thread => ({
          ...thread,
          isPinned: true,
          updatedAt: timestamp,
        }),
      )
    })
  }, [])

  const unpinThread = useCallback((threadId: string): void => {
    setAllThreads((currentThreads: Thread[]): Thread[] => {
      const target = currentThreads.find((thread: Thread): boolean => thread.id === threadId)

      if (!target || !target.isPinned) {
        return currentThreads
      }

      return updateThread(
        currentThreads,
        threadId,
        (thread: Thread, timestamp: string): Thread => ({
          ...thread,
          isPinned: false,
          updatedAt: timestamp,
        }),
      )
    })
  }, [])

  const updateThreadTitle = useCallback((threadId: string, title: string): void => {
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      return
    }

    setAllThreads((currentThreads: Thread[]): Thread[] => {
      return updateThread(currentThreads, threadId, (thread: Thread, timestamp: string): Thread => {
        if (thread.title === trimmedTitle) {
          return thread
        }

        return {
          ...thread,
          title: trimmedTitle,
          updatedAt: timestamp,
        }
      })
    })
  }, [])

  const updateThreadStatus = useCallback((threadId: string, status: Thread['status']): void => {
    setAllThreads((currentThreads: Thread[]): Thread[] => {
      return updateThread(currentThreads, threadId, (thread: Thread, timestamp: string): Thread => {
        if (thread.status === status) {
          return thread
        }

        return {
          ...thread,
          status,
          isPinned: status === 'archived' ? false : thread.isPinned,
          updatedAt: timestamp,
        }
      })
    })
  }, [])

  const incrementMessageCount = useCallback((threadId: string): void => {
    setAllThreads((currentThreads: Thread[]): Thread[] => {
      return updateThread(
        currentThreads,
        threadId,
        (thread: Thread, timestamp: string): Thread => ({
          ...thread,
          messageCount: thread.messageCount + 1,
          lastActivityAt: timestamp,
          updatedAt: timestamp,
        }),
      )
    })
  }, [])

  const updateArtifactCount = useCallback((threadId: string, count: number): void => {
    setAllThreads((currentThreads: Thread[]): Thread[] => {
      return updateThread(currentThreads, threadId, (thread: Thread, timestamp: string): Thread => {
        if (thread.artifactCount === count) {
          return thread
        }

        return {
          ...thread,
          artifactCount: count,
          updatedAt: timestamp,
        }
      })
    })
  }, [])

  const touchThread = useCallback((threadId: string): void => {
    setAllThreads((currentThreads: Thread[]): Thread[] => {
      return updateThread(
        currentThreads,
        threadId,
        (thread: Thread, timestamp: string): Thread => ({
          ...thread,
          lastActivityAt: timestamp,
          updatedAt: timestamp,
        }),
      )
    })
  }, [])

  const threads = useMemo((): Thread[] => {
    return sortThreads(allThreads.filter((thread: Thread): boolean => thread.status !== 'archived'))
  }, [allThreads])

  const filteredThreads = useMemo((): Thread[] => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return threads
    }

    return threads.filter((thread: Thread): boolean => {
      return (thread.title || '').toLowerCase().includes(query)
    })
  }, [searchQuery, threads])

  return {
    threads,
    activeThreadId,

    createThread,
    switchThread,
    archiveThread,
    pinThread,
    unpinThread,

    searchQuery,
    setSearchQuery,
    filteredThreads,

    updateThreadTitle,
    updateThreadStatus,
    incrementMessageCount,
    updateArtifactCount,
    touchThread,
  }
}
