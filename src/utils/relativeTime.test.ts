import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { formatRelativeTime, relativeTime } from './relativeTime'

describe('relativeTime', (): void => {
  beforeEach((): void => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-12T15:00:00.000Z'))
  })

  afterEach((): void => {
    vi.useRealTimers()
  })

  it('formats recent times as just now/minutes/hours', (): void => {
    expect(relativeTime('2026-02-12T14:59:40.000Z')).toBe('Just now')
    expect(relativeTime('2026-02-12T14:57:00.000Z')).toBe('3m ago')
    expect(relativeTime('2026-02-12T13:00:00.000Z')).toBe('2h ago')
  })

  it('formats previous-day and calendar dates', (): void => {
    expect(relativeTime('2026-02-11T13:00:00.000Z')).toBe('Yesterday')
    expect(relativeTime('2026-02-10T12:00:00.000Z')).toBe('Feb 10')
    expect(relativeTime('2025-12-25T12:00:00.000Z')).toBe('Dec 25, 2025')
  })

  it('returns empty string for invalid dates', (): void => {
    expect(relativeTime('not-a-date')).toBe('')
  })

  it('formats long-form relative labels for dashboard cards', (): void => {
    expect(formatRelativeTime('2026-02-12T14:59:45.000Z')).toBe('just now')
    expect(formatRelativeTime('2026-02-12T14:00:00.000Z')).toBe('1 hour ago')
    expect(formatRelativeTime('2026-02-09T15:00:00.000Z')).toBe('3 days ago')
  })
})
