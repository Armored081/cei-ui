import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastStack, type ToastMessage } from './Toast'

const toastFixtures: ToastMessage[] = [
  {
    id: 'toast-success',
    title: 'Saved',
    description: 'Mapping override saved.',
    variant: 'success',
  },
  {
    id: 'toast-error',
    title: 'Error',
    description: 'Request failed.',
    variant: 'error',
  },
  {
    id: 'toast-info',
    title: 'Info',
    description: 'Assessment sent back to draft.',
    variant: 'info',
  },
]

describe('ToastStack', (): void => {
  beforeEach((): void => {
    vi.useFakeTimers()
  })

  afterEach((): void => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders success, error, and info variants', (): void => {
    render(<ToastStack onDismiss={vi.fn()} toasts={toastFixtures} />)

    expect(screen.getByText('Saved').closest('article')).toHaveClass('cei-toast-success')
    expect(screen.getByText('Error').closest('article')).toHaveClass('cei-toast-error')
    expect(screen.getByText('Info').closest('article')).toHaveClass('cei-toast-info')
  })

  it('auto dismisses toasts after 4 seconds', (): void => {
    const onDismiss = vi.fn()

    render(
      <ToastStack
        onDismiss={onDismiss}
        toasts={[
          {
            id: 'toast-success',
            title: 'Saved',
            variant: 'success',
          },
        ]}
      />,
    )

    vi.advanceTimersByTime(4000)

    expect(onDismiss).toHaveBeenCalledWith('toast-success')
  })

  it('dismisses toast when close button is clicked', (): void => {
    const onDismiss = vi.fn()

    render(
      <ToastStack
        onDismiss={onDismiss}
        toasts={[
          {
            id: 'toast-success',
            title: 'Saved',
            variant: 'success',
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Saved' }))

    expect(onDismiss).toHaveBeenCalledWith('toast-success')
  })
})
