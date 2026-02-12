import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '../../auth/AuthProvider'
import { submitFeedback } from '../FeedbackApi'
import { FeedbackSlideOver } from '../FeedbackSlideOver'
import type { FeedbackSubmission } from '../types'

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../FeedbackApi', () => ({
  submitFeedback: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedSubmitFeedback = vi.mocked(submitFeedback)

function fillRequiredFields(): void {
  fireEvent.click(screen.getByRole('button', { name: /Bug/i }))
  fireEvent.change(screen.getByPlaceholderText('Brief summary...'), {
    target: { value: 'Risk matrix shows duplicates' },
  })
  fireEvent.change(screen.getByPlaceholderText('Tell us what happened...'), {
    target: { value: 'Loading a second scenario duplicates rows in the output table.' },
  })
}

describe('FeedbackSlideOver', (): void => {
  beforeEach((): void => {
    mockedUseAuth.mockReset()
    mockedSubmitFeedback.mockReset()

    const getAccessTokenMock = vi.fn(async (): Promise<string> => 'access-token')

    mockedUseAuth.mockReturnValue({
      getAccessToken: getAccessTokenMock,
    } as unknown as ReturnType<typeof useAuth>)

    mockedSubmitFeedback.mockResolvedValue({
      id: 'feedback-001',
      status: 'new',
    })
  })

  afterEach((): void => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders category buttons and required form fields', (): void => {
    render(<FeedbackSlideOver isOpen onClose={vi.fn()} />)

    expect(screen.getByText('📝 Share Feedback')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bug/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Idea/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^UX$/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Brief summary...')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Tell us what happened...')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Include current thread context/i })).toBeChecked()
  })

  it('highlights selected category button', (): void => {
    render(<FeedbackSlideOver isOpen onClose={vi.fn()} />)

    const bugButton = screen.getByRole('button', { name: /Bug/i })
    fireEvent.click(bugButton)

    expect(bugButton).toHaveClass('cei-feedback-slideover-category-selected')
  })

  it('disables submit until category, title, and summary are filled', (): void => {
    render(<FeedbackSlideOver isOpen onClose={vi.fn()} />)

    const submitButton = screen.getByRole('button', { name: 'Submit Feedback' })
    expect(submitButton).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Idea/i }))
    expect(submitButton).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('Brief summary...'), {
      target: { value: 'Short title' },
    })
    expect(submitButton).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('Tell us what happened...'), {
      target: { value: 'Detailed summary content' },
    })
    expect(submitButton).toBeEnabled()
  })

  it('submits with correct payload including thread context stub', async (): Promise<void> => {
    const randomUuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('idempotency-1')

    render(<FeedbackSlideOver isOpen onClose={vi.fn()} />)

    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }))

    await waitFor((): void => {
      expect(mockedSubmitFeedback).toHaveBeenCalledTimes(1)
    })

    expect(mockedSubmitFeedback).toHaveBeenCalledWith('access-token', {
      idempotencyKey: 'idempotency-1',
      category: 'bug',
      title: 'Risk matrix shows duplicates',
      summary: 'Loading a second scenario duplicates rows in the output table.',
      threadContext: undefined,
    })

    randomUuidSpy.mockRestore()
  })

  it('omits thread context when checkbox is unchecked', async (): Promise<void> => {
    const randomUuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('idempotency-2')

    render(<FeedbackSlideOver isOpen onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('checkbox', { name: /Include current thread context/i }))
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }))

    await waitFor((): void => {
      expect(mockedSubmitFeedback).toHaveBeenCalledTimes(1)
    })

    expect(mockedSubmitFeedback.mock.calls[0][1]).toMatchObject({
      idempotencyKey: 'idempotency-2',
      threadContext: undefined,
    })

    randomUuidSpy.mockRestore()
  })

  it('shows success state and auto-closes after 2 seconds', async (): Promise<void> => {
    vi.useFakeTimers()
    const onClose = vi.fn()

    render(<FeedbackSlideOver isOpen onClose={onClose} />)

    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }))

    await act(async (): Promise<void> => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText('✓ Feedback submitted')).toBeInTheDocument()
    expect(screen.getByText(/Feedback ID:/)).toHaveTextContent('feedback-001')

    act((): void => {
      vi.advanceTimersByTime(1999)
    })
    expect(onClose).not.toHaveBeenCalled()

    act((): void => {
      vi.advanceTimersByTime(1)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows error state when submission fails', async (): Promise<void> => {
    mockedSubmitFeedback.mockRejectedValueOnce(new Error('Rate limit exceeded (429)'))

    render(<FeedbackSlideOver isOpen onClose={vi.fn()} />)

    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }))

    await waitFor((): void => {
      expect(screen.getByRole('alert')).toHaveTextContent('Rate limit exceeded (429)')
    })

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('retries failed submission with the same idempotency payload', async (): Promise<void> => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('retry-idempotency')
    mockedSubmitFeedback
      .mockRejectedValueOnce(new Error('Temporary network failure'))
      .mockResolvedValueOnce({ id: 'feedback-002', status: 'new' })

    render(<FeedbackSlideOver isOpen onClose={vi.fn()} />)

    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }))

    await waitFor((): void => {
      expect(mockedSubmitFeedback).toHaveBeenCalledTimes(1)
    })

    const firstSubmission = mockedSubmitFeedback.mock.calls[0][1] as FeedbackSubmission

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor((): void => {
      expect(mockedSubmitFeedback).toHaveBeenCalledTimes(2)
    })

    const secondSubmission = mockedSubmitFeedback.mock.calls[1][1] as FeedbackSubmission

    expect(secondSubmission.idempotencyKey).toBe(firstSubmission.idempotencyKey)
    expect(secondSubmission).toEqual(firstSubmission)
  })

  it('calls onClose when close button is clicked', (): void => {
    const onClose = vi.fn()

    render(<FeedbackSlideOver isOpen onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close feedback panel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', (): void => {
    const onClose = vi.fn()

    render(<FeedbackSlideOver isOpen onClose={onClose} />)

    fireEvent.click(screen.getByRole('presentation'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
