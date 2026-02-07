import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { ChatPage } from './ChatPage'
import type { StreamEvent } from '../agent/types'

interface InvokeCall {
  accessToken: string
  message: string
  requestId: string
  signal: AbortSignal
  sessionId: string
}

const { mockInvokeAgentStream, mockUseAuth, mockLogout, mockGetAccessToken } = vi.hoisted(
  (): {
    mockInvokeAgentStream: ReturnType<typeof vi.fn>
    mockUseAuth: ReturnType<typeof vi.fn>
    mockLogout: ReturnType<typeof vi.fn>
    mockGetAccessToken: ReturnType<typeof vi.fn>
  } => ({
    mockInvokeAgentStream: vi.fn(),
    mockUseAuth: vi.fn(),
    mockLogout: vi.fn(),
    mockGetAccessToken: vi.fn(),
  }),
)

vi.mock('../agent/AgentClient', (): { invokeAgentStream: typeof mockInvokeAgentStream } => ({
  invokeAgentStream: mockInvokeAgentStream,
}))

vi.mock(
  '../auth/AuthProvider',
  (): {
    describeAuthError: (error: unknown) => string
    useAuth: typeof mockUseAuth
  } => ({
    describeAuthError: (error: unknown): string => {
      if (error instanceof Error) {
        return error.message
      }

      return 'Unknown auth error'
    },
    useAuth: mockUseAuth,
  }),
)

function streamFromEvents(events: StreamEvent[]): AsyncGenerator<StreamEvent, void, undefined> {
  return (async function* (): AsyncGenerator<StreamEvent, void, undefined> {
    for (const event of events) {
      yield event
    }
  })()
}

