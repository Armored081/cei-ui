const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

const shortDateWithYearFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const longRelativeFormatter = new Intl.RelativeTimeFormat('en-US', {
  numeric: 'always',
})

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function isYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  return isSameDay(date, yesterday)
}

/**
 * Formats an ISO timestamp into a compact relative label for thread cards.
 */
export function relativeTime(isoDate: string): string {
  const targetDate = new Date(isoDate)

  if (Number.isNaN(targetDate.getTime())) {
    return ''
  }

  const now = new Date()
  const diffMilliseconds = Math.max(0, now.getTime() - targetDate.getTime())
  const diffSeconds = Math.floor(diffMilliseconds / 1000)

  if (diffSeconds < 60) {
    return 'Just now'
  }

  const diffMinutes = Math.floor(diffSeconds / 60)

  if (diffMinutes < 60) {
    return `${diffMinutes.toString()}m ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours.toString()}h ago`
  }

  if (isYesterday(targetDate, now)) {
    return 'Yesterday'
  }

  if (targetDate.getFullYear() === now.getFullYear()) {
    return shortDateFormatter.format(targetDate)
  }

  return shortDateWithYearFormatter.format(targetDate)
}

/**
 * Formats an ISO timestamp into human-readable relative text.
 */
export function formatRelativeTime(isoDate: string): string {
  const targetDate = new Date(isoDate)

  if (Number.isNaN(targetDate.getTime())) {
    return ''
  }

  const diffMilliseconds = targetDate.getTime() - Date.now()
  const diffSeconds = Math.round(diffMilliseconds / 1000)
  const absoluteSeconds = Math.abs(diffSeconds)

  if (absoluteSeconds < 60) {
    return 'just now'
  }

  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) {
    return longRelativeFormatter.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return longRelativeFormatter.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 30) {
    return longRelativeFormatter.format(diffDays, 'day')
  }

  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) {
    return longRelativeFormatter.format(diffMonths, 'month')
  }

  const diffYears = Math.round(diffMonths / 12)
  return longRelativeFormatter.format(diffYears, 'year')
}
