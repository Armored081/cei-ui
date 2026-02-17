import { useEffect, useRef, useState, type FormEvent } from 'react'

import { useAuth } from '../auth/AuthProvider'
import { submitFeedback } from './FeedbackApi'
import type { FeedbackCategory, FeedbackSubmission } from './types'
import './feedback-slideover.css'

const CLOSE_ANIMATION_MS = 200
const SUCCESS_AUTO_CLOSE_MS = 2000

const CATEGORY_OPTIONS: Array<{ emoji: string; label: string; value: FeedbackCategory }> = [
  { emoji: '🐛', label: 'Bug', value: 'bug' },
  { emoji: '💡', label: 'Idea', value: 'idea' },
  { emoji: '🎨', label: 'UX', value: 'ux' },
]

interface FeedbackSlideOverProps {
  isOpen: boolean
  onClose: () => void
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Unable to submit feedback. Please try again.'
}

function toThreadContext(includeThreadContext: boolean): Record<string, unknown> | undefined {
  if (!includeThreadContext) {
    return undefined
  }

  // Thread context capture not yet implemented
  // Omit the field entirely rather than sending a stub
  return undefined
}

/**
 * Feedback entry panel shown from the top bar.
 */
export function FeedbackSlideOver({ isOpen, onClose }: FeedbackSlideOverProps): JSX.Element | null {
  const { getAccessToken } = useAuth()
  const closeTimerRef = useRef<number | null>(null)
  const isMountedRef = useRef<boolean>(true)

  const [isRendered, setIsRendered] = useState<boolean>(isOpen)
  const [isClosing, setIsClosing] = useState<boolean>(false)

  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [title, setTitle] = useState<string>('')
  const [summary, setSummary] = useState<string>('')
  const [includeThreadContext, setIncludeThreadContext] = useState<boolean>(true)

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [successFeedbackId, setSuccessFeedbackId] = useState<string>('')
  const [submissionError, setSubmissionError] = useState<string>('')
  const [failedSubmission, setFailedSubmission] = useState<FeedbackSubmission | null>(null)

  const isFormValid = Boolean(category && title.trim() && summary.trim())
  const isSuccess = Boolean(successFeedbackId)

  useEffect((): (() => void) => {
    isMountedRef.current = true
    return (): void => {
      isMountedRef.current = false
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  useEffect((): void => {
    if (isOpen) {
      setCategory(null)
      setTitle('')
      setSummary('')
      setIncludeThreadContext(true)
      setIsSubmitting(false)
      setSuccessFeedbackId('')
      setSubmissionError('')
      setFailedSubmission(null)
    }
  }, [isOpen])

  useEffect((): (() => void) | void => {
    if (isOpen) {
      setIsRendered(true)
      setIsClosing(false)
      return
    }

    if (!isRendered) {
      return
    }

    setIsClosing(true)
    const timerId = window.setTimeout((): void => {
      setIsRendered(false)
      setIsClosing(false)
    }, CLOSE_ANIMATION_MS)

    return (): void => {
      window.clearTimeout(timerId)
    }
  }, [isOpen, isRendered])

  useEffect((): (() => void) | void => {
    if (!isRendered) {
      return
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return (): void => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isRendered, onClose])

  const onSubmitFeedback = async (submission: FeedbackSubmission): Promise<void> => {
    setIsSubmitting(true)
    setSubmissionError('')

    try {
      const accessToken = await getAccessToken()
      const response = await submitFeedback(accessToken, submission)

      setSuccessFeedbackId(response.id)
      setFailedSubmission(null)

      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }

      closeTimerRef.current = window.setTimeout((): void => {
        if (isMountedRef.current) {
          onClose()
        }
      }, SUCCESS_AUTO_CLOSE_MS)
    } catch (error: unknown) {
      setSubmissionError(toErrorMessage(error))
      setFailedSubmission(submission)
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmitForm = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    if (!category || !isFormValid || isSubmitting || isSuccess) {
      return
    }

    const submission: FeedbackSubmission = {
      idempotencyKey: crypto.randomUUID(),
      category,
      title: title.trim(),
      summary: summary.trim(),
      threadContext: toThreadContext(includeThreadContext),
    }

    void onSubmitFeedback(submission)
  }

  const onRetrySubmission = (): void => {
    if (!failedSubmission || isSubmitting || isSuccess) {
      return
    }

    void onSubmitFeedback(failedSubmission)
  }

  if (!isRendered) {
    return null
  }

  const panelState = isClosing ? 'closing' : 'open'

  return (
    <div
      className="cei-feedback-slideover"
      data-state={panelState}
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="cei-feedback-slideover-panel"
        data-state={panelState}
        onClick={(event): void => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-slideover-title"
      >
        <header className="cei-feedback-slideover-header">
          <h2 className="cei-feedback-slideover-title" id="feedback-slideover-title">
            📝 Share Feedback
          </h2>
          <button
            className="cei-feedback-slideover-close"
            onClick={onClose}
            type="button"
            aria-label="Close feedback panel"
          >
            &times;
          </button>
        </header>

        <form className="cei-feedback-slideover-form" onSubmit={onSubmitForm}>
          <section className="cei-feedback-slideover-section">
            <label className="cei-feedback-slideover-label">Category</label>
            <div
              className="cei-feedback-slideover-category-grid"
              role="group"
              aria-label="Category"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`cei-feedback-slideover-category ${category === option.value ? 'cei-feedback-slideover-category-selected' : ''}`}
                  onClick={(): void => {
                    setCategory(option.value)
                    setSubmissionError('')
                    setFailedSubmission(null)
                  }}
                  type="button"
                  aria-pressed={category === option.value}
                >
                  <span aria-hidden="true">{option.emoji}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="cei-feedback-slideover-section">
            <label className="cei-feedback-slideover-label" htmlFor="feedback-title">
              Title
            </label>
            <input
              className="cei-feedback-slideover-input"
              id="feedback-title"
              onChange={(event): void => {
                setTitle(event.target.value)
                setSubmissionError('')
                setFailedSubmission(null)
              }}
              placeholder="Brief summary..."
              type="text"
              value={title}
              disabled={isSubmitting || isSuccess}
            />
          </section>

          <section className="cei-feedback-slideover-section">
            <label className="cei-feedback-slideover-label" htmlFor="feedback-summary">
              Summary
            </label>
            <textarea
              className="cei-feedback-slideover-textarea"
              id="feedback-summary"
              onChange={(event): void => {
                setSummary(event.target.value)
                setSubmissionError('')
                setFailedSubmission(null)
              }}
              placeholder="Tell us what happened..."
              rows={7}
              value={summary}
              disabled={isSubmitting || isSuccess}
            />
          </section>

          <label className="cei-feedback-slideover-checkbox-row" htmlFor="feedback-context-toggle">
            <input
              checked={includeThreadContext}
              className="cei-feedback-slideover-checkbox"
              id="feedback-context-toggle"
              onChange={(event): void => {
                setIncludeThreadContext(event.target.checked)
                setSubmissionError('')
                setFailedSubmission(null)
              }}
              type="checkbox"
              disabled={isSubmitting || isSuccess}
            />
            <span>Include current thread context (last 20 messages)</span>
          </label>

          {submissionError ? (
            <div className="cei-feedback-slideover-error" role="alert">
              <span>{submissionError}</span>
              <button
                className="cei-feedback-slideover-retry"
                onClick={onRetrySubmission}
                type="button"
                disabled={!failedSubmission || isSubmitting || isSuccess}
              >
                Retry
              </button>
            </div>
          ) : null}

          {successFeedbackId ? (
            <div className="cei-feedback-slideover-success" role="status">
              <p>✓ Feedback submitted</p>
              <p>
                Feedback ID: <code>{successFeedbackId}</code>
              </p>
            </div>
          ) : null}

          <button
            className="cei-feedback-slideover-submit"
            disabled={!isFormValid || isSubmitting || isSuccess}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <span className="cei-feedback-slideover-spinner" aria-hidden="true" />
                <span>Submitting...</span>
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>
        </form>
      </aside>
    </div>
  )
}
