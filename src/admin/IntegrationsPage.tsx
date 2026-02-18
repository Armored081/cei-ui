import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '../auth/AuthProvider.js'
import { listIntegrations, updateIntegration, type Integration } from './IntegrationsApi.js'

type IntegrationsLoadState = 'loading' | 'loaded' | 'error'

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

function isIntegrationActive(healthStatus: Integration['healthStatus']): boolean {
  return healthStatus === 'healthy' || healthStatus === 'degraded' || healthStatus === 'stale'
}

function healthDotColor(status: Integration['healthStatus']): string {
  if (status === 'healthy') {
    return '#22c55e'
  }

  if (status === 'degraded' || status === 'stale') {
    return '#f59e0b'
  }

  if (status === 'offline') {
    return '#ef4444'
  }

  return 'rgba(255,255,255,0.3)'
}

function formatSystemType(type: Integration['systemType']): string {
  if (type === 'grc') {
    return 'GRC'
  }

  if (type === 'siem') {
    return 'SIEM'
  }

  return type.charAt(0).toUpperCase() + type.slice(1)
}

function formatHealthStatus(status: Integration['healthStatus']): string {
  if (status === 'healthy') {
    return 'Healthy'
  }

  if (status === 'degraded') {
    return 'Degraded'
  }

  if (status === 'offline') {
    return 'Offline'
  }

  if (status === 'stale') {
    return 'Stale'
  }

  return 'Unknown'
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) {
    return 'Never'
  }

  const date = new Date(isoString)

  if (Number.isNaN(date.getTime())) {
    return 'Never'
  }

  const nowMs = Date.now()
  const deltaMs = Math.max(0, nowMs - date.getTime())

  if (deltaMs < 60_000) {
    return 'just now'
  }

  if (deltaMs < 60 * 60_000) {
    const minutes = Math.floor(deltaMs / 60_000)
    return `${minutes}m ago`
  }

  if (deltaMs < 24 * 60 * 60_000) {
    const hours = Math.floor(deltaMs / (60 * 60_000))
    return `${hours}h ago`
  }

  const days = Math.floor(deltaMs / (24 * 60 * 60_000))
  if (days <= 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  return date.toLocaleDateString()
}

/**
 * Admin integrations page with health visibility and enable/disable controls.
 */
