/* ------------------------------------------------------------------ */
/*  Operations Hub — Shared types                                     */
/* ------------------------------------------------------------------ */

/** Shared service from the agent invocation API. */
export interface SharedService {
  id: string
  tenant_id: string
  service_name: string
  service_category: string
  description?: string
  service_owner?: string
  operating_team?: string
  sla_availability_target?: number
  sla_response_time_minutes?: number
  status: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Operating process (L1/L2/L3 hierarchy). */
export interface OperatingProcess {
  id: string
  tenant_id: string
  parent_id?: string
  process_level: number
  process_name: string
  domain: string
  owner_role?: string
  trigger_type: string
  frequency?: string
  estimated_cycle_time_hours?: number
  risk_rating: string
  description?: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Operating procedure (SOP). */
export interface OperatingProcedure {
  id: string
  tenant_id: string
  process_id: string
  procedure_name: string
  version: string
  status: string
  audience?: string
  scope_description?: string
  prerequisites: string[]
  review_cycle_days: number
  last_review_date?: string
  next_review_date?: string
  maturity_level: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Tab selection for the operations hub. */
export type OperationsTab = 'services' | 'procedures'

/** Service category display metadata. */
export const SERVICE_CATEGORY_ICONS: Record<string, string> = {
  'identity-access': '🔐',
  'endpoint-security': '🛡️',
  'network-security': '🌐',
  'cloud-infrastructure': '☁️',
  'data-protection': '🗄️',
  'security-operations': '📡',
  'vulnerability-management': '🔍',
  'compliance-governance': '📋',
  'application-security': '🔒',
  'disaster-recovery': '🔄',
  'risk-management': '⚠️',
  'training-awareness': '🎓',
  'software-development': '💻',
}

/** Risk rating severity order. */
export const RISK_RATING_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

/** Maturity level labels. */
export const MATURITY_LABELS: Record<number, string> = {
  0: 'Initial',
  1: 'Developing',
  2: 'Defined',
  3: 'Managed',
  4: 'Optimizing',
}
