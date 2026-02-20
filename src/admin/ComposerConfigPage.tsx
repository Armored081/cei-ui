import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '../auth/AuthProvider.js'
import { ToastStack, type ToastMessage } from '../components/Toast.js'
import {
  listAgentConfigs,
  updateComposerConfig,
  type AgentConfig,
  type ComposerVersion,
} from './IntegrationsApi.js'

type ComposerConfigLoadState = 'loading' | 'loaded' | 'error'

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

function readNextComposerVersion(version: ComposerVersion): ComposerVersion {
  return version === 'legacy' ? 'modern' : 'legacy'
}

function formatComposerVersion(version: ComposerVersion): string {
  return version === 'legacy' ? 'Legacy' : 'Modern'
}

/**
 * Admin page for toggling prompt composer versions per agent.
 */
export function ComposerConfigPage(): JSX.Element {
  const { getAccessToken } = useAuth()
  const [loadState, setLoadState] = useState<ComposerConfigLoadState>('loading')
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [total, setTotal] = useState<number>(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [updatingAgentIds, setUpdatingAgentIds] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const requestIdRef = useRef<number>(0)
  const toastIdRef = useRef<number>(0)

  const onDismissToast = useCallback((toastId: string): void => {
    setToasts((current): ToastMessage[] =>
      current.filter((candidate): boolean => candidate.id !== toastId),
    )
  }, [])

  const pushErrorToast = useCallback((message: string): void => {
    toastIdRef.current += 1
    setToasts((current): ToastMessage[] => [
      ...current,
      {
        id: `composer-config-toast-${toastIdRef.current.toString()}`,
        title: 'Composer config update failed',
        description: message,
        variant: 'error',
      },
    ])
  }, [])

  const loadAgents = useCallback(async (): Promise<void> => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setLoadState('loading')
    setLoadError(null)

    try {
      const accessToken = await getAccessToken()
      const result = await listAgentConfigs(accessToken)

      if (requestIdRef.current !== requestId) {
        return
      }

      setAgents(result.items)
      setTotal(result.total)
      setLoadState('loaded')
    } catch (error: unknown) {
      if (requestIdRef.current !== requestId) {
        return
      }

      const message = readErrorMessage(error, 'Failed to load composer configuration')
      setLoadError(message)
      setLoadState('error')
      pushErrorToast(message)
    }
  }, [getAccessToken, pushErrorToast])

  useEffect((): void => {
    void loadAgents()
  }, [loadAgents])

  const configuredAgentCount = useMemo((): number => {
    return total || agents.length
  }, [agents.length, total])

  const onToggleComposerVersion = useCallback(
    async (agent: AgentConfig): Promise<void> => {
      if (updatingAgentIds.has(agent.id)) {
        return
      }

      const currentVersion = agent.config.composerVersion
      const nextVersion = readNextComposerVersion(currentVersion)

      setUpdatingAgentIds((current): Set<string> => new Set(current).add(agent.id))
      setAgents((current): AgentConfig[] =>
        current.map((candidate) =>
          candidate.id === agent.id
            ? {
                ...candidate,
                config: {
                  ...candidate.config,
                  composerVersion: nextVersion,
                },
              }
            : candidate,
        ),
      )

      try {
        const accessToken = await getAccessToken()
        const result = await updateComposerConfig(accessToken, agent.id, {
          composerVersion: nextVersion,
        })

        setAgents((current): AgentConfig[] =>
          current.map((candidate) => (candidate.id === agent.id ? result.agent : candidate)),
        )
      } catch (error: unknown) {
        setAgents((current): AgentConfig[] =>
          current.map((candidate) => (candidate.id === agent.id ? agent : candidate)),
        )
        pushErrorToast(readErrorMessage(error, `Failed to update ${agent.name}`))
      } finally {
        setUpdatingAgentIds((current): Set<string> => {
          const next = new Set(current)
          next.delete(agent.id)
          return next
        })
      }
    },
    [getAccessToken, pushErrorToast, updatingAgentIds],
  )

  return (
    <>
      <div style={{ padding: '32px 40px' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--color-text-primary, #fff)',
            marginBottom: '8px',
          }}
        >
          Composer Configuration
        </h1>
        <p
          style={{
            color: 'var(--color-text-secondary, rgba(255,255,255,0.6))',
            marginBottom: '24px',
          }}
        >
          {configuredAgentCount} agents available
        </p>

        {loadState === 'loading' ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            <p style={{ color: 'var(--color-text-secondary, rgba(255,255,255,0.6))' }}>
              Loading composer configuration...
            </p>
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                data-testid="composer-config-skeleton"
                style={{
                  background: 'var(--color-surface-raised, rgba(255,255,255,0.04))',
                  border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                  borderRadius: '8px',
                  padding: '18px 24px',
                }}
              >
                <div
                  style={{
                    width: '50%',
                    height: '12px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.14)',
                    marginBottom: '8px',
                  }}
                />
                <div
                  style={{
                    width: '35%',
                    height: '10px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.1)',
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}

        {loadState === 'error' ? (
          <div
            style={{
              background: 'var(--color-surface-raised, rgba(255,255,255,0.04))',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div role="alert" style={{ color: '#fecaca', fontSize: '14px' }}>
              {loadError || 'Failed to load composer configuration'}
            </div>
            <button
              type="button"
              onClick={(): void => {
                void loadAgents()
              }}
              style={{
                border: '1px solid var(--color-border, rgba(255,255,255,0.2))',
                background: 'var(--color-surface-raised, rgba(255,255,255,0.06))',
                color: 'var(--color-text-primary, #fff)',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        {loadState === 'loaded' && agents.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary, rgba(255,255,255,0.6))' }}>
            No agents found.
          </p>
        ) : null}

        {loadState === 'loaded' && agents.length > 0 ? (
          <div
            style={{
              overflowX: 'auto',
              background: 'var(--color-surface-raised, rgba(255,255,255,0.04))',
              border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
              borderRadius: '10px',
            }}
          >
            <table
              aria-label="Composer configuration table"
              style={{ width: '100%', borderCollapse: 'collapse' }}
            >
              <thead>
                <tr>
                  <th
                    scope="col"
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontSize: '12px',
                      color: 'var(--color-text-secondary, rgba(255,255,255,0.7))',
                      borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                    }}
                  >
                    Agent Name
                  </th>
                  <th
                    scope="col"
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontSize: '12px',
                      color: 'var(--color-text-secondary, rgba(255,255,255,0.7))',
                      borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                    }}
                  >
                    ID
                  </th>
                  <th
                    scope="col"
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontSize: '12px',
                      color: 'var(--color-text-secondary, rgba(255,255,255,0.7))',
                      borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                    }}
                  >
                    Current Composer Version
                  </th>
                  <th
                    scope="col"
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontSize: '12px',
                      color: 'var(--color-text-secondary, rgba(255,255,255,0.7))',
                      borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => {
                  const composerVersion = agent.config.composerVersion
                  const nextVersion = readNextComposerVersion(composerVersion)
                  const isUpdating = updatingAgentIds.has(agent.id)

                  return (
                    <tr key={agent.id}>
                      <td
                        style={{
                          padding: '14px 16px',
                          color: 'var(--color-text-primary, #fff)',
                          fontSize: '14px',
                          borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.06))',
                        }}
                      >
                        {agent.name}
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          color: 'var(--color-text-secondary, rgba(255,255,255,0.7))',
                          fontSize: '13px',
                          borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.06))',
                        }}
                      >
                        <code>{agent.id}</code>
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          color: 'var(--color-text-primary, #fff)',
                          fontSize: '13px',
                          borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.06))',
                        }}
                      >
                        <span
                          style={{
                            border: '1px solid var(--color-border, rgba(255,255,255,0.2))',
                            borderRadius: '999px',
                            padding: '2px 10px',
                            textTransform: 'lowercase',
                          }}
                        >
                          {composerVersion}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.06))',
                        }}
                      >
                        <button
                          type="button"
                          aria-label={`Switch ${agent.name} to ${formatComposerVersion(nextVersion)}`}
                          disabled={isUpdating}
                          onClick={(): void => {
                            void onToggleComposerVersion(agent)
                          }}
                          style={{
                            border: '1px solid var(--color-border, rgba(255,255,255,0.2))',
                            background: 'var(--color-surface-raised, rgba(255,255,255,0.06))',
                            color: 'var(--color-text-primary, #fff)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: isUpdating ? 'wait' : 'pointer',
                            opacity: isUpdating ? 0.8 : 1,
                          }}
                        >
                          {isUpdating
                            ? 'Updating...'
                            : `Switch to ${formatComposerVersion(nextVersion)}`}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
      <ToastStack onDismiss={onDismissToast} toasts={toasts} />
    </>
  )
}