export function IntegrationsPage(): JSX.Element {
  const { getAccessToken } = useAuth()
  const [loadState, setLoadState] = useState<IntegrationsLoadState>('loading')
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [total, setTotal] = useState<number>(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [updatingIntegrationIds, setUpdatingIntegrationIds] = useState<Set<string>>(new Set())
  const requestIdRef = useRef<number>(0)

  const loadAllIntegrations = useCallback(async (): Promise<void> => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setLoadState('loading')
    setLoadError(null)

    try {
      const accessToken = await getAccessToken()
      const result = await listIntegrations(accessToken)

      if (requestIdRef.current !== requestId) {
        return
      }

      setIntegrations(result.items)
      setTotal(result.total)
      setLoadState('loaded')
    } catch (error: unknown) {
      if (requestIdRef.current !== requestId) {
        return
      }

      setLoadError(readErrorMessage(error, 'Failed to load integrations'))
      setLoadState('error')
    }
  }, [getAccessToken])

  useEffect((): void => {
    void loadAllIntegrations()
  }, [loadAllIntegrations])

  const connectedCount = useMemo((): number => {
    if (loadState !== 'loaded') {
      return total || integrations.length
    }

    return total || integrations.length
  }, [integrations.length, loadState, total])

  const onToggleIntegration = useCallback(
    async (integration: Integration): Promise<void> => {
      if (updatingIntegrationIds.has(integration.id)) {
        return
      }

      const nextHealthStatus = isIntegrationActive(integration.healthStatus) ? 'offline' : 'healthy'

      setToggleError(null)
      setUpdatingIntegrationIds((current): Set<string> => new Set(current).add(integration.id))
      setIntegrations((current): Integration[] =>
        current.map((candidate) =>
          candidate.id === integration.id
            ? {
                ...candidate,
                healthStatus: nextHealthStatus,
                updatedAt: new Date().toISOString(),
              }
            : candidate,
        ),
      )

      try {
        const accessToken = await getAccessToken()
        const result = await updateIntegration(accessToken, integration.id, {
          healthStatus: nextHealthStatus,
        })

        setIntegrations((current): Integration[] =>
          current.map((candidate) =>
            candidate.id === integration.id ? result.integration : candidate,
          ),
        )
      } catch (error: unknown) {
        setIntegrations((current): Integration[] =>
          current.map((candidate) => (candidate.id === integration.id ? integration : candidate)),
        )
        setToggleError(readErrorMessage(error, `Failed to update ${integration.name}`))
      } finally {
        setUpdatingIntegrationIds((current): Set<string> => {
          const next = new Set(current)
          next.delete(integration.id)
          return next
        })
      }
    },
    [getAccessToken, updatingIntegrationIds],
  )

  return (
    <div style={{ padding: '32px 40px' }}>
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--color-text-primary, #fff)',
          marginBottom: '8px',
        }}
      >
        Integrations
      </h1>
      <p
        style={{
          color: 'var(--color-text-secondary, rgba(255,255,255,0.6))',
          marginBottom: '24px',
        }}
      >
        {connectedCount} integrations connected
      </p>

      {toggleError ? (
        <div
          role="alert"
          style={{
            marginBottom: '16px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(239,68,68,0.35)',
            background: 'rgba(239,68,68,0.12)',
            color: '#fecaca',
            fontSize: '13px',
          }}
        >
          {toggleError}
        </div>
      ) : null}

      {loadState === 'loading' ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          <p style={{ color: 'var(--color-text-secondary, rgba(255,255,255,0.6))' }}>
            Loading integrations...
          </p>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              data-testid="integration-skeleton"
              style={{
                background: 'var(--color-surface-raised, rgba(255,255,255,0.04))',
                border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                borderRadius: '8px',
                padding: '20px 24px',
              }}
            >
              <div
                style={{
                  width: '45%',
                  height: '14px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.14)',
                  marginBottom: '10px',
                }}
              />
              <div
                style={{
                  width: '65%',
                  height: '10px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.09)',
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
            {loadError || 'Failed to load integrations'}
          </div>
          <button
            type="button"
            onClick={(): void => {
              void loadAllIntegrations()
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

      {loadState === 'loaded' && integrations.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary, rgba(255,255,255,0.6))' }}>
          No integrations configured yet.
        </p>
      ) : null}

      {loadState === 'loaded' && integrations.length > 0 ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {integrations.map((integration) => {
            const active = isIntegrationActive(integration.healthStatus)
            const isUpdating = updatingIntegrationIds.has(integration.id)

            return (
              <article
                key={integration.id}
                style={{
                  background: 'var(--color-surface-raised, rgba(255,255,255,0.04))',
                  border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                  borderRadius: '8px',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '20px',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: healthDotColor(integration.healthStatus),
                        flexShrink: 0,
                      }}
                    />
                    <strong
                      style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary, #fff)',
                      }}
                    >
                      {integration.name}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      fontSize: '13px',
                      color: 'var(--color-text-secondary, rgba(255,255,255,0.6))',
                    }}
                  >
                    <span
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        color: 'var(--color-text-secondary, rgba(255,255,255,0.78))',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {formatSystemType(integration.systemType)}
                    </span>
                    <span aria-hidden="true">|</span>
                    <span>Last sync: {formatRelativeTime(integration.lastSuccessfulSync)}</span>
                    {integration.syncSchedule ? (
                      <>
                        <span aria-hidden="true">|</span>
                        <span>⏰ {integration.syncSchedule}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--color-text-primary, #fff)',
                      fontSize: '12px',
                      borderRadius: '999px',
                      border: '1px solid var(--color-border, rgba(255,255,255,0.16))',
                      padding: '2px 8px',
                    }}
                  >
                    {formatHealthStatus(integration.healthStatus)}
                  </span>

                  <button
                    type="button"
                    role="switch"
                    aria-label={`${active ? 'Disable' : 'Enable'} ${integration.name}`}
                    aria-checked={active}
                    disabled={isUpdating}
                    onClick={(): void => {
                      void onToggleIntegration(integration)
                    }}
                    style={{
                      width: '40px',
                      height: '22px',
                      borderRadius: '11px',
                      border: 'none',
                      background: active ? '#22c55e' : 'rgba(255,255,255,0.3)',
                      cursor: isUpdating ? 'wait' : 'pointer',
                      padding: 0,
                      position: 'relative',
                      transition: 'background 150ms ease',
                      opacity: isUpdating ? 0.85 : 1,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: '2px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#fff',
                        transform: active ? 'translateX(18px)' : 'translateX(0)',
                        transition: 'transform 150ms ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isUpdating ? (
                        <span
                          data-testid={`toggle-spinner-${integration.id}`}
                          aria-hidden="true"
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            border: '2px solid rgba(15,17,23,0.2)',
                            borderTopColor: '#0f1117',
                          }}
                        />
                      ) : null}
                    </span>
                  </button>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-secondary, rgba(255,255,255,0.6))',
                    }}
                  >
                    {active ? 'Disable' : 'Enable'}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
