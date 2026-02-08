import { z } from 'zod'

import { getAuthAccessToken } from '../auth/accessToken'
import {
  assessmentDetailSchema,
  assessmentSummariesSchema,
  approveAssessmentRequestSchema,
  mappingFiltersSchema,
  mappingRecordSchema,
  updateAssessmentStatusRequestSchema,
  updateMappingRecordRequestSchema,
  type AssessmentDetail,
  type AssessmentStatus,
  type AssessmentSummary,
  type MappingFilters,
  type MappingRecord,
  type UpdateMappingRecordRequest,
} from './types'

const errorPayloadSchema = z
  .object({
    code: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough()

/**
 * Error class for assessment API failures.
 */
export class AssessmentApiError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number = 0) {
    super(message)
    this.code = code
    this.status = status
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown API error'
}

function parseJsonStrict(payload: string): unknown {
  try {
    return JSON.parse(payload)
  } catch {
    throw new AssessmentApiError('response_parse_error', 'Invalid JSON payload from assessment API')
  }
}

function buildApiBaseUrl(): string {
  const apiBaseUrl = import.meta.env.VITE_API_URL || ''

  if (!apiBaseUrl) {
    throw new AssessmentApiError(
      'configuration_error',
      'Missing VITE_API_URL in environment configuration',
    )
  }

  return apiBaseUrl.replace(/\/$/, '')
}

function buildUrl(path: string, queryParams?: URLSearchParams): string {
  const query = queryParams ? `?${queryParams.toString()}` : ''
  return `${buildApiBaseUrl()}${path}${query}`
}

async function buildHttpError(response: Response): Promise<AssessmentApiError> {
  let code = 'http_error'

  if (response.status === 401) {
    code = 'auth_error'
  } else if (response.status === 403) {
    code = 'forbidden_error'
  }

  let message = `Request failed with status ${response.status}`
  const responseText = await response.text()

  if (!responseText) {
    return new AssessmentApiError(code, message, response.status)
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const parsedBody = parseJsonStrict(responseText)
    const parsedError = errorPayloadSchema.safeParse(parsedBody)

    if (parsedError.success) {
      return new AssessmentApiError(
        parsedError.data.code || code,
        parsedError.data.message || message,
        response.status,
      )
    }
  }

  message = responseText || message

  return new AssessmentApiError(code, message, response.status)
}

async function getParsedJson<TSchema extends z.ZodType>(
  response: Response,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const bodyText = await response.text()

  if (!bodyText) {
    throw new AssessmentApiError('response_parse_error', 'Expected response body but received none')
  }

  const parsedJson = parseJsonStrict(bodyText)
  const parsedResult = schema.safeParse(parsedJson)

  if (!parsedResult.success) {
    throw new AssessmentApiError(
      'response_parse_error',
      'Assessment API response did not match schema',
    )
  }

  return parsedResult.data
}

async function sendAuthorizedRequest(
  path: string,
  init: RequestInit,
  queryParams?: URLSearchParams,
): Promise<Response> {
  const accessToken = await getAuthAccessToken().catch((error: unknown) => {
    throw new AssessmentApiError('auth_client_error', toErrorMessage(error))
  })

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'X-Request-Id': crypto.randomUUID(),
  }

  if (init.headers) {
    const customHeaders = new Headers(init.headers)
    customHeaders.forEach((value: string, key: string): void => {
      headers[key] = value
    })
  }

  let response: Response

  try {
    response = await fetch(buildUrl(path, queryParams), {
      ...init,
      headers,
    })
  } catch (error) {
    throw new AssessmentApiError('connection_error', toErrorMessage(error))
  }

  if (!response.ok) {
    throw await buildHttpError(response)
  }

  return response
}

/**
 * Fetches all assessments available to the current user.
 */
export async function fetchAssessments(): Promise<AssessmentSummary[]> {
  const response = await sendAuthorizedRequest('/assessments', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  return getParsedJson(response, assessmentSummariesSchema)
}

/**
 * Fetches the full detail payload for one assessment.
 */
export async function fetchAssessmentDetail(id: string): Promise<AssessmentDetail> {
  if (!id) {
    throw new AssessmentApiError('validation_error', 'Assessment ID is required')
  }

  const response = await sendAuthorizedRequest(`/assessments/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  return getParsedJson(response, assessmentDetailSchema)
}

/**
 * Exports assessment mappings as CSV.
 */
export async function exportAssessmentCsv(id: string, filters?: MappingFilters): Promise<Blob> {
  if (!id) {
    throw new AssessmentApiError('validation_error', 'Assessment ID is required')
  }

  const parsedFilters = filters ? mappingFiltersSchema.parse(filters) : null
  const queryParams = new URLSearchParams()

  if (parsedFilters) {
    if (parsedFilters.status !== 'all') {
      queryParams.set('status', parsedFilters.status)
    }

    if (parsedFilters.section && parsedFilters.section !== 'all') {
      queryParams.set('section', parsedFilters.section)
    }

    if (parsedFilters.severity !== 'all') {
      queryParams.set('severity', parsedFilters.severity)
    }

    if (parsedFilters.minConfidence > 0) {
      queryParams.set('minConfidence', String(parsedFilters.minConfidence))
    }
  }

  const response = await sendAuthorizedRequest(
    `/assessments/${encodeURIComponent(id)}/export`,
    {
      method: 'GET',
      headers: {
        Accept: 'text/csv',
      },
    },
    queryParams.size > 0 ? queryParams : undefined,
  )

  return response.blob()
}

/**
 * Updates one mapping record within an assessment.
 */
export async function updateMappingRecord(
  assessmentId: string,
  mappingId: string,
  payload: UpdateMappingRecordRequest,
): Promise<MappingRecord> {
  if (!assessmentId) {
    throw new AssessmentApiError('validation_error', 'Assessment ID is required')
  }

  if (!mappingId) {
    throw new AssessmentApiError('validation_error', 'Mapping ID is required')
  }

  const validatedPayload = updateMappingRecordRequestSchema.parse(payload)
  const response = await sendAuthorizedRequest(
    `/assessments/${encodeURIComponent(assessmentId)}/mappings/${encodeURIComponent(mappingId)}`,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedPayload),
    },
  )

  return getParsedJson(response, mappingRecordSchema)
}

/**
 * Approves one completed assessment.
 */
export async function approveAssessment(
  assessmentId: string,
  approvedBy: string,
): Promise<AssessmentDetail> {
  if (!assessmentId) {
    throw new AssessmentApiError('validation_error', 'Assessment ID is required')
  }

  const validatedPayload = approveAssessmentRequestSchema.parse({
    approvedBy,
  })
  const response = await sendAuthorizedRequest(
    `/assessments/${encodeURIComponent(assessmentId)}/approve`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedPayload),
    },
  )

  return getParsedJson(response, assessmentDetailSchema)
}

/**
 * Updates the workflow status for one assessment.
 */
export async function updateAssessmentStatus(
  assessmentId: string,
  status: AssessmentStatus,
): Promise<AssessmentDetail> {
  if (!assessmentId) {
    throw new AssessmentApiError('validation_error', 'Assessment ID is required')
  }

  const validatedPayload = updateAssessmentStatusRequestSchema.parse({
    status,
  })
  const response = await sendAuthorizedRequest(
    `/assessments/${encodeURIComponent(assessmentId)}/status`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedPayload),
    },
  )

  return getParsedJson(response, assessmentDetailSchema)
}
