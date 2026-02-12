/**
 * Supported feedback categories.
 */
export type FeedbackCategory = 'bug' | 'idea' | 'ux'

/**
 * Feedback lifecycle states.
 */
export type FeedbackStatus = 'new' | 'triaged' | 'in-progress' | 'resolved' | 'wont-fix'

/**
 * Payload for submitting feedback.
 */
export interface FeedbackSubmission {
  idempotencyKey: string
  category: FeedbackCategory
  title: string
  summary: string
  threadContext?: Record<string, unknown>
}

/**
 * Stored feedback record.
 */
export interface FeedbackItem {
  id: string
  idempotency_key: string
  category: FeedbackCategory
  title: string
  summary: string
  status: FeedbackStatus
  created_at: string
  updated_at: string
}

/**
 * Feedback creation response payload.
 */
export interface FeedbackCreateResponse {
  id: string
  status: string
}

/**
 * Paginated feedback list response payload.
 */
export interface FeedbackListResponse {
  items: FeedbackItem[]
  nextCursor: string | null
}
