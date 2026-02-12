import { type ChangeEvent } from 'react'

import { SlideOver } from '../primitives/SlideOver'
import type { FeedbackDetailItem, FeedbackStatus } from './types'

const STATUS_OPTIONS: Array<{ label: string; value: FeedbackStatus }> = [
  { label: 'New', value: 'new' },
  { label: 'Triaged', value: 'triaged' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: "Won't Fix", value: 'wont-fix' },
]

function formatCategoryLabel(category: string): string {
  if (category === 'bug') {
    return 'Bug'
  }

  if (category === 'idea') {
    return 'Idea'
  }

  if (category === 'ux') {
    return 'UX'
  }

  return category
}

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

function formatSeverityLabel(severity: FeedbackDetailItem['severity']): string {
  if (!severity) {
    return 'Unspecified'
  }

  return severity.charAt(0).toUpperCase() + severity.slice(1)
}

function formatClassificationValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value.toString()
  }

  if (value === null) {
    return 'null'
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function toTranscriptRoleLabel(role: string): string {
  const normalizedRole = role.trim().toLowerCase()

  if (!normalizedRole) {
    return 'Unknown'
  }

  return normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)
}

function isUserRole(role: string): boolean {
  return role.trim().toLowerCase() === 'user'
}

interface FeedbackDetailProps {
  feedback: FeedbackDetailItem | null
  isOpen: boolean
  isStatusUpdating: boolean
  statusError: string
  onClose: () => void
  onStatusChange: (feedbackId: string, status: FeedbackStatus) => Promise<void>
}

/**
 * Slide-over detail panel for reviewing and triaging a feedback item.
 */
export function FeedbackDetail({
  feedback,
  isOpen,
  isStatusUpdating,
  statusError,
  onClose,
  onStatusChange,
}: FeedbackDetailProps): JSX.Element | null {
  if (!feedback) {
    return null
  }

  const classificationEntries = feedback.agent_classification
    ? Object.entries(feedback.agent_classification)
    : []

  const onStatusSelect = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextStatus = event.target.value as FeedbackStatus

    if (nextStatus === feedback.status) {
      return
    }

    void onStatusChange(feedback.id, nextStatus)
  }

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title="Feedback Detail" width="560px">
      <div className="cei-feedback-detail">
        <div className="cei-feedback-detail-heading">
          <h3 className="cei-feedback-detail-title">{feedback.title}</h3>
          <div className="cei-feedback-detail-badges">
            <span className="cei-feedback-detail-pill">
              {formatCategoryLabel(feedback.category)}
            </span>
            <span className="cei-feedback-detail-pill">{formatStatusLabel(feedback.status)}</span>
            <span className="cei-feedback-detail-pill">
              Severity: {formatSeverityLabel(feedback.severity)}
            </span>
          </div>
        </div>

        <section className="cei-feedback-detail-section">
          <h4 className="cei-feedback-detail-section-title">Status</h4>
          <div className="cei-feedback-detail-status-row">
            <label className="cei-feedback-detail-label" htmlFor="feedback-status-select">
              Update status
            </label>
            <select
              className="cei-feedback-detail-select"
              id="feedback-status-select"
              value={feedback.status}
              onChange={onStatusSelect}
              disabled={isStatusUpdating}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {statusError ? (
            <p className="cei-feedback-detail-error" role="alert">
              {statusError}
            </p>
          ) : null}
        </section>

        <section className="cei-feedback-detail-section">
          <h4 className="cei-feedback-detail-section-title">Summary</h4>
          <p className="cei-feedback-detail-text">{feedback.summary}</p>
        </section>

        {feedback.reproduction_steps.length > 0 ? (
          <section className="cei-feedback-detail-section">
            <h4 className="cei-feedback-detail-section-title">Reproduction Steps</h4>
            <ol className="cei-feedback-detail-list">
              {feedback.reproduction_steps.map((step, index) => (
                <li key={`${feedback.id}-step-${index.toString()}`}>{step}</li>
              ))}
            </ol>
          </section>
        ) : null}

        {feedback.expected_behavior ? (
          <section className="cei-feedback-detail-section">
            <h4 className="cei-feedback-detail-section-title">Expected Behavior</h4>
            <p className="cei-feedback-detail-text">{feedback.expected_behavior}</p>
          </section>
        ) : null}

        {feedback.actual_behavior ? (
          <section className="cei-feedback-detail-section">
            <h4 className="cei-feedback-detail-section-title">Actual Behavior</h4>
            <p className="cei-feedback-detail-text">{feedback.actual_behavior}</p>
          </section>
        ) : null}

        {feedback.interview_transcript && feedback.interview_transcript.length > 0 ? (
          <section className="cei-feedback-detail-section">
            <h4 className="cei-feedback-detail-section-title">Interview Transcript</h4>
            <div className="cei-feedback-detail-transcript">
              {feedback.interview_transcript.map((entry, index) => (
                <article
                  key={`${feedback.id}-transcript-${index.toString()}`}
                  className={`cei-feedback-detail-chat-bubble ${
                    isUserRole(entry.role)
                      ? 'cei-feedback-detail-chat-bubble-user'
                      : 'cei-feedback-detail-chat-bubble-agent'
                  }`}
                >
                  <header className="cei-feedback-detail-chat-role">
                    {toTranscriptRoleLabel(entry.role)}
                  </header>
                  <p className="cei-feedback-detail-chat-content">{entry.content}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {classificationEntries.length > 0 ? (
          <section className="cei-feedback-detail-section">
            <h4 className="cei-feedback-detail-section-title">Agent Classification</h4>
            <dl className="cei-feedback-detail-classification">
              {classificationEntries.map(([key, value]) => (
                <div key={key} className="cei-feedback-detail-classification-row">
                  <dt>{key}</dt>
                  <dd>{formatClassificationValue(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section className="cei-feedback-detail-section">
          <h4 className="cei-feedback-detail-section-title">Context</h4>
          <dl className="cei-feedback-detail-context">
            <div className="cei-feedback-detail-context-row">
              <dt>User Email</dt>
              <dd>{feedback.user_email}</dd>
            </div>
            <div className="cei-feedback-detail-context-row">
              <dt>Thread ID</dt>
              <dd>{feedback.thread_id || 'Not available'}</dd>
            </div>
            <div className="cei-feedback-detail-context-row">
              <dt>Thread Title</dt>
              <dd>{feedback.thread_title || 'Not available'}</dd>
            </div>
            <div className="cei-feedback-detail-context-row">
              <dt>Related Component</dt>
              <dd>{feedback.related_component || 'Not specified'}</dd>
            </div>
          </dl>
        </section>
      </div>
    </SlideOver>
  )
}
