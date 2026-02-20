import type { CSSProperties } from 'react'

import type { StoryCard as ModernContextStoryCard } from '../types/modern-context.js'
import type { StorySeverity } from './StorySeverityBadge.js'
import './story-cards.css'

/**
 * Story timeline props.
 */
export interface StoryTimelineProps {
  temporalWindow?: ModernContextStoryCard['temporalWindow']
  severity?: StorySeverity
}

const TIMELINE_COLOR_BY_SEVERITY: Record<StorySeverity, string> = {
  critical: 'var(--severity-critical)',
  high: 'var(--severity-high)',
  medium: 'var(--severity-medium)',
  low: 'var(--severity-low)',
  info: 'var(--severity-info, var(--text-muted))',
}

function formatTimelineDate(rawDate: string): string {
  const parsedDate = new Date(rawDate.length === 10 ? `${rawDate}T00:00:00Z` : rawDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return rawDate
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Renders a temporal window bar from story metadata.
 */
export function StoryTimeline({ temporalWindow, severity }: StoryTimelineProps): JSX.Element {
  const style = {
    '--story-timeline-color': severity
      ? TIMELINE_COLOR_BY_SEVERITY[severity]
      : 'var(--accent-strong)',
  } as CSSProperties

  if (!temporalWindow) {
    return (
      <div className="cei-story-timeline cei-story-timeline-empty" style={style}>
        <span className="cei-story-timeline-label">No temporal window</span>
      </div>
    )
  }

  const startDateLabel = formatTimelineDate(temporalWindow.startDate)
  const endDateLabel = formatTimelineDate(temporalWindow.endDate)

  return (
    <div
      aria-label={`Temporal window from ${startDateLabel} to ${endDateLabel}`}
      className="cei-story-timeline"
      style={style}
    >
      <span className="cei-story-timeline-label">{startDateLabel}</span>
      <span aria-hidden="true" className="cei-story-timeline-bar" />
      <span className="cei-story-timeline-label">{endDateLabel}</span>
    </div>
  )
}
