import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { formatRelativeTime } from '../utils/relativeTime'
import { listAllFeedback, updateFeedbackStatus, type FeedbackListParams } from './FeedbackApi'
import { FeedbackDetail } from './FeedbackDetail'
import type {
  FeedbackCategory,
  FeedbackDetailItem,
  FeedbackItem,
  FeedbackSeverity,
  FeedbackStatus,
} from './types'
import './feedback-dashboard.css'

const PAGE_SIZE = 25

const CATEGORY_FILTER_OPTIONS: Array<{
  label: string
  emoji: string
  value: FeedbackCategory | 'all'
}> = [
  { label: 'All', emoji: '📦', value: 'all' },
  { label: 'Bug', emoji: '🐛', value: 'bug' },
  { label: 'Idea', emoji: '💡', value: 'idea' },
  { label: 'UX', emoji: '🎨', value: 'ux' },
]

const STATUS_FILTER_OPTIONS: Array<{ label: string; value: FeedbackStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Triaged', value: 'triaged' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: "Won't Fix", value: 'wont-fix' },
]

const STATUS_ORDER: FeedbackStatus[] = ['new', 'triaged', 'in-progress', 'resolved', 'wont-fix']

type LoadState = 'loading' | 'loaded' | 'error'
type CategoryFilter = FeedbackCategory | 'all'
type StatusFilter = FeedbackStatus | 'all'

function formatStatusLabel(status: FeedbackStatus): string {
  if (status === 'new') {
    return 'New'
  }

  if (status === 'triaged') {
    return 'Triaged'
  }

  if (status === 'in-progress') {
    return 'In Progress'
  }

  if (status === 'resolved') {
    return 'Resolved'
  }

  return "Won't Fix"
}

