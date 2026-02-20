import type { StoryCard as ModernContextStoryCard } from '../types/modern-context.js'
import './story-cards.css'

/**
 * Supported story severity values.
 */
export type StorySeverity = ModernContextStoryCard['severity']

/**
 * Story severity badge props.
 */
export interface StorySeverityBadgeProps {
  severity: StorySeverity
}

const SEVERITY_LABELS: Record<StorySeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

/**
 * Renders a styled severity badge for story cards.
 */
export function StorySeverityBadge({ severity }: StorySeverityBadgeProps): JSX.Element {
  return (
    <span className={`cei-story-severity-badge cei-story-severity-badge-${severity}`}>
      {SEVERITY_LABELS[severity]}
    </span>
  )
}
