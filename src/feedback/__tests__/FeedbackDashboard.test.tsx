import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '../../auth/AuthProvider'
import { FeedbackDashboard } from '../FeedbackDashboard'
import { listAllFeedback, updateFeedbackStatus } from '../FeedbackApi'
import type { FeedbackDetailItem, FeedbackListResponse } from '../types'

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../FeedbackApi', () => ({
  listAllFeedback: vi.fn(),
  updateFeedbackStatus: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListAllFeedback = vi.mocked(listAllFeedback)
const mockedUpdateFeedbackStatus = vi.mocked(updateFeedbackStatus)

function createFeedbackItem(overrides: Partial<FeedbackDetailItem> = {}): FeedbackDetailItem {
  return {
    id: 'feedback-1',
    idempotency_key: 'idem-1',
    category: 'bug',
    title: 'Revenue chart duplicates rows',
    summary: 'Switching scenarios duplicates several table rows in the revenue analysis output.',
    status: 'new',
    created_at: '2026-02-12T14:00:00.000Z',
    updated_at: '2026-02-12T14:00:00.000Z',
    severity: 'high',
    expected_behavior: 'Rows should stay unique per scenario.',
    actual_behavior: 'Rows are duplicated after toggling scenario filters.',
    reproduction_steps: ['Open dashboard', 'Toggle scenario filters', 'Observe duplicate rows'],
    thread_id: 'thread-42',
    thread_title: 'Revenue drift diagnosis',
    related_component: 'Risk Matrix',
    interview_transcript: [
      { role: 'user', content: 'This duplicated rows after a filter change.' },
      { role: 'agent', content: 'Thanks, I captured that behavior.' },
    ],
    agent_classification: { confidence: 0.88, area: 'data-rendering' },
    user_email: 'analyst@example.com',
    roadmap_item_id: null,
    ...overrides,
  }
}

function renderDashboard(): void {
  render(
    <MemoryRouter>
      <FeedbackDashboard />
    </MemoryRouter>,
  )
}

function feedbackCardButtonFromTitle(title: string): HTMLButtonElement {
  const titleElement = screen.getByText(title)
  const buttonElement = titleElement.closest('button')

  if (!(buttonElement instanceof HTMLButtonElement)) {
    throw new Error(`Unable to resolve feedback card button for title: ${title}`)
  }

  return buttonElement
}

function createDeferredResponse(): {
  promise: Promise<FeedbackListResponse>
  resolve: (value: FeedbackListResponse) => void
} {
  let resolveFn: (value: FeedbackListResponse) => void = (): void => {}
  const promise = new Promise<FeedbackListResponse>((resolve): void => {
    resolveFn = resolve
  })

  return { promise, resolve: resolveFn }
}

