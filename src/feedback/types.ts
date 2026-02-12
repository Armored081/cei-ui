/**
 * Supported feedback categories.
 */
export type FeedbackCategory = 'bug' | 'idea' | 'ux'

/**
 * Feedback lifecycle states.
 */
export type FeedbackStatus = 'new' | 'triaged' | 'in-progress' | 'resolved' | 'wont-fix'

/**
 * Agent-assigned severity for feedback triage.
 */
export type FeedbackSeverity = 'critical' | 'high' | 'medium' | 'low'

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
 * Detailed feedback record used by the admin dashboard.
 */
export interface FeedbackDetailItem extends FeedbackItem {
  severity: FeedbackSeverity | null
  summary: string
  expected_behavior: string | null
  actual_behavior: string | null
  reproduction_steps: string[]
  thread_id: string | null
  thread_title: string | null
  related_component: string | null
  interview_transcript: Array<{ role: string; content: string }> | null
  agent_classification: Record<string, unknown> | null
  user_email: string
  roadmap_item_id: string | null
}

/**
 * Feedback creation response payload.
 */
export interface FeedbackCreateResponse {
  id: string
  status: string
}

/**
 * Feedback status update response payload.
 */
export interface FeedbackUpdateResponse {
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
