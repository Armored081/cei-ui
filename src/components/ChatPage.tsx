import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { invokeAgentStream } from '../agent/AgentClient'
import { SectionCard } from './SectionCard'
import { describeAuthError, useAuth } from '../auth/AuthProvider'

type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error'

function statusLabel(status: StreamStatus): string {
  if (status === 'connecting') {
    return 'Connecting...'
  }

  if (status === 'streaming') {
    return 'Streaming...'
  }

  if (status === 'done') {
    return 'Done'
  }

  if (status === 'error') {
    return 'Error'
  }

  return 'Idle'
}

export function ChatPage(): JSX.Element {
  const { getAccessToken, logout, userEmail } = useAuth()
  const [message, setMessage] = useState<string>('')
  const [sessionId, setSessionId] = useState<string>(uuidv4())
  const [responseText, setResponseText] = useState<string>('')
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle')
  const [error, setError] = useState<string>('')

  const status = useMemo((): string => statusLabel(streamStatus), [streamStatus])

  const submitPrompt = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const trimmedMessage = message.trim()

    if (!trimmedMessage || streamStatus === 'connecting' || streamStatus === 'streaming') {
      return
    }

    setResponseText('')
    setError('')
    setStreamStatus('connecting')
    setMessage('')

    try {
      const accessToken = await getAccessToken()
      const requestId = uuidv4()
      let hasStreamedDelta = false
      let hasError = false

      for await (const event of invokeAgentStream({
        accessToken,
        message: trimmedMessage,
        requestId,
        sessionId,
      })) {
        if (event.type === 'delta') {
          hasStreamedDelta = true
          setStreamStatus('streaming')
          setResponseText((currentText: string): string => `${currentText}${event.content}`)
          continue
        }

        if (event.type === 'error') {
          hasError = true
          setStreamStatus('error')
          setError(`${event.code}: ${event.message}`)
          return
        }

        if (event.type === 'done') {
          setStreamStatus('done')
        }
      }

      if (!hasStreamedDelta && !hasError) {
        setStreamStatus('done')
      }
    } catch (submitError) {
      setStreamStatus('error')
      setError(describeAuthError(submitError))
    }
  }

  const createNewThread = (): void => {
    setSessionId(uuidv4())
    setResponseText('')
    setStreamStatus('idle')
    setError('')
  }

  return (
    <main
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        minHeight: '100vh',
        padding: 'var(--space-8) var(--space-6)',
        display: 'grid',
        gap: 'var(--space-6)',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <p
            style={{
              marginTop: 0,
              marginBottom: 'var(--space-2)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              fontSize: '0.76rem',
            }}
          >
            CEI Agent UI - Phase 1
          </p>
          <h1 style={{ margin: 0, fontSize: '1.55rem' }}>Stream Client Proof of Concept</h1>
          <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-muted)' }}>
            Signed in as {userEmail}
          </p>
        </div>

        <button onClick={logout} type="button" style={secondaryButtonStyle}>
          Sign out
        </button>
      </header>

      <SectionCard title="Prompt">
        <form onSubmit={submitPrompt} style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <label htmlFor="cei-message" style={{ display: 'grid', gap: 'var(--space-2)' }}>
            Instruction
            <textarea
              id="cei-message"
              value={message}
              onChange={(event): void => setMessage(event.target.value)}
              rows={5}
              placeholder="Ask the CEI agent to investigate a security scenario..."
              style={textareaStyle}
            />
          </label>

          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={streamStatus === 'connecting' || streamStatus === 'streaming'}
              style={primaryButtonStyle}
            >
              Send
            </button>
            <button
              onClick={createNewThread}
              type="button"
              disabled={streamStatus === 'connecting' || streamStatus === 'streaming'}
              style={secondaryButtonStyle}
            >
              New Thread
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Session">
        <p style={metaRowStyle}>
          Session ID: <code>{sessionId}</code>
        </p>
        <p style={metaRowStyle}>Status: {status}</p>
        {error ? <p style={{ ...metaRowStyle, color: 'var(--danger)' }}>{error}</p> : null}
      </SectionCard>

      <SectionCard title="Streaming Output">
        <pre style={streamOutputStyle}>{responseText || 'No response yet.'}</pre>
      </SectionCard>
    </main>
  )
}

const metaRowStyle: CSSProperties = {
  margin: 0,
  color: 'var(--text-muted)',
}

const textareaStyle: CSSProperties = {
  width: '100%',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-panel)',
  color: 'var(--text-primary)',
  padding: 'var(--space-3)',
}

const primaryButtonStyle: CSSProperties = {
  border: 0,
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--accent)',
  color: '#09253e',
  fontWeight: 700,
  padding: 'var(--space-3) var(--space-5)',
  cursor: 'pointer',
}

const secondaryButtonStyle: CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'transparent',
  color: 'var(--text-primary)',
  fontWeight: 600,
  padding: 'var(--space-3) var(--space-5)',
  cursor: 'pointer',
}

const streamOutputStyle: CSSProperties = {
  margin: 0,
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-panel)',
  minHeight: '180px',
  padding: 'var(--space-4)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}
