import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '../../auth/AuthProvider.js'
import { IntegrationsPage } from '../IntegrationsPage.js'
import {
  listIntegrations,
  updateIntegration,
  type Integration,
  type IntegrationListResult,
  type IntegrationUpdateResult,
} from '../IntegrationsApi.js'

vi.mock('../../auth/AuthProvider.js', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../IntegrationsApi.js', () => ({
  listIntegrations: vi.fn(),
  updateIntegration: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListIntegrations = vi.mocked(listIntegrations)
const mockedUpdateIntegration = vi.mocked(updateIntegration)

function createIntegration(overrides: Partial<Integration> = {}): Integration {
  return {
    id: 'integration-1',
    name: 'Demo Environment Simulator',
    systemType: 'asset',
    config: {},
    capabilities: ['ingest'],
    healthStatus: 'healthy',
    lastHealthCheck: '2026-02-18T08:00:00.000Z',
    lastSuccessfulSync: '2026-02-18T09:00:00.000Z',
    syncSchedule: '0 7 * * *',
    realtimeEnabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-02-18T09:00:00.000Z',
    ...overrides,
  }
}

function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
} {
  let resolvePromise: (value: T) => void = (): void => undefined
  let rejectPromise: (reason?: unknown) => void = (): void => undefined

  const promise = new Promise<T>((resolve, reject): void => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  }
}

describe('IntegrationsPage', (): void => {
  beforeEach((): void => {
    mockedUseAuth.mockReset()
    mockedListIntegrations.mockReset()
    mockedUpdateIntegration.mockReset()

    const getAccessTokenMock = vi.fn(async (): Promise<string> => 'access-token')

    mockedUseAuth.mockReturnValue({
      getAccessToken: getAccessTokenMock,
    } as unknown as ReturnType<typeof useAuth>)

    mockedListIntegrations.mockResolvedValue({
      items: [createIntegration()],
      total: 1,
    })
    mockedUpdateIntegration.mockResolvedValue({
      integration: createIntegration(),
    })
  })

  it('renders loading skeleton while fetching integrations', async (): Promise<void> => {
    const deferred = createDeferred<IntegrationListResult>()
    mockedListIntegrations.mockReturnValueOnce(deferred.promise)

    render(<IntegrationsPage />)

    expect(screen.getByText('Loading integrations...')).toBeInTheDocument()
    expect(screen.getAllByTestId('integration-skeleton')).toHaveLength(3)

    deferred.resolve({
      items: [createIntegration()],
      total: 1,
    })

    await waitFor((): void => {
      expect(screen.queryByText('Loading integrations...')).not.toBeInTheDocument()
    })
  })

  it('renders integration cards after data loads', async (): Promise<void> => {
    mockedListIntegrations.mockResolvedValueOnce({
      items: [
        createIntegration({
          id: 'integration-1',
          name: 'Demo Environment Simulator',
          systemType: 'asset',
        }),
        createIntegration({
          id: 'integration-2',
          name: 'ServiceNow IRM',
          systemType: 'grc',
          healthStatus: 'offline',
          lastSuccessfulSync: null,
        }),
      ],
      total: 2,
    })

    render(<IntegrationsPage />)

    await screen.findByText('Demo Environment Simulator')
    expect(screen.getByText('ServiceNow IRM')).toBeInTheDocument()
    expect(screen.getByText('2 integrations connected')).toBeInTheDocument()
  })

  it('renders empty state when there are no integrations', async (): Promise<void> => {
    mockedListIntegrations.mockResolvedValueOnce({
      items: [],
      total: 0,
    })

    render(<IntegrationsPage />)

    await screen.findByText('No integrations configured yet.')
  })

  it('renders error state and retries loading', async (): Promise<void> => {
    mockedListIntegrations
      .mockRejectedValueOnce(new Error('Temporary backend failure'))
      .mockResolvedValueOnce({
        items: [createIntegration()],
        total: 1,
      })

    render(<IntegrationsPage />)

    await waitFor((): void => {
      expect(screen.getByRole('alert')).toHaveTextContent('Temporary backend failure')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor((): void => {
      expect(mockedListIntegrations).toHaveBeenCalledTimes(2)
    })
  })

  it('calls updateIntegration with healthy status when toggled on', async (): Promise<void> => {
    const offlineIntegration = createIntegration({
      id: 'integration-offline',
      name: 'ServiceNow IRM',
      healthStatus: 'offline',
      lastSuccessfulSync: null,
    })

    mockedListIntegrations.mockResolvedValueOnce({
      items: [offlineIntegration],
      total: 1,
    })

    mockedUpdateIntegration.mockResolvedValueOnce({
      integration: {
        ...offlineIntegration,
        healthStatus: 'healthy',
      },
    })

    render(<IntegrationsPage />)

    await screen.findByText('ServiceNow IRM')

    fireEvent.click(screen.getByRole('switch', { name: 'Enable ServiceNow IRM' }))

    await waitFor((): void => {
      expect(mockedUpdateIntegration).toHaveBeenCalledWith('access-token', 'integration-offline', {
        healthStatus: 'healthy',
      })
    })
  })

  it('optimistically flips toggle and reverts on update error', async (): Promise<void> => {
    const offlineIntegration = createIntegration({
      id: 'integration-rollback',
      name: 'Rollback Integration',
      healthStatus: 'offline',
      lastSuccessfulSync: null,
    })

    const deferred = createDeferred<IntegrationUpdateResult>()

    mockedListIntegrations.mockResolvedValueOnce({
      items: [offlineIntegration],
      total: 1,
    })
    mockedUpdateIntegration.mockReturnValueOnce(deferred.promise)

    render(<IntegrationsPage />)

    await screen.findByText('Rollback Integration')

    const toggle = screen.getByRole('switch', { name: 'Enable Rollback Integration' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-checked', 'true')

    deferred.reject(new Error('Update failed'))

    await waitFor((): void => {
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Update failed')
  })
})
