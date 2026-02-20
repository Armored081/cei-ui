import { afterEach, describe, expect, it, vi } from 'vitest'

import { listAgentConfigs, updateComposerConfig } from '../IntegrationsApi'

function createAccessToken(userId = 'admin-user-1'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ sub: userId })).toString('base64url')
  return `${header}.${payload}.signature`
}

afterEach((): void => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('composer config admin API', (): void => {
  it('lists agent composer config from /api/admin/agents', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/')
    const accessToken = createAccessToken('admin-123')
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'agent-1',
              name: 'Threat Agent',
              config: {
                composerVersion: 'legacy',
              },
            },
          ],
          total: 1,
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', mockFetch)

    const result = await listAgentConfigs(accessToken)

    expect(result.total).toBe(1)
    expect(result.items[0].config.composerVersion).toBe('legacy')

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/api/admin/agents')
    expect(options.method).toBe('GET')
    expect(options.headers).toMatchObject({
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'x-user-id': 'admin-123',
    })
  })

  it('accepts list payloads that use agents with top-level composerVersion', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            agents: [
              {
                id: 'agent-2',
                name: 'Vendor Agent',
                composerVersion: 'modern',
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    )

    const result = await listAgentConfigs(createAccessToken())

    expect(result.total).toBe(1)
    expect(result.items).toEqual([
      {
        id: 'agent-2',
        name: 'Vendor Agent',
        config: {
          composerVersion: 'modern',
        },
      },
    ])
  })

  it('throws a descriptive list error when the response is non-ok', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Forbidden for current role' }), {
          status: 403,
          statusText: 'Forbidden',
        }),
      ),
    )

    await expect(listAgentConfigs(createAccessToken())).rejects.toThrow(
      'Failed to list agent composer config: Forbidden for current role',
    )
  })

  it('updates composer version at /api/admin/composer-config/:agentId', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    const accessToken = createAccessToken('admin-456')
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          agent: {
            id: 'agent-modern',
            name: 'Modern Agent',
            config: {
              composerVersion: 'modern',
            },
          },
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', mockFetch)

    const result = await updateComposerConfig(accessToken, 'agent/modern', {
      composerVersion: 'modern',
    })

    expect(result.agent.config.composerVersion).toBe('modern')

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/api/admin/composer-config/agent%2Fmodern')
    expect(options.method).toBe('PUT')
    expect(options.headers).toMatchObject({
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-user-id': 'admin-456',
    })
    expect(options.body).toBe(JSON.stringify({ composerVersion: 'modern' }))
  })

  it('accepts direct update payloads without agent wrapper', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'agent-legacy',
            name: 'Legacy Agent',
            composerVersion: 'legacy',
          }),
          { status: 200 },
        ),
      ),
    )

    const result = await updateComposerConfig(createAccessToken(), 'agent-legacy', {
      composerVersion: 'legacy',
    })

    expect(result).toEqual({
      agent: {
        id: 'agent-legacy',
        name: 'Legacy Agent',
        config: {
          composerVersion: 'legacy',
        },
      },
    })
  })

  it('throws when update response payload does not contain a valid composer version', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            agent: {
              id: 'agent-1',
              name: 'Broken Agent',
              config: {},
            },
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(
      updateComposerConfig(createAccessToken(), 'agent-1', {
        composerVersion: 'modern',
      }),
    ).rejects.toThrow('Invalid composer config payload: invalid composerVersion')
  })
})
