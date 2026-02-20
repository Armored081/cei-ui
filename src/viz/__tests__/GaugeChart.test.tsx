import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GaugeChart } from '../GaugeChart.js'

afterEach((): void => {
  vi.restoreAllMocks()
})

function valueArc(container: HTMLElement): SVGPathElement {
  const paths = container.querySelectorAll('path')
  const arc = paths[1]

  if (!arc) {
    throw new Error('Expected value arc path to exist')
  }

  return arc
}

describe('GaugeChart', (): void => {
  it('renders an SVG gauge arc and percentage', (): void => {
    const { container } = render(<GaugeChart label="Risk" max={100} severity="high" value={45} />)

    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(screen.getByText('45 / 100')).toBeInTheDocument()
    expect(valueArc(container)).toHaveAttribute('stroke', 'var(--viz-high, var(--severity-high))')
  })

  it.each([
    ['critical', 'var(--viz-critical, var(--severity-critical))'],
    ['high', 'var(--viz-high, var(--severity-high))'],
    ['medium', 'var(--viz-medium, var(--severity-medium))'],
    ['low', 'var(--viz-low, var(--chart-series-3))'],
  ] as const)('applies severity color for %s', (severity, color): void => {
    const { container } = render(
      <GaugeChart label="Score" max={100} severity={severity} value={50} />,
    )

    expect(valueArc(container)).toHaveAttribute('stroke', color)
  })

  it('handles zero values', (): void => {
    render(<GaugeChart label="Empty" max={100} value={0} />)

    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0 / 100')).toBeInTheDocument()
  })

  it('clamps values above max', (): void => {
    render(<GaugeChart label="Over" max={100} value={130} />)

    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('100 / 100')).toBeInTheDocument()
  })

  it('animates progress on value change', (): void => {
    const frameCallbacks: FrameRequestCallback[] = []

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      (callback: FrameRequestCallback) => {
        frameCallbacks.push(callback)
        return frameCallbacks.length
      },
    )

    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((): void => {})

    const { container, rerender } = render(<GaugeChart label="Animated" max={100} value={10} />)
    const arc = valueArc(container)
    const startProgress = Number(arc.getAttribute('data-progress') || '0')

    rerender(<GaugeChart label="Animated" max={100} value={80} />)

    act((): void => {
      for (let index = 0; index < 20; index += 1) {
        const callback = frameCallbacks.shift()
        if (!callback) {
          break
        }
        callback(performance.now())
      }
    })

    const nextProgress = Number(arc.getAttribute('data-progress') || '0')

    expect(nextProgress).toBeGreaterThan(startProgress)
  })
})