function categoryEmoji(category: FeedbackCategory): string {
  if (category === 'bug') {
    return '🐛'
  }

  if (category === 'idea') {
    return '💡'
  }

  return '🎨'
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

function isRetryableError(message: string): boolean {
  const nonRetryableTokens = ['Missing VITE_', 'Authentication required', '401', '403', 'Forbidden']
  return !nonRetryableTokens.some((token) => message.includes(token))
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  return trimmedValue ? trimmedValue : null
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function toTranscript(value: unknown): Array<{ role: string; content: string }> | null {
  if (!Array.isArray(value)) {
    return null
  }

  const transcript = value
    .map((entry: unknown): { role: string; content: string } | null => {
      if (typeof entry !== 'object' || entry === null) {
        return null
      }

      const role = (entry as { role?: unknown }).role
      const content = (entry as { content?: unknown }).content

      if (typeof role !== 'string' || typeof content !== 'string') {
        return null
      }

      return { role, content }
    })
    .filter((entry): entry is { role: string; content: string } => Boolean(entry))

  return transcript.length > 0 ? transcript : null
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function toSeverity(value: unknown): FeedbackSeverity | null {
  if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low') {
    return value
  }

  return null
}

function normalizeFeedbackItem(item: FeedbackItem): FeedbackDetailItem {
  const candidate = item as FeedbackItem & Partial<FeedbackDetailItem>

  return {
    ...item,
    severity: toSeverity(candidate.severity),
    summary: typeof candidate.summary === 'string' ? candidate.summary : item.summary,
    expected_behavior: toNullableString(candidate.expected_behavior),
    actual_behavior: toNullableString(candidate.actual_behavior),
    reproduction_steps: toStringArray(candidate.reproduction_steps),
    thread_id: toNullableString(candidate.thread_id),
    thread_title: toNullableString(candidate.thread_title),
    related_component: toNullableString(candidate.related_component),
    interview_transcript: toTranscript(candidate.interview_transcript),
    agent_classification: toRecord(candidate.agent_classification),
    user_email: toNullableString(candidate.user_email) || 'unknown@user.local',
    roadmap_item_id: toNullableString(candidate.roadmap_item_id),
  }
}

function truncateSummary(summary: string, maxLength: number): string {
  if (summary.length <= maxLength) {
    return summary
  }

  return `${summary.slice(0, maxLength - 1).trimEnd()}…`
}

function createFilterParams(category: CategoryFilter, status: StatusFilter): FeedbackListParams {
  const params: FeedbackListParams = { limit: PAGE_SIZE }

  if (category !== 'all') {
    params.category = category
  }

  if (status !== 'all') {
    params.status = status
  }

  return params
}

/**
 * Admin dashboard page for viewing and triaging all feedback records.
 */
export function FeedbackDashboard(): JSX.Element {
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [feedbackItems, setFeedbackItems] = useState<FeedbackDetailItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [retryable, setRetryable] = useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null)
  const [isStatusUpdating, setIsStatusUpdating] = useState<boolean>(false)
  const [statusUpdateError, setStatusUpdateError] = useState<string>('')
  const requestIdRef = useRef<number>(0)

  const filterParams = useMemo(
    (): FeedbackListParams => createFilterParams(categoryFilter, statusFilter),
    [categoryFilter, statusFilter],
  )

  const loadFeedback = useCallback(async (): Promise<void> => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setLoadState('loading')
    setError(null)
    setLoadMoreError(null)

    try {
      const accessToken = await getAccessToken()
      const response = await listAllFeedback(accessToken, filterParams)

      if (requestIdRef.current !== requestId) {
        return
      }

      setFeedbackItems(response.items.map(normalizeFeedbackItem))
      setNextCursor(response.nextCursor)
      setRetryable(true)
      setLoadState('loaded')
    } catch (loadError: unknown) {
      if (requestIdRef.current !== requestId) {
        return
      }

      const message = readErrorMessage(loadError, 'Failed to load feedback')
      setError(message)
      setRetryable(isRetryableError(message))
      setLoadState('error')
    }
  }, [filterParams, getAccessToken])

  useEffect((): void => {
    void loadFeedback()
  }, [loadFeedback])

  useEffect((): void => {
    if (!selectedFeedbackId) {
      return
    }

    const itemExists = feedbackItems.some((item) => item.id === selectedFeedbackId)
    if (!itemExists) {
      setSelectedFeedbackId(null)
      setStatusUpdateError('')
    }
  }, [feedbackItems, selectedFeedbackId])

  const statusCounts = useMemo((): Record<FeedbackStatus, number> => {
    const counts: Record<FeedbackStatus, number> = {
      new: 0,
      triaged: 0,
      'in-progress': 0,
      resolved: 0,
      'wont-fix': 0,
    }

    for (const item of feedbackItems) {
      counts[item.status] += 1
    }

    return counts
  }, [feedbackItems])

  const selectedFeedback = useMemo(
    (): FeedbackDetailItem | null =>
      feedbackItems.find((item) => item.id === selectedFeedbackId) || null,
    [feedbackItems, selectedFeedbackId],
  )

  const onLoadMore = useCallback(async (): Promise<void> => {
    if (!nextCursor || isLoadingMore) {
      return
    }

    setIsLoadingMore(true)
    setLoadMoreError(null)

    try {
      const accessToken = await getAccessToken()
      const response = await listAllFeedback(accessToken, { ...filterParams, cursor: nextCursor })

      setFeedbackItems((currentItems): FeedbackDetailItem[] => [
        ...currentItems,
        ...response.items.map(normalizeFeedbackItem),
      ])
      setNextCursor(response.nextCursor)
    } catch (loadMoreFailure: unknown) {
      setLoadMoreError(readErrorMessage(loadMoreFailure, 'Failed to load more feedback'))
    } finally {
      setIsLoadingMore(false)
    }
  }, [filterParams, getAccessToken, isLoadingMore, nextCursor])

  const onChangeFeedbackStatus = useCallback(
    async (feedbackId: string, nextStatus: FeedbackStatus): Promise<void> => {
      setIsStatusUpdating(true)
      setStatusUpdateError('')

      try {
        const accessToken = await getAccessToken()
        await updateFeedbackStatus(accessToken, feedbackId, nextStatus)

        setFeedbackItems((currentItems): FeedbackDetailItem[] =>
          currentItems.map((item) =>
            item.id === feedbackId ? { ...item, status: nextStatus } : item,
          ),
        )
      } catch (updateError: unknown) {
        setStatusUpdateError(readErrorMessage(updateError, 'Failed to update feedback status'))
      } finally {
        setIsStatusUpdating(false)
      }
    },
    [getAccessToken],
  )

  return (
    <div className="cei-feedback-dashboard-page">
      <header className="cei-feedback-dashboard-header">
        <button
          className="cei-feedback-dashboard-back-button"
          onClick={(): void => navigate('/')}
          type="button"
        >
          ← Back to Command Center
        </button>
      </header>

      <main className="cei-feedback-dashboard-content">
        <h1 className="cei-feedback-dashboard-title">Feedback Dashboard</h1>
        <p className="cei-feedback-dashboard-subtitle">
          Review submitted feedback, apply filters, and update triage status.
        </p>

        <section className="cei-feedback-dashboard-filters" aria-label="Feedback filters">
          <div className="cei-feedback-dashboard-filter-group">
            <h2 className="cei-feedback-dashboard-filter-title">Category</h2>
            <div className="cei-feedback-dashboard-filter-row" role="group" aria-label="Category">
              {CATEGORY_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`cei-feedback-dashboard-filter-button ${
                    categoryFilter === option.value
                      ? 'cei-feedback-dashboard-filter-button-active'
                      : ''
                  }`}
                  onClick={(): void => setCategoryFilter(option.value)}
                  type="button"
                  aria-pressed={categoryFilter === option.value}
                >
                  <span aria-hidden="true">{option.emoji}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="cei-feedback-dashboard-filter-group">
            <h2 className="cei-feedback-dashboard-filter-title">Status</h2>
            <div className="cei-feedback-dashboard-filter-row" role="group" aria-label="Status">
              {STATUS_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`cei-feedback-dashboard-filter-button ${
                    statusFilter === option.value
                      ? 'cei-feedback-dashboard-filter-button-active'
                      : ''
                  }`}
                  onClick={(): void => setStatusFilter(option.value)}
                  type="button"
                  aria-pressed={statusFilter === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="cei-feedback-dashboard-stats" aria-label="Feedback status counts">
          {STATUS_ORDER.map((status) => (
            <span key={status} className="cei-feedback-dashboard-stat-pill">
              {statusCounts[status].toString()} {formatStatusLabel(status)}
            </span>
          ))}
        </section>

        {loadState === 'loading' ? (
          <div className="cei-feedback-dashboard-loading" role="status" aria-live="polite">
            <span className="cei-feedback-dashboard-spinner" aria-hidden="true" />
            <p>Loading feedback...</p>
          </div>
        ) : null}

        {loadState === 'error' ? (
          <div className="cei-feedback-dashboard-error" role="alert">
            <p>{error || 'Failed to load feedback'}</p>
            {retryable ? (
              <button
                className="cei-feedback-dashboard-retry-button"
                onClick={(): void => void loadFeedback()}
                type="button"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}

        {loadState === 'loaded' ? (
          <>
            {feedbackItems.length === 0 ? (
              <div className="cei-feedback-dashboard-empty" role="status">
                No feedback matching filters
              </div>
            ) : (
              <div className="cei-feedback-dashboard-list" role="list">
                {feedbackItems.map((item) => (
                  <button
                    key={item.id}
                    className="cei-feedback-dashboard-card"
                    type="button"
                    onClick={(): void => {
                      setSelectedFeedbackId(item.id)
                      setStatusUpdateError('')
                    }}
                    role="listitem"
                  >
                    <div className="cei-feedback-dashboard-card-header">
                      <div className="cei-feedback-dashboard-card-title-row">
                        <span className="cei-feedback-dashboard-card-category" aria-hidden="true">
                          {categoryEmoji(item.category)}
                        </span>
                        <h3 className="cei-feedback-dashboard-card-title">{item.title}</h3>
                      </div>
                      <div className="cei-feedback-dashboard-card-badges">
                        <span
                          className="cei-feedback-dashboard-status-badge"
                          data-status={item.status}
                        >
                          {formatStatusLabel(item.status)}
                        </span>
                        {item.severity ? (
                          <span
                            className="cei-feedback-dashboard-severity-badge"
                            data-severity={item.severity}
                          >
                            {item.severity}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="cei-feedback-dashboard-card-meta">
                      <span className="cei-feedback-dashboard-card-email" title={item.user_email}>
                        {item.user_email}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeTime(item.created_at)}</span>
                    </div>

                    <p className="cei-feedback-dashboard-card-summary">
                      {truncateSummary(item.summary, 120)}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {nextCursor ? (
              <div className="cei-feedback-dashboard-load-more">
                {loadMoreError ? (
                  <p className="cei-feedback-dashboard-load-more-error" role="alert">
                    {loadMoreError}
                  </p>
                ) : null}
                <button
                  className="cei-feedback-dashboard-load-more-button"
                  onClick={(): void => void onLoadMore()}
                  type="button"
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </main>

      <FeedbackDetail
        feedback={selectedFeedback}
        isOpen={Boolean(selectedFeedback)}
        isStatusUpdating={isStatusUpdating}
        statusError={statusUpdateError}
        onClose={(): void => {
          setSelectedFeedbackId(null)
          setStatusUpdateError('')
        }}
        onStatusChange={onChangeFeedbackStatus}
      />
    </div>
  )
}
