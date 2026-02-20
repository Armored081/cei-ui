import { useId } from 'react'

import type { Thread } from '../types/chat'
import { ThreadCard } from './ThreadCard'
import './thread-list.css'

interface ThreadListProps {
  threads: Thread[]
  activeThreadId: string | null
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  onCreateThread: () => void
  onSelectThread: (threadId: string) => void
  onArchiveThread: (threadId: string) => void
  onPinThread: (threadId: string) => void
  onUnpinThread: (threadId: string) => void
}

export function ThreadList({
  threads,
  activeThreadId,
  searchQuery,
  onSearchQueryChange,
  onCreateThread,
  onSelectThread,
  onArchiveThread,
  onPinThread,
  onUnpinThread,
}: ThreadListProps): JSX.Element {
  const searchInputId = useId()

  return (
    <section className="cei-thread-list" aria-label="Thread navigator">
      <button
        className="cei-thread-list-new-btn"
        onClick={onCreateThread}
        type="button"
        aria-label="Create New Thread"
      >
        + New Thread
      </button>

      <label className="cei-thread-list-search-label" htmlFor={searchInputId}>
        Search threads
      </label>
      <input
        className="cei-thread-list-search"
        id={searchInputId}
        onChange={(event): void => onSearchQueryChange(event.target.value)}
        placeholder="Search threads"
        type="search"
        value={searchQuery}
      />

      <div className="cei-thread-list-cards" role="list" aria-label="Thread list">
        {threads.length === 0 ? (
          <p className="cei-muted cei-thread-list-empty">No threads found.</p>
        ) : (
          threads.map((thread: Thread): JSX.Element => {
            return (
              <ThreadCard
                key={thread.id}
                thread={thread}
                isActive={thread.id === activeThreadId}
                onSelect={onSelectThread}
                onArchive={onArchiveThread}
                onPin={onPinThread}
                onUnpin={onUnpinThread}
              />
            )
          })
        )}
      </div>
    </section>
  )
}
