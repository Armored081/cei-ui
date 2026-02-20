import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '../../auth/AuthProvider.js'
import { ComposerConfigPage } from '../ComposerConfigPage.js'
import {
  listAgentConfigs,
  updateComposerConfig,
  type AgentConfig,
  type AgentConfigListResult,
  type ComposerConfigUpdateResult,
} from '../IntegrationsApi.js'

vi.mock('../../auth/AuthProvider.js', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../IntegrationsApi.js', () => ({
  listAgentConfigs: vi.fn(),
  updateComposerConfig: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListAgentConfigs = vi.mocked(listAgentConfigs)
const mockedUpdateComposerConfig = vi.mocked(updateComposerConfig)

function createAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: 'agent-1',
    name: 'Threat Correlation Agent',
    config: {
      composerVersion: 'legacy',
    },
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

describe('ComposerConfigPage', (): void => {
  beforeEach((): void => {
    mockedUseAuth.mockReset()
    mockedListAgentConfigs.mockReset()
    mockedUpdateComposerConfig.mockReset()

    mockedUseAuth.mockReturnValue({
      getAccessToken: vi.fn(async (): Promise<string> => 'access-token'),
    } as unknown as ReturnType<typeof useAuth>)

    mockedListAgentConfigs.mockResolvedValue({
      items: [createAgentConfig()],
      total: 1,
    })
    mockedUpdateComposerConfig.mockResolvedValue({
      agent: createAgentConfig({
        config: { composerVersion: 'modern' },
      }),
    })
  })

  it('renders loading skeleton while fetching agent config', async (): Promise<void> => {
    const deferred = createDeferred<AgentConfigListResult>()
    mockedListAgentConfigs.mockReturnValueOnce(deferred.promise)

    render(<ComposerConfigPage />)

    expect(screen.getByText('Loading composer configuration...')).toBeInTheDocument()
    expect(screen.getAllByTestId('composer-config-skeleton')).toHaveLength(3)

    deferred.resolve({
      items: [createAgentConfig()],
      total: 1,
    })

    await waitFor((): void => {
      expect(screen.queryByText('Loading composer configuration...')).not.toBeInTheDocument()
    })
  })

  it('renders the composer configuration table after load', async (): Promise<void> => {
    mockedListAgentConfigs.mockResolvedValueOnce({
      items: [
        createAgentConfig({
          id: 'agent-1',
          name: 'Threat Correlation Agent',
          config: { composerVersion: 'legacy' },
        }),
        createAgentConfig({
          id: 'agent-2',
          name: 'Vendor Risk Agent',
          config: { composerVersion: 'modern' },
        }),
      ],
      total: 2,
    })

    render(<ComposerConfigPage />)

    await screen.findByText('Threat Correlation Agent')
    expect(screen.getByText('Vendor Risk Agent')).toBeInTheDocument()
    expect(screen.getByText('2 agents available')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Composer configuration table' })).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Current Composer Version' }),
    ).toBeInTheDocument()
  })

  it('renders empty state when no agents are returned', async (): Promise<void> => {
    mockedListAgentConfigs.mockResolvedValueOnce({
      items: [],
      total: 0,
    })

    render(<ComposerConfigPage />)

    await screen.findByText('No agents found.')
  })

  it('renders load error and retries list call', async (): Promise<void> => {
    mockedListAgentConfigs
      .mockRejectedValueOnce(new Error('Admin API timeout'))
      .mockResolvedValueOnce({
        items: [createAgentConfig()],
        total: 1,
      })

    render(<ComposerConfigPage />)

    await waitFor((): void => {
      expect(screen.getByRole('alert')).toHaveTextContent('Admin API timeout')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor((): void => {
      expect(mockedListAgentConfigs).toHaveBeenCalledTimes(2)
    })
  })

  it('calls updateComposerConfig with modern version for legacy agents', async (): Promise<void> => {
    const legacyAgent = createAgentConfig({
      id: 'agent-legacy',
      name: 'Legacy Agent',
      config: { composerVersion: 'legacy' },
    })

    mockedListAgentConfigs.mockResolvedValueOnce({
      items: [legacyAgent],
      total: 1,
    })

    render(<ComposerConfigPage />)

    await screen.findByText('Legacy Agent')
    fireEvent.click(screen.getByRole('button', { name: 'Switch Legacy Agent to Modern' }))

    await waitFor((): void => {
      expect(mockedUpdateComposerConfig).toHaveBeenCalledWith('access-token', 'agent-legacy', {
        composerVersion: 'modern',
      })
    })
  })

  it('calls updateComposerConfig with legacy version for modern agents', async (): Promise<void> => {
    const modernAgent = createAgentConfig({
      id: 'agent-modern',
      name: 'Modern Agent',
      config: { composerVersion: 'modern' },
    })

    mockedListAgentConfigs.mockResolvedValueOnce({
      items: [modernAgent],
      total: 1,
    })
    mockedUpdateComposerConfig.mockResolvedValueOnce({
      agent: createAgentConfig({
        id: 'agent-modern',
        name: 'Modern Agent',
        config: { composerVersion: 'legacy' },
      }),
    })

    render(<ComposerConfigPage />)

    await screen.findByText('Modern Agent')
    fireEvent.click(screen.getByRole('button', { name: 'Switch Modern Agent to Legacy' }))

    await waitFor((): void => {
      expect(mockedUpdateComposerConfig).toHaveBeenCalledWith('access-token', 'agent-modern', {
        composerVersion: 'legacy',
      })
    })
  })

  it('optimistically updates table value before toggle request resolves', async (): Promise<void> => {
    const deferred = createDeferred<ComposerConfigUpdateResult>()
    const agent = createAgentConfig({
      id: 'agent-optimistic',
      name: 'Optimistic Agent',
      config: { composerVersion: 'legacy' },
    })

    mockedListAgentConfigs.mockResolvedValueOnce({
      items: [agent],
      total: 1,
    })
    mockedUpdateComposerConfig.mockReturnValueOnce(deferred.promise)

    render(<ComposerConfigPage />)

    await screen.findByText('Optimistic Agent')
    fireEvent.click(screen.getByRole('button', { name: 'Switch Optimistic Agent to Modern' }))

    const row = screen.getByText('Optimistic Agent').closest('tr')
    if (!row) {
      throw new Error('Expected row for Optimistic Agent')
    }

    expect(within(row).getByText('modern')).toBeInTheDocument()

    deferred.resolve({
      agent: createAgentConfig({
        id: 'agent-optimistic',
        name: 'Optimistic Agent',
        config: { composerVersion: 'modern' },
      }),
    })

    await waitFor((): void => {
      expect(screen.getByRole('button', { name: 'Switch Optimistic Agent to Legacy' })).toBeEnabled()
    })
  })

  it('reverts optimistic update and shows toast when toggle fails', async (): Promise<void> => {
    const deferred = createDeferred<ComposerConfigUpdateResult>()
    const agent = createAgentConfig({
      id: 'agent-revert',
      name: 'Rollback Agent',
      config: { composerVersion: 'legacy' },
    })

    mockedListAgentConfigs.mockResolvedValueOnce({
      items: [agent],
      total: 1,
    })
    mockedUpdateComposerConfig.mockReturnValueOnce(deferred.promise)

    render(<ComposerConfigPage />)

    await screen.findByText('Rollback Agent')
    fireEvent.click(screen.getByRole('button', { name: 'Switch Rollback Agent to Modern' }))

    deferred.reject(new Error('Backend validation failed'))

    await waitFor((): void => {
      const row = screen.getByText('Rollback Agent').closest('tr')
      if (!row) {
        throw new Error('Expected row for Rollback Agent')
      }

      expect(within(row).getByText('legacy')).toBeInTheDocument()
    })

    expect(screen.getByText('Composer config update failed')).toBeInTheDocument()
    expect(screen.getByText('Backend validation failed')).toBeInTheDocument()
  })

  it('disables toggle action while update request is in progress', async (): Promise<void> => {
    const deferred = createDeferred<ComposerConfigUpdateResult>()
    const agent = createAgentConfig({
      id: 'agent-busy',
      name: 'Busy Agent',
      config: { composerVersion: 'legacy' },
    })

    mockedListAgentConfigs.mockResolvedValueOnce({
      items: [agent],
      total: 1,
    })
    mockedUpdateComposerConfig.mockReturnValueOnce(deferred.promise)

    render(<ComposerConfigPage />)

    await screen.findByText('Busy Agent')
    const button = screen.getByRole('button', { name: 'Switch Busy Agent to Modern' })

    fireEvent.click(button)

    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Updating...')

    deferred.resolve({
      agent: createAgentConfig({
        id: 'agent-busy',
        name: 'Busy Agent',
        config: { composerVersion: 'modern' },
      }),
    })

    await waitFor((): void => {
      expect(screen.getByRole('button', { name: 'Switch Busy Agent to Legacy' })).toBeEnabled()
    })
  })

  it('shows toast notification when initial load fails', async (): Promise<void> => {
    mockedListAgentConfigs.mockRejectedValueOnce(new Error('Cannot load agents'))

    render(<ComposerConfigPage />)

    await waitFor((): void => {
      expect(screen.getByRole('alert')).toHaveTextContent('Cannot load agents')
      expect(screen.getByRole('status')).toHaveTextContent('Cannot load agents')
      expect(screen.getByText('Composer config update failed')).toBeInTheDocument()
    })
  })

  it('dismisses toast notification when close button is clicked', async (): Promise<void> => {
    mockedListAgentConfigs.mockRejectedValueOnce(new Error('Cannot load agents'))

    render(<ComposerConfigPage />)

    const dismissButton = await screen.findByRole('button', {
      name: 'Dismiss Composer config update failed',
    })
    fireEvent.click(dismissButton)

    await waitFor((): void => {
      expect(screen.queryByText('Composer config update failed')).not.toBeInTheDocument()
    })
  })

  it('applies server response row values after a successful update', async (): Promise<void> => {
    const initialAgent = createAgentConfig({
      id: 'agent-server',
      name: 'Server Agent',
      config: { composerVersion: 'legacy' },
    })

    mockedListAgentConfigs.mockResolvedValueOnce({
      items: [initialAgent],
      total: 1,
    })
    mockedUpdateComposerConfig.mockResolvedValueOnce({
      agent: createAgentConfig({
        id: 'agent-server',
        name: 'Server Agent v2',
        config: { composerVersion: 'modern' },
      }),
    })

    render(<ComposerConfigPage />)

    await screen.findByText('Server Agent')
    fireEvent.click(screen.getByRole('button', { name: 'Switch Server Agent to Modern' }))

    await screen.findByText('Server Agent v2')
    expect(screen.queryByText('Server Agent')).not.toBeInTheDocument()
  })
})
