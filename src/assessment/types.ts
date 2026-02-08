import { z } from 'zod'

const nullableStringSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value): string => value || '')
const nullableNumberSchema = z
  .number()
  .nullable()
  .optional()
  .transform((value): number => value || 0)

/**
 * Assessment workflow status.
 */
export type AssessmentStatus = 'draft' | 'in-progress' | 'complete' | 'approved' | 'archived'

/**
 * Mapping resolution status for a requirement.
 */
export type MappingStatus = 'mapped' | 'partial' | 'gap'

/**
 * Severity value for identified mapping gaps.
 */
export type GapSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * High-level metadata for one regulation assessment.
 */
export interface AssessmentSummary {
  id: string
  regulationId: string
  regulationName: string
  jurisdiction: string
  status: AssessmentStatus
  createdAt: string
  totalMappings: number
  mappedCount: number
  partialCount: number
  gapCount: number
  avgConfidence: number
}

/**
 * Row-level mapping details for one assessed requirement.
 */
export interface MappingRecord {
  id: string
  assessmentId: string
  sourceRef: string
  canonicalRef: string
  sourceText: string
  section: string
  mappingStatus: MappingStatus
  confidence: number
  nistControlId: string
  nistControlText: string
  nistFramework: string
  rcmControlId: string
  rcmControlText: string
  gapSeverity: GapSeverity | ''
  gapDescription: string
  recommendedLanguage: string
  rationale: string
  scopeDomain: string
  scopeSubject: string
  scopeAssetType: string
  scopeEnvironment: string
  scopeSummary: string
  isUserOverride: boolean
}

/**
 * Full assessment with summary metadata and mapping rows.
 */
export interface AssessmentDetail extends AssessmentSummary {
  mappings: MappingRecord[]
}

/**
 * Table filter state for assessment mappings.
 */
export interface MappingFilters {
  minConfidence: number
  section: string
  severity: GapSeverity | 'all'
  status: MappingStatus | 'all'
}

/**
 * Sort direction for mapping table ordering.
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Sortable columns for mapping table ordering.
 */
export type MappingSortColumn =
  | 'sourceRef'
  | 'section'
  | 'mappingStatus'
  | 'confidence'
  | 'nistControlId'
  | 'gapSeverity'

/**
 * Sort state for the mapping table.
 */
export interface MappingSort {
  column: MappingSortColumn
  direction: SortDirection
}

export const assessmentStatusSchema = z.enum([
  'draft',
  'in-progress',
  'complete',
  'approved',
  'archived',
])
export const mappingStatusSchema = z.enum(['mapped', 'partial', 'gap'])
export const gapSeveritySchema = z.enum(['low', 'medium', 'high', 'critical'])

export const assessmentSummarySchema = z.object({
  id: z.string().min(1),
  regulationId: z.string().min(1),
  regulationName: z.string().min(1),
  jurisdiction: z.string().min(1),
  status: assessmentStatusSchema,
  createdAt: z.string().min(1),
  totalMappings: z.number().int().nonnegative(),
  mappedCount: z.number().int().nonnegative(),
  partialCount: z.number().int().nonnegative(),
  gapCount: z.number().int().nonnegative(),
  avgConfidence: z.number().min(0),
})

export const mappingRecordSchema = z.object({
  id: z.string().min(1),
  assessmentId: z.string().min(1),
  sourceRef: z.string().min(1),
  canonicalRef: nullableStringSchema,
  sourceText: nullableStringSchema,
  section: nullableStringSchema,
  mappingStatus: mappingStatusSchema,
  confidence: nullableNumberSchema,
  nistControlId: nullableStringSchema,
  nistControlText: nullableStringSchema,
  nistFramework: nullableStringSchema,
  rcmControlId: nullableStringSchema,
  rcmControlText: nullableStringSchema,
  gapSeverity: z
    .union([gapSeveritySchema, z.literal(''), z.null(), z.undefined()])
    .transform((v) => v || ''),
  gapDescription: nullableStringSchema,
  recommendedLanguage: nullableStringSchema,
  rationale: nullableStringSchema,
  scopeDomain: nullableStringSchema,
  scopeSubject: nullableStringSchema,
  scopeAssetType: nullableStringSchema,
  scopeEnvironment: nullableStringSchema,
  scopeSummary: nullableStringSchema,
  isUserOverride: z.boolean(),
})

export const assessmentDetailSchema = assessmentSummarySchema.extend({
  mappings: z.array(mappingRecordSchema),
})

export const assessmentSummariesSchema = z.array(assessmentSummarySchema)

export const mappingFiltersSchema = z.object({
  minConfidence: z.number().min(0).max(100),
  section: z.string(),
  severity: z.union([gapSeveritySchema, z.literal('all')]),
  status: z.union([mappingStatusSchema, z.literal('all')]),
})

export const mappingSortColumnSchema = z.enum([
  'sourceRef',
  'section',
  'mappingStatus',
  'confidence',
  'nistControlId',
  'gapSeverity',
])

export const mappingSortSchema = z.object({
  column: mappingSortColumnSchema,
  direction: z.enum(['asc', 'desc']),
})