function fillAndSendMessage(message: string): void {
  const textarea = screen.getByLabelText('Instruction') as HTMLTextAreaElement
  fireEvent.change(textarea, { target: { value: message } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
}

beforeEach((): void => {
  mockInvokeAgentStream.mockReset()
  mockUseAuth.mockReset()
  mockLogout.mockReset()
  mockGetAccessToken.mockReset()

  mockLogout.mockResolvedValue(undefined)
  mockGetAccessToken.mockResolvedValue('access-token')

  mockUseAuth.mockReturnValue({
    getAccessToken: mockGetAccessToken,
    logout: mockLogout,
    userEmail: 'analyst@example.com',
  })
})

afterEach((): void => {
  vi.restoreAllMocks()
})

describe('ChatPage', (): void => {
  it('renders user and agent message history', async (): Promise<void> => {
    mockInvokeAgentStream.mockImplementation(() =>
      streamFromEvents([
        { type: 'delta', content: 'Investigating now.' },
        { type: 'done', summary: 'done' },
      ]),
    )

    render(<ChatPage />)

    fillAndSendMessage('Check IAM misconfigurations')

    expect(await screen.findByText('Check IAM misconfigurations')).toBeInTheDocument()
    expect(await screen.findByText('Investigating now.')).toBeInTheDocument()
    expect(screen.getAllByText('User')).toHaveLength(1)
    expect(screen.getAllByText('Agent')).toHaveLength(1)
  })

  it('keeps session id across messages and rotates it on new thread', async (): Promise<void> => {
    mockInvokeAgentStream.mockImplementation(() => streamFromEvents([{ type: 'done' }]))

    render(<ChatPage />)

    fillAndSendMessage('First')

    await waitFor((): void => {
      expect(mockInvokeAgentStream).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('button', { name: 'Send' })).not.toBeDisabled()
    })

    fillAndSendMessage('Second')

    await waitFor((): void => {
      expect(mockInvokeAgentStream).toHaveBeenCalledTimes(2)
    })

    const firstCall = mockInvokeAgentStream.mock.calls[0][0] as InvokeCall
    const secondCall = mockInvokeAgentStream.mock.calls[1][0] as InvokeCall

    expect(firstCall.sessionId).toBe(secondCall.sessionId)

    fireEvent.click(screen.getByRole('button', { name: 'New Thread' }))

    await waitFor((): void => {
      expect(screen.getByText('New thread started')).toBeInTheDocument()
    })

    expect(screen.queryByText('First')).not.toBeInTheDocument()

    fillAndSendMessage('Third')

    await waitFor((): void => {
      expect(mockInvokeAgentStream).toHaveBeenCalledTimes(3)
    })

    const thirdCall = mockInvokeAgentStream.mock.calls[2][0] as InvokeCall

    expect(thirdCall.sessionId).not.toBe(firstCall.sessionId)
  })

  it('aborts the active stream when creating a new thread', async (): Promise<void> => {
    mockInvokeAgentStream.mockImplementation((params: InvokeCall) =>
      (async function* (): AsyncGenerator<StreamEvent, void, undefined> {
        yield { type: 'delta', content: 'Streaming...' }

        await new Promise<void>((resolve): void => {
          params.signal.addEventListener('abort', (): void => resolve(), { once: true })
        })
      })(),
    )

    render(<ChatPage />)

    fillAndSendMessage('Long task')

    await waitFor((): void => {
      expect(mockInvokeAgentStream).toHaveBeenCalledTimes(1)
    })

    const firstCall = mockInvokeAgentStream.mock.calls[0][0] as InvokeCall

    fireEvent.click(screen.getByRole('button', { name: 'New Thread' }))

    await waitFor((): void => {
      expect(firstCall.signal.aborted).toBe(true)
    })
  })

  it('aborts the previous stream before sending a new message', async (): Promise<void> => {
    let invocation = 0

    mockInvokeAgentStream.mockImplementation((params: InvokeCall) => {
      invocation += 1

      if (invocation === 1) {
        return (async function* (): AsyncGenerator<StreamEvent, void, undefined> {
          yield { type: 'delta', content: 'Partial response' }

          await new Promise<void>((resolve): void => {
            params.signal.addEventListener('abort', (): void => resolve(), { once: true })
          })
        })()
      }

      return streamFromEvents([{ type: 'done' }])
    })

    render(<ChatPage />)

    fillAndSendMessage('First prompt')

    await waitFor((): void => {
      expect(mockInvokeAgentStream).toHaveBeenCalledTimes(1)
    })

    const firstCall = mockInvokeAgentStream.mock.calls[0][0] as InvokeCall

    const textarea = screen.getByLabelText('Instruction') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Second prompt' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    await waitFor((): void => {
      expect(mockInvokeAgentStream).toHaveBeenCalledTimes(2)
    })

    expect(firstCall.signal.aborted).toBe(true)
  })

  it('displays tool activity updates and marks completion', async (): Promise<void> => {
    let releaseToolCompletion: (() => void) | null = null

    mockInvokeAgentStream.mockImplementation(() =>
      (async function* (): AsyncGenerator<StreamEvent, void, undefined> {
        yield {
          type: 'tool_call',
          name: 'security_lookup',
          args: { finding: 'open_bucket' },
        }

        await new Promise<void>((resolve): void => {
          releaseToolCompletion = resolve
        })

        yield {
          type: 'tool_result',
          name: 'security_lookup',
          result: { status: 'ok' },
        }
        yield { type: 'done' }
      })(),
    )

    render(<ChatPage />)

    fillAndSendMessage('Check storage risk')

    expect(await screen.findByText('security_lookup')).toBeInTheDocument()
    expect(await screen.findByText('In progress')).toBeInTheDocument()

    const toolToggle = screen.getByRole('button', { name: /security_lookup/i })
    expect(toolToggle).toHaveAttribute('aria-expanded', 'true')

    const completeTool = releaseToolCompletion as (() => void) | null

    if (!completeTool) {
      throw new Error('tool completion callback was not registered')
    }

    completeTool()

    await waitFor((): void => {
      expect(screen.getByText('Complete')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /security_lookup/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
