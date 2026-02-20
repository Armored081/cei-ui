import { z } from 'zod'

export const entityTypeSchema = z.enum([
  'control',
  'risk',
  'metric',
  'policy',
  'standard',
  'framework',
  'vendor',
  'asset',
  'finding',
  'person',
  'team',
  'process',
  'vulnerability',
  'cve',
  'patch',
  'exploit',
  'affected_asset',
  'scan',
  'sla_policy',
  'remediation_group',
  'recovery_plan',
  'rto_rpo_target',
  'bc_scenario',
  'test_exercise',
  'dependency',
  'critical_process',
  'recovery_team',
  'alternate_site',
  'communication_plan',
  'escalation_tier',
  'vital_record',
  'crisis_action',
])

export const entityReferenceSchema = z.object({
  type: entityTypeSchema,
  id: z.string(),
  name: z.string(),
  attributes: z.record(z.string(), z.unknown()).optional(),
})

export const entityRelationshipSchema = z.object({
  source: entityReferenceSchema,
  target: entityReferenceSchema,
  relationshipType: z.string(),
  weight: z.number().optional(),
})

export const entityEdgeSchema = entityRelationshipSchema

export const entityGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.string(),
  nodeIds: z.array(z.string()),
})

export const entityGraphSchema = z.object({
  nodes: z.array(entityReferenceSchema),
  edges: z.array(entityEdgeSchema),
  groups: z.array(entityGroupSchema).optional(),
})

export const storyCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  narrative: z.string(),
  correlatedEntities: z.array(entityReferenceSchema),
  temporalWindow: z
    .object({
      startDate: z.string(),
      endDate: z.string(),
    })
    .optional(),
  triggerMetrics: z.array(z.string()).optional(),
  recommendedActions: z.array(z.string()).optional(),
})

export const vizHintSchema = z.object({
  id: z.string(),
  chartType: z.enum(['gauge', 'timeline', 'heatmap', 'bar']),
  title: z.string().optional(),
  data: z.unknown(),
  config: z.unknown().optional(),
})

export const pivotTargetSchema = z.object({
  entity: entityReferenceSchema,
  suggestedAction: z.string(),
  targetUseCase: z.string().optional(),
})

export const modernContextSchema = z.object({
  storyCards: z.array(storyCardSchema),
  entityGraph: entityGraphSchema,
  vizHints: z.array(vizHintSchema),
  pivotTargets: z.array(pivotTargetSchema),
})

export type EntityType = z.infer<typeof entityTypeSchema>
export type EntityReference = z.infer<typeof entityReferenceSchema>
export type EntityRelationship = z.infer<typeof entityRelationshipSchema>
export type EntityEdge = z.infer<typeof entityEdgeSchema>
export type EntityGroup = z.infer<typeof entityGroupSchema>
export type EntityGraph = z.infer<typeof entityGraphSchema>
export type StoryCard = z.infer<typeof storyCardSchema>
export type VizHint = z.infer<typeof vizHintSchema>
export type PivotTarget = z.infer<typeof pivotTargetSchema>
export type ModernContext = z.infer<typeof modernContextSchema>
