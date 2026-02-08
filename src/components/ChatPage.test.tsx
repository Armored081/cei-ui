import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AttachmentInput, StreamEvent } from '../agent/types'
import { ChatPage } from './ChatPage'

interface InvokeCall {
  accessToken: string
  attachments?: AttachmentInput[]
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

function attachFiles(files: File[]): void {
  const input = screen.getByTestId('attachment-input') as HTMLInputElement
  fireEvent.change(input, { target: { files } })
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
  it('shows an empty welcome state with suggestions', (): void => {
    render(<ChatPage />)

    expect(screen.getByText('Welcome to CEI Agent')).toBeInTheDocument()
    expect(screen.getByText('Try one of these prompts:')).toBeInTheDocument()
  })

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

  it('renders mixed text and structured blocks from stream events', async (): Promise<void> => {
    mockInvokeAgentStream.mockImplementation(() =>
      streamFromEvents([
        { type: 'delta', content: 'Initial analysis: ' },
        {
          type: 'block',
          block: {
            kind: 'recommendation',
            severity: 'medium',
            title: 'Patch vulnerable package',
            body: 'Update dependency xyz to 3.2.1.',
          },
        },
        { type: 'delta', content: 'Follow-up validation complete.' },
        { type: 'done' },
      ]),
    )

    render(<ChatPage />)

    fillAndSendMessage('Check dependency exposure')

    expect(await screen.findByText(/Initial analysis:/)).toBeInTheDocument()
    expect(await screen.findByText('Patch vulnerable package')).toBeInTheDocument()
    expect(await screen.findByText('Update dependency xyz to 3.2.1.')).toBeInTheDocument()
    expect(await screen.findByText('Follow-up validation complete.')).toBeInTheDocument()
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

  it('shows connecting and sending feedback while waiting for stream start', async (): Promise<void> => {
    let hasConnectRelease = false
    let releaseConnect = (): void => {}

    mockInvokeAgentStream.mockImplementation(() =>
      (async function* (): AsyncGenerator<StreamEvent, void, undefined> {
        await new Promise<void>((resolve): void => {
          hasConnectRelease = true
          releaseConnect = (): void => resolve()
        })
        yield { type: 'done' }
      })(),
    )

    render(<ChatPage />)

    fillAndSendMessage('Long startup request')

    expect(await screen.findByTestId('connecting-indicator')).toBeInTheDocument()
    expect(screen.getByLabelText('Instruction')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled()

    await waitFor((): void => {
      expect(hasConnectRelease).toBe(true)
    })
    releaseConnect()

    await waitFor((): void => {
      expect(screen.queryByTestId('connecting-indicator')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Send' })).not.toBeDisabled()
    })
  })

  it('shows a friendly network error without exposing raw backend text', async (): Promise<void> => {
    mockInvokeAgentStream.mockImplementation(() =>
      streamFromEvents([
        {
          type: 'error',
          code: 'connection_error',
          message: 'getaddrinfo ENOTFOUND api.internal',
        },
      ]),
    )

    render(<ChatPage />)

    fillAndSendMessage('Check connectivity')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'Unable to reach the CEI service. Check your connection and try again.',
    )
    expect(
      await screen.findByText('Network connection failed before a response was received.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/ENOTFOUND/)).not.toBeInTheDocument()
  })

  it('logs out and prompts re-login on auth expiry errors', async (): Promise<void> => {
    mockInvokeAgentStream.mockImplementation(() =>
      streamFromEvents([
        {
          type: 'error',
          code: 'auth_error',
          message: 'JWT expired',
        },
      ]),
    )

    render(<ChatPage />)

    fillAndSendMessage('Run security review')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Your session expired. Please sign in again.')
    expect(
      await screen.findByText('Session expired. Sign in again to continue this conversation.'),
    ).toBeInTheDocument()

    await waitFor((): void => {
      expect(mockLogout).toHaveBeenCalledTimes(1)
    })

    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('marks interrupted streams as retryable and retries with same session id', async (): Promise<void> => {
    let invocation = 0

    mockInvokeAgentStream.mockImplementation(() => {
      invocation += 1

      if (invocation === 1) {
        return streamFromEvents([
          { type: 'delta', content: 'Partial response...' },
          {
            type: 'error',
            code: 'stream_interrupted',
            message: 'socket closed',
          },
        ])
      }

      return streamFromEvents([
        { type: 'delta', content: 'Retried response complete.' },
        { type: 'done' },
      ])
    })

    render(<ChatPage />)

    fillAndSendMessage('Investigate asset inventory')

    expect(await screen.findByText('Partial response...')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument()

    const firstCall = mockInvokeAgentStream.mock.calls[0][0] as InvokeCall

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor((): void => {
      expect(mockInvokeAgentStream).toHaveBeenCalledTimes(2)
    })

    const secondCall = mockInvokeAgentStream.mock.calls[1][0] as InvokeCall

    expect(secondCall.sessionId).toBe(firstCall.sessionId)
    expect(secondCall.message).toBe(firstCall.message)
    expect(await screen.findByText('Retried response complete.')).toBeInTheDocument()
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

  it('aborts the active stream when pressing Escape', async (): Promise<void> => {
    mockInvokeAgentStream.mockImplementation((params: InvokeCall) =>
      (async function* (): AsyncGenerator<StreamEvent, void, undefined> {
        yield { type: 'delta', content: 'Working...' }

        await new Promise<void>((resolve): void => {
          params.signal.addEventListener('abort', (): void => resolve(), { once: true })
        })
      })(),
    )

    render(<ChatPage />)

    fillAndSendMessage('Cancelable request')

    await waitFor((): void => {
      expect(mockInvokeAgentStream).toHaveBeenCalledTimes(1)
    })

    const firstCall = mockInvokeAgentStream.mock.calls[0][0] as InvokeCall
    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor((): void => {
      expect(firstCall.signal.aborted).toBe(true)
      expect(screen.getByRole('button', { name: 'Send' })).not.toBeDisabled()
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
    let hasToolRelease = false
    let releaseToolCompletion = (): void => {}

    mockInvokeAgentStream.mockImplementation(() =>
      (async function* (): AsyncGenerator<StreamEvent, void, undefined> {
        yield {
          type: 'tool_call',
          name: 'security_lookup',
          args: { finding: 'open_bucket' },
        }

        await new Promise<void>((resolve): void => {
          hasToolRelease = true
          releaseToolCompletion = (): void => resolve()
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

    await waitFor((): void => {
      expect(hasToolRelease).toBe(true)
    })
    releaseToolCompletion()

    await waitFor((): void => {
      expect(screen.getByText('Complete')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /security_lookup/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('attaches a valid file and sends it with the invoke call', async (): Promise<void> => {
    mockInvokeAgentStream.mockImplementation(() => streamFromEvents([{ type: 'done' }]))

    render(<ChatPage />)

    const file = new File(['evidence'], 'evidence.txt', { type: 'text/plain' })
    attachFiles([file])

    expect(await screen.findByText('evidence.txt')).toBeInTheDocument()
    await waitFor((): void => {
      expect(screen.getByText(/Ready/)).toBeInTheDocument()
    })

    fillAndSendMessage('Review attached evidence')

    await waitFor((): void => {
      expect(mockInvokeAgentStream).toHaveBeenCalledTimes(1)
    })

    const call = mockInvokeAgentStream.mock.calls[0][0] as InvokeCall

    expect(call.attachments).toHaveLength(1)
    expect(call.attachments?.[0]).toMatchObject({
      mime: 'text/plain',
      name: 'evidence.txt',
      sizeBytes: file.size,
    })
    expect((call.attachments?.[0].data || '').length).toBeGreaterThan(0)
  })

  it('rejects oversized files', async (): Promise<void> => {
    mockInvokeAgentStream.mockImplementation(() => streamFromEvents([{ type: 'done' }]))

    render(<ChatPage />)

    const oversizedBytes = new Uint8Array(5 * 1024 * 1024 + 1)
    const file = new File([oversizedBytes], 'too-large.pdf', { type: 'application/pdf' })

    attachFiles([file])

    expect(
      await screen.findByText('File "too-large.pdf" exceeds the 5MB limit.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('too-large.pdf')).not.toBeInTheDocument()
  })

  it('rejects files with invalid MIME types', async (): Promise<void> => {
    mockInvokeAgentStream.mockImplementation(() => streamFromEvents([{ type: 'done' }]))

    render(<ChatPage />)

    const file = new File(['PNG'], 'image.png', { type: 'image/png' })
    attachFiles([file])

    expect(
      await screen.findByText('File "image.png" has an unsupported MIME type.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('image.png')).not.toBeInTheDocument()
  })

  it('removes an attachment from preview before sending', async (): Promise<void> => {
    mockInvokeAgentStream.mockImplementation(() => streamFromEvents([{ type: 'done' }]))

    render(<ChatPage />)

    const file = new File(['notes'], 'notes.md', { type: 'text/markdown' })
    attachFiles([file])

    expect(await screen.findByText('notes.md')).toBeInTheDocument()
    await waitFor((): void => {
      expect(screen.getByText(/Ready/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Remove notes.md' }))
    expect(screen.queryByText('notes.md')).not.toBeInTheDocument()

    fillAndSendMessage('Message without attachments')

    await waitFor((): void => {
      expect(mockInvokeAgentStream).toHaveBeenCalledTimes(1)
    })

    const call = mockInvokeAgentStream.mock.calls[0][0] as InvokeCall
    expect(call.attachments).toEqual([])
  })

  it('supports up to three attachments per message', async (): Promise<void> => {
    mockInvokeAgentStream.mockImplementation(() => streamFromEvents([{ type: 'done' }]))

    render(<ChatPage />)

    const fileOne = new File(['a'], 'one.txt', { type: 'text/plain' })
    const fileTwo = new File(['b'], 'two.csv', { type: 'text/csv' })
    const fileThree = new File(['c'], 'three.json', { type: 'application/json' })
    attachFiles([fileOne, fileTwo, fileThree])

    expect(await screen.findByText('one.txt')).toBeInTheDocument()
    expect(await screen.findByText('two.csv')).toBeInTheDocument()
    expect(await screen.findByText('three.json')).toBeInTheDocument()
    await waitFor((): void => {
      expect(screen.getAllByText(/Ready/)).toHaveLength(3)
    })

    const fileFour = new File(['d'], 'four.txt', { type: 'text/plain' })
    attachFiles([fileFour])

    expect(await screen.findByText('You can attach up to 3 files per message.')).toBeInTheDocument()
    expect(screen.queryByText('four.txt')).not.toBeInTheDocument()

    fillAndSendMessage('Review three attachments')

    await waitFor((): void => {
      expect(mockInvokeAgentStream).toHaveBeenCalledTimes(1)
    })

    const call = mockInvokeAgentStream.mock.calls[0][0] as InvokeCall
    expect(call.attachments).toHaveLength(3)
  })

  it('keeps text-only chat behavior unchanged', async (): Promise<void> => {
    mockInvokeAgentStream.mockImplementation(() =>
      streamFromEvents([{ type: 'delta', content: 'Text-only response' }, { type: 'done' }]),
    )

    render(<ChatPage />)

    fillAndSendMessage('Text-only prompt')

    expect(await screen.findByText('Text-only prompt')).toBeInTheDocument()
    expect(await screen.findByText('Text-only response')).toBeInTheDocument()

    await waitFor((): void => {
      expect(mockInvokeAgentStream).toHaveBeenCalledTimes(1)
    })

    const call = mockInvokeAgentStream.mock.calls[0][0] as InvokeCall
    expect(call.attachments).toEqual([])
  })
})
