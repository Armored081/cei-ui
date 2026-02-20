export type VizSeverity = 'critical' | 'high' | 'medium' | 'low'

/**
 * Shared theme tokens for custom visualization components.
 */
export const VIZ_THEME = {
  axis: 'var(--viz-axis, var(--text-muted))',
  grid: 'var(--viz-grid, var(--chart-grid))',
  tooltipBackground: 'var(--viz-tooltip-bg, rgba(14, 18, 25, 0.96))',
  tooltipBorder: 'var(--viz-tooltip-border, var(--border-strong))',
  tooltipText: 'var(--viz-tooltip-text, var(--text-primary))',
  labelFontFamily: 'var(--font-display)',
  valueFontFamily: 'var(--font-mono)',
  gaugeTrack: 'var(--viz-gauge-track, rgba(124, 147, 196, 0.2))',
} as const

/**
 * Resolve a severity color from CSS custom properties.
 */
export function severityColor(severity: VizSeverity | undefined): string {
  if (severity === 'critical') {
    return 'var(--viz-critical, var(--severity-critical))'
  }

  if (severity === 'high') {
    return 'var(--viz-high, var(--severity-high))'
  }

  if (severity === 'medium') {
    return 'var(--viz-medium, var(--severity-medium))'
  }

  return 'var(--viz-low, var(--chart-series-3))'
}