describe('FeedbackDashboard', (): void => {
  beforeEach((): void => {
    mockedUseAuth.mockReset()
    mockedListAllFeedback.mockReset()
    mockedUpdateFeedbackStatus.mockReset()

    const getAccessTokenMock = vi.fn(async (): Promise<string> => 'access-token')
    mockedUseAuth.mockReturnValue({
      getAccessToken: getAccessTokenMock,
    } as unknown as ReturnType<typeof useAuth>)

    mockedListAllFeedback.mockResolvedValue({
      items: [createFeedbackItem()],
      nextCursor: null,
    })
    mockedUpdateFeedbackStatus.mockResolvedValue({
      id: 'feedback-1',
      status: 'triaged',
    })
  })

  it('renders category and status filter buttons', async (): Promise<void> => {
    renderDashboard()

    await screen.findByText('Feedback Dashboard')

    expect(screen.getByRole('button', { name: 'Bug' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Idea' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'UX' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Triaged' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'In Progress' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Won't Fix" })).toBeInTheDocument()
  })

  it('shows loading state while initial fetch is pending', async (): Promise<void> => {
    const deferred = createDeferredResponse()
    mockedListAllFeedback.mockReturnValueOnce(deferred.promise)

    renderDashboard()

    expect(screen.getByText('Loading feedback...')).toBeInTheDocument()

    deferred.resolve({
      items: [createFeedbackItem()],
      nextCursor: null,
    })

    await waitFor((): void => {
      expect(screen.queryByText('Loading feedback...')).not.toBeInTheDocument()
    })
  })

  it('shows error state and retries loading feedback', async (): Promise<void> => {
    mockedListAllFeedback
      .mockRejectedValueOnce(new Error('Temporary gateway timeout'))
      .mockResolvedValueOnce({
        items: [createFeedbackItem()],
        nextCursor: null,
      })

    renderDashboard()

    await waitFor((): void => {
      expect(screen.getByRole('alert')).toHaveTextContent('Temporary gateway timeout')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor((): void => {
      expect(mockedListAllFeedback).toHaveBeenCalledTimes(2)
    })
  })

  it('shows empty state when no feedback matches filters', async (): Promise<void> => {
    mockedListAllFeedback.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
    })

    renderDashboard()

    await screen.findByText('No feedback matching filters')
  })

  it('renders feedback card category, title, and status', async (): Promise<void> => {
    renderDashboard()

    await screen.findByText('Revenue chart duplicates rows')
    const card = feedbackCardButtonFromTitle('Revenue chart duplicates rows')

    expect(within(card).getByText('🐛')).toBeInTheDocument()
    expect(within(card).getByText('Revenue chart duplicates rows')).toBeInTheDocument()
    expect(within(card).getByText('New')).toBeInTheDocument()
  })

  it('applies category filter and refetches feedback list', async (): Promise<void> => {
    const ideaFeedback = createFeedbackItem({
      id: 'feedback-idea',
      category: 'idea',
      title: 'Add scenario comparison snapshots',
      status: 'triaged',
    })
    const bugFeedback = createFeedbackItem({
      id: 'feedback-bug',
      category: 'bug',
      title: 'Risk matrix threshold save fails',
      status: 'new',
    })

    mockedListAllFeedback.mockImplementation(
      async (_accessToken: string, params = {}): Promise<FeedbackListResponse> => {
        if (params.category === 'bug') {
          return { items: [bugFeedback], nextCursor: null }
        }

        return { items: [ideaFeedback], nextCursor: null }
      },
    )

    renderDashboard()

    await screen.findByText('Add scenario comparison snapshots')

    fireEvent.click(screen.getByRole('button', { name: 'Bug' }))

    await screen.findByText('Risk matrix threshold save fails')
    expect(screen.queryByText('Add scenario comparison snapshots')).not.toBeInTheDocument()
    expect(mockedListAllFeedback).toHaveBeenLastCalledWith(
      'access-token',
      expect.objectContaining({ category: 'bug' }),
    )
  })

  it('opens detail view when a feedback card is clicked', async (): Promise<void> => {
    renderDashboard()

    await screen.findByText('Revenue chart duplicates rows')
    fireEvent.click(feedbackCardButtonFromTitle('Revenue chart duplicates rows'))

    expect(screen.getByRole('heading', { name: 'Feedback Detail' })).toBeInTheDocument()
    expect(screen.getByText('Expected Behavior')).toBeInTheDocument()
    expect(screen.getByText('Rows should stay unique per scenario.')).toBeInTheDocument()
  })

  it('updates feedback status from detail view', async (): Promise<void> => {
    renderDashboard()

    await screen.findByText('Revenue chart duplicates rows')
    fireEvent.click(feedbackCardButtonFromTitle('Revenue chart duplicates rows'))

    fireEvent.change(screen.getByLabelText('Update status'), {
      target: { value: 'triaged' },
    })

    await waitFor((): void => {
      expect(mockedUpdateFeedbackStatus).toHaveBeenCalledWith(
        'access-token',
        'feedback-1',
        'triaged',
      )
    })
  })

  it('loads next page when load more is clicked', async (): Promise<void> => {
    mockedListAllFeedback
      .mockResolvedValueOnce({
        items: [createFeedbackItem({ id: 'feedback-a', title: 'Initial item' })],
        nextCursor: 'cursor-2',
      })
      .mockResolvedValueOnce({
        items: [createFeedbackItem({ id: 'feedback-b', title: 'Second page item' })],
        nextCursor: null,
      })

    renderDashboard()

    await screen.findByText('Initial item')
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))

    await screen.findByText('Second page item')
    expect(mockedListAllFeedback).toHaveBeenLastCalledWith(
      'access-token',
      expect.objectContaining({ cursor: 'cursor-2' }),
    )
  })
})
