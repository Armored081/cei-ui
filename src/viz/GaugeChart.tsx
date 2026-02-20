import { useEffect, useMemo, useRef, useState } from 'react'

import { severityColor, type VizSeverity, VIZ_THEME } from './viz-theme.js'
import './viz.css'

const GAUGE_START_ANGLE = -135
const GAUGE_END_ANGLE = 135

/**
 * Gauge chart props.
 */
export interface GaugeChartProps {
  value: number
  max: number
  label: string
  severity?: VizSeverity
  width?: number
  height?: number
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

function describeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(centerX, centerY, radius, endAngle)
  const end = polarToCartesian(centerX, centerY, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return `M ${start.x.toString()} ${start.y.toString()} A ${radius.toString()} ${radius.toString()} 0 ${largeArcFlag} 0 ${end.x.toString()} ${end.y.toString()}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function readReducedMotionPreference(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * SVG radial gauge with spring-like animated arc transitions.
 */
export function GaugeChart({
  value,
  max,
  label,
  severity,
  width = 360,
  height = 220,
}: GaugeChartProps): JSX.Element {
  const [animatedRatio, setAnimatedRatio] = useState<number>(0)
  const velocityRef = useRef<number>(0)
  const frameRef = useRef<number | null>(null)

  const normalizedMax = Math.max(1, max)
  const boundedValue = clamp(value, 0, normalizedMax)
  const targetRatio = boundedValue / normalizedMax
  const percentage = Math.round(targetRatio * 100)
  const gaugeColor = severityColor(severity)
  const reducedMotion = readReducedMotionPreference()

  useEffect((): (() => void) => {
    if (reducedMotion) {
      return (): void => {}
    }

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    const stiffness = 0.15
    const damping = 0.82

    const tick = (): void => {
      setAnimatedRatio((currentRatio) => {
        const springForce = (targetRatio - currentRatio) * stiffness
        const nextVelocity = (velocityRef.current + springForce) * damping
        const nextRatio = currentRatio + nextVelocity

        velocityRef.current = nextVelocity

        const isSettled =
          Math.abs(targetRatio - nextRatio) < 0.001 && Math.abs(velocityRef.current) < 0.001

        if (isSettled) {
          velocityRef.current = 0
          frameRef.current = null
          return targetRatio
        }

        frameRef.current = requestAnimationFrame(tick)
        return clamp(nextRatio, 0, 1)
      })
    }

    frameRef.current = requestAnimationFrame(tick)

    return (): void => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [reducedMotion, targetRatio])

  const { centerX, centerY, radius } = useMemo(
    (): { centerX: number; centerY: number; radius: number } => ({
      centerX: width / 2,
      centerY: height * 0.72,
      radius: Math.min(width * 0.38, height * 0.54),
    }),
    [height, width],
  )

  const renderedRatio = reducedMotion ? targetRatio : animatedRatio
  const sweepAngle = GAUGE_END_ANGLE - GAUGE_START_ANGLE
  const arcEndAngle = GAUGE_START_ANGLE + sweepAngle * renderedRatio
  const backgroundArcPath = describeArc(
    centerX,
    centerY,
    radius,
    GAUGE_START_ANGLE,
    GAUGE_END_ANGLE,
  )
  const valueArcPath = describeArc(centerX, centerY, radius, GAUGE_START_ANGLE, arcEndAngle)

  return (
    <div className="cei-viz-frame" data-testid="gauge-chart">
      <svg
        aria-label={`${label} gauge`}
        height={height}
        role="img"
        viewBox={`0 0 ${width.toString()} ${height.toString()}`}
        width={width}
      >
        <path
          d={backgroundArcPath}
          fill="none"
          stroke={VIZ_THEME.gaugeTrack}
          strokeLinecap="round"
          strokeWidth={16}
        />
        <path
          d={valueArcPath}
          data-progress={renderedRatio.toFixed(3)}
          fill="none"
          stroke={gaugeColor}
          strokeLinecap="round"
          strokeWidth={16}
        />
        <text className="cei-viz-gauge-label" textAnchor="middle" x={centerX} y={height * 0.12}>
          {label}
        </text>
        <text
          className="cei-viz-gauge-value"
          textAnchor="middle"
          x={centerX}
          y={centerY - radius * 0.05}
        >
          {`${percentage.toString()}%`}
        </text>
        <text
          className="cei-viz-gauge-subtext"
          textAnchor="middle"
          x={centerX}
          y={centerY + radius * 0.22}
        >
          {`${boundedValue.toFixed(0)} / ${normalizedMax.toFixed(0)}`}
        </text>
      </svg>
    </div>
  )
}
