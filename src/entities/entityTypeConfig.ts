import type { EntityType } from '../types/entity.js'

/**
 * Visual presentation metadata for an entity type.
 */
export interface EntityTypeConfig {
  icon: string
  label: string
  color: string
  category: 'governance' | 'vulnerability' | 'disaster-recovery' | 'core'
}

/**
 * Type-to-visual configuration map for all supported entities.
 */
export const ENTITY_TYPE_CONFIG: Record<EntityType, EntityTypeConfig> = {
  control: { icon: '🛡️', label: 'Control', color: '--accent', category: 'governance' },
  risk: { icon: '⚠️', label: 'Risk', color: '--warning', category: 'governance' },
  framework: {
    icon: '📋',
    label: 'Framework',
    color: '--chart-series-3',
    category: 'governance',
  },
  policy: { icon: '📜', label: 'Policy', color: '--chart-series-4', category: 'governance' },
  metric: { icon: '📊', label: 'Metric', color: '--text-muted', category: 'core' },
  standard: {
    icon: '📐',
    label: 'Standard',
    color: '--chart-series-2',
    category: 'governance',
  },
  vendor: { icon: '🏢', label: 'Vendor', color: '--chart-series-1', category: 'core' },
  asset: { icon: '💻', label: 'Asset', color: '--text-muted', category: 'core' },
  finding: {
    icon: '🔍',
    label: 'Finding',
    color: '--severity-medium',
    category: 'governance',
  },
  person: { icon: '👤', label: 'Person', color: '--text-muted', category: 'core' },
  team: { icon: '👥', label: 'Team', color: '--text-muted', category: 'core' },
  process: { icon: '⚙️', label: 'Process', color: '--text-muted', category: 'core' },
  vulnerability: {
    icon: '🔓',
    label: 'Vulnerability',
    color: '--severity-high',
    category: 'vulnerability',
  },
  cve: { icon: '🐛', label: 'CVE', color: '--severity-high', category: 'vulnerability' },
  patch: { icon: '🩹', label: 'Patch', color: '--chart-series-2', category: 'vulnerability' },
  exploit: {
    icon: '💥',
    label: 'Exploit',
    color: '--severity-critical',
    category: 'vulnerability',
  },
  affected_asset: {
    icon: '🎯',
    label: 'Affected Asset',
    color: '--severity-high',
    category: 'vulnerability',
  },
  scan: { icon: '🔬', label: 'Scan', color: '--chart-series-3', category: 'vulnerability' },
  sla_policy: {
    icon: '📋',
    label: 'SLA Policy',
    color: '--chart-series-4',
    category: 'vulnerability',
  },
  remediation_group: {
    icon: '📦',
    label: 'Remediation Group',
    color: '--chart-series-1',
    category: 'vulnerability',
  },
  recovery_plan: {
    icon: '🔄',
    label: 'Recovery Plan',
    color: '--accent-strong',
    category: 'disaster-recovery',
  },
  rto_rpo_target: {
    icon: '⏱️',
    label: 'RTO/RPO Target',
    color: '--chart-series-2',
    category: 'disaster-recovery',
  },
  bc_scenario: {
    icon: '📋',
    label: 'BC Scenario',
    color: '--chart-series-3',
    category: 'disaster-recovery',
  },
  test_exercise: {
    icon: '🧪',
    label: 'Test Exercise',
    color: '--chart-series-4',
    category: 'disaster-recovery',
  },
  dependency: {
    icon: '🔗',
    label: 'Dependency',
    color: '--chart-series-2',
    category: 'disaster-recovery',
  },
  critical_process: {
    icon: '⚡',
    label: 'Critical Process',
    color: '--severity-high',
    category: 'disaster-recovery',
  },
  recovery_team: {
    icon: '👥',
    label: 'Recovery Team',
    color: '--chart-series-1',
    category: 'disaster-recovery',
  },
  alternate_site: {
    icon: '🏢',
    label: 'Alternate Site',
    color: '--chart-series-3',
    category: 'disaster-recovery',
  },
  communication_plan: {
    icon: '📞',
    label: 'Communication Plan',
    color: '--chart-series-4',
    category: 'disaster-recovery',
  },
  escalation_tier: {
    icon: '📈',
    label: 'Escalation Tier',
    color: '--warning',
    category: 'disaster-recovery',
  },
  vital_record: {
    icon: '📄',
    label: 'Vital Record',
    color: '--accent',
    category: 'disaster-recovery',
  },
  crisis_action: {
    icon: '🚨',
    label: 'Crisis Action',
    color: '--severity-critical',
    category: 'disaster-recovery',
  },
}
