const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

const shortDateWithYearFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
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
