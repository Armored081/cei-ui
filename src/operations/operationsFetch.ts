/* ------------------------------------------------------------------ */
/*  Operations Hub — API fetch layer                                  */
/* ------------------------------------------------------------------ */

import type { OperatingProcess, OperatingProcedure, SharedService } from './types'

const minimumSessionIdLength = 33
const agentCoreSessionIdPrefix = 'cei-session-'

function readApiBaseUrl(): string {
  const baseUrl = (
    import.meta.env.VITE_ROADMAP_API_URL ||
    import.meta.env.VITE_API_URL ||
    ''
  ).replace(/\/$/, '')

  if (!baseUrl) {
    throw new Error('Missing VITE_API_URL in environment configuration')
  }

  return baseUrl
}

function shouldUseDirectAgentCore(): boolean {
  return import.meta.env.VITE_USE_DIRECT_AGENTCORE === 'true'
}

function buildDirectAgentCoreUrl(): string {
  const region = import.meta.env.VITE_AGENTCORE_REGION || ''
  const runtimeArn = import.meta.env.VITE_AGENT_RUNTIME_ARN || ''

  if (!region || !runtimeArn) {
    throw new Error('Missing VITE_AGENTCORE_REGION or VITE_AGENT_RUNTIME_ARN')
  }

  const encodedArn = encodeURIComponent(runtimeArn)
  return `https://bedrock-agentcore.${region}.amazonaws.com/runtimes/${encodedArn}/invocations?qualifier=cei_dev_endpoint`
}

function generateSessionId(prefix: string): string {
  const base = `${agentCoreSessionIdPrefix}${prefix}-${Date.now()}`
  return base.length >= minimumSessionIdLength ? base : base.padEnd(minimumSessionIdLength, '0')
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown; message?: unknown }
    const message =
      (typeof payload.message === 'string' && payload.message) ||
      (typeof payload.error === 'string' && payload.error) ||
      ''

    if (message) {
      return message
    }
  } catch {
    // fall through
  }

  return `${response.status} ${response.statusText}`.trim()
}

function resolveItems<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== 'object') return []
  const p = payload as { items?: unknown; result?: { items?: unknown } }
  const source = p.result && typeof p.result === 'object' ? p.result : p
  return Array.isArray(source.items) ? (source.items as T[]) : []
}

function resolveSingle<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as { item?: unknown; result?: { item?: unknown } }
  const source = p.result && typeof p.result === 'object' ? p.result : p
  return (source.item as T) || null
}

interface InvokeOptions {
  accessToken: string
  action: string
  inputs: Record<string, unknown>
  sessionPrefix: string
}

async function invoke(options: InvokeOptions): Promise<unknown> {
  const useDirect = shouldUseDirectAgentCore()
  const url = useDirect ? buildDirectAgentCoreUrl() : `${readApiBaseUrl()}/v1/invoke`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  if (useDirect) {
    headers['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'] = generateSessionId(
      options.sessionPrefix,
    )
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: options.action,
      inputs: options.inputs,
      stream: false,
    }),
  })

  if (!response.ok) {
    const details = await readErrorMessage(response)
    throw new Error(`Invocation failed (${options.action}): ${details}`)
  }

  return response.json()
}

/* ─── Public API ────────────────────────────────────────────────── */

export async function fetchSharedServices(
  accessToken: string,
  filter?: { category?: string; status?: string },
): Promise<SharedService[]> {
  const payload = await invoke({
    accessToken,
    action: 'shared_service_list',
    inputs: { tenantId: 'demo', ...filter },
    sessionPrefix: 'ops-svc',
  })

  return resolveItems<SharedService>(payload)
}

export async function fetchSharedService(
  accessToken: string,
  serviceId: string,
): Promise<SharedService | null> {
  const payload = await invoke({
    accessToken,
    action: 'shared_service_get',
    inputs: { tenantId: 'demo', serviceId },
    sessionPrefix: 'ops-svc-get',
  })

  return resolveSingle<SharedService>(payload)
}

export async function fetchOperatingProcesses(
  accessToken: string,
  filter?: { domain?: string; processLevel?: number },
): Promise<OperatingProcess[]> {
  const payload = await invoke({
    accessToken,
    action: 'operating_process_list',
    inputs: { tenantId: 'demo', ...filter },
    sessionPrefix: 'ops-proc',
  })

  return resolveItems<OperatingProcess>(payload)
}

export async function fetchOperatingProcedures(
  accessToken: string,
  filter?: { processId?: string; status?: string },
): Promise<OperatingProcedure[]> {
  const payload = await invoke({
    accessToken,
    action: 'operating_procedure_list',
    inputs: { tenantId: 'demo', ...filter },
    sessionPrefix: 'ops-sop',
  })

  return resolveItems<OperatingProcedure>(payload)
}

export async function fetchOperatingProcedure(
  accessToken: string,
  procedureId: string,
): Promise<OperatingProcedure | null> {
  const payload = await invoke({
    accessToken,
    action: 'operating_procedure_get',
    inputs: { tenantId: 'demo', procedureId },
    sessionPrefix: 'ops-sop-get',
  })

  return resolveSingle<OperatingProcedure>(payload)
}
