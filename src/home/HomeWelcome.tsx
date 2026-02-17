/**
 * Resolves a time-of-day greeting from local clock time.
 */
function greetingFromDate(currentDate: Date): string {
  const currentHour = currentDate.getHours()

  if (currentHour < 12) {
    return 'Good morning'
  }

  if (currentHour < 18) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

/**
 * Formats the current date for the home page welcome banner.
 */
function formatCurrentDate(currentDate: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(currentDate)
}

/**
 * Welcome banner shown at the top of the home page.
 */
export function HomeWelcome(): JSX.Element {
  const currentDate = new Date()

  return (
    <section className="cei-home-welcome" aria-label="Home welcome">
      <h1 className="cei-home-welcome-title">{greetingFromDate(currentDate)}</h1>
      <p className="cei-home-welcome-date">{formatCurrentDate(currentDate)}</p>
    </section>
  )
}
