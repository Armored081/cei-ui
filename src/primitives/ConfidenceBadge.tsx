import type { ArtifactConfidence } from '../types/chat'
import './confidence-badge.css'

interface ConfidenceBadgeProps {
  confidence?: ArtifactConfidence
  confidenceDecay?: string
}

function formatDecayLabel(isoTimestamp: string): string {
  const parsedDate = new Date(isoTimestamp)

  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  const elapsedMs = Math.max(0, Date.now() - parsedDate.getTime())
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60))

  if (elapsedMinutes < 1) {
    return 'just now'
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes.toString()}m ago`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)

  if (elapsedHours < 24) {
    return `${elapsedHours.toString()}h ago`
  }

  const elapsedDays = Math.floor(elapsedHours / 24)
  return `${elapsedDays.toString()}d ago`
}

function isDecayWarningThresholdExceeded(isoTimestamp: string): boolean {
  const parsedDate = new Date(isoTimestamp)

  if (Number.isNaN(parsedDate.getTime())) {
    return false
  }

  const elapsedHours = (Date.now() - parsedDate.getTime()) / (1000 * 60 * 60)
  return elapsedHours > 24
}

function confidenceLabel(confidence: ArtifactConfidence): string {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1)
}

/**
 * Renders a confidence pill with optional decay and stale-confidence warning.
 */
export function ConfidenceBadge({
  confidence,
  confidenceDecay,
}: ConfidenceBadgeProps): JSX.Element | null {
  if (!confidence && !confidenceDecay) {
    return null
  }

  const resolvedConfidence = confidence || 'unknown'
  const decayLabel = confidenceDecay ? formatDecayLabel(confidenceDecay) : ''
  const hasWarning = confidenceDecay ? isDecayWarningThresholdExceeded(confidenceDecay) : false

  return (
    <span
      className={`cei-confidence-badge cei-confidence-${resolvedConfidence}`}
      role="status"
      aria-label={`Confidence ${confidenceLabel(resolvedConfidence)}`}
    >
      <span className="cei-confidence-label">{confidenceLabel(resolvedConfidence)}</span>
      {decayLabel ? (
        <span className="cei-confidence-decay" aria-label={`Confidence age ${decayLabel}`}>
          {'\u23F1\uFE0F'} {decayLabel}
        </span>
      ) : null}
      {hasWarning ? (
        <span
          aria-label="Confidence may have changed"
          className="cei-confidence-warning"
          title="Confidence may have changed"
        >
          {'\u26A0\uFE0F'}
        </span>
      ) : null}
    </span>
  )
}
