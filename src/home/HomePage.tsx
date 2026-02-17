import { useAuth } from '../auth/AuthProvider'
import { TopBar } from '../primitives/TopBar'
import { AttentionSection } from './AttentionSection'
import { HomeWelcome } from './HomeWelcome'
import { MetricsGlance } from './MetricsGlance'
import { QuickStartGrid } from './QuickStartGrid'
import type { HomeAgenticItem, HomeMetricItem } from './mockFeedData'
import { getMockFeedData } from './mockFeedData'
import './home.css'

interface HomePageProps {
  agenticItems?: HomeAgenticItem[]
  metricItems?: HomeMetricItem[]
}

/**
 * Top-level home page shell with welcome, attention, metrics, and quick-start sections.
 */
export function HomePage({ agenticItems, metricItems }: HomePageProps): JSX.Element {
  const { logout, userEmail } = useAuth()
  const mockFeed = getMockFeedData()

  const resolvedAgenticItems = agenticItems === undefined ? mockFeed.agenticItems : agenticItems
  const resolvedMetricItems = metricItems === undefined ? mockFeed.metricItems : metricItems

  return (
    <div className="cei-home-page">
      <TopBar userEmail={userEmail} onLogout={(): void => void logout()} />
      <main className="cei-home-main" aria-label="Home">
        <div className="cei-home-main-content">
          <HomeWelcome />
          <AttentionSection items={resolvedAgenticItems} />
          <MetricsGlance items={resolvedMetricItems} />
          <QuickStartGrid />
        </div>
      </main>
    </div>
  )
}
