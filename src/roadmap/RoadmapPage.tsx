import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { fetchRoadmapItems } from './RoadmapFetch'
import { RoadmapColumn } from './RoadmapColumn'
import { RoadmapCategorySection } from './RoadmapCategorySection'
import type { RoadmapCategory, RoadmapHorizon, RoadmapItem } from './types'
import { CATEGORY_LABELS } from './types'
import './roadmap.css'

type LoadState = 'loading' | 'loaded' | 'error'

export function RoadmapPage(): JSX.Element {
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()
  const [items, setItems] = useState<RoadmapItem[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)

  const loadRoadmap = useCallback(async () => {
    try {
      setLoadState('loading')
      const token = await getAccessToken()
      if (!token) {
        setError('Authentication required')
        setLoadState('error')
        return
      }
      const response = await fetchRoadmapItems(token)
      setItems(response.items)
      setLoadState('loaded')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roadmap')
      setLoadState('error')
    }
  }, [getAccessToken])

  useEffect(() => {
    void loadRoadmap()
  }, [loadRoadmap])

  const shipped = items.filter((i) => i.status === 'shipped')
  const byHorizon = (horizon: RoadmapHorizon) =>
    items.filter((i) => i.horizon === horizon && i.status !== 'shipped')
  const byCategory = (category: RoadmapCategory) => items.filter((i) => i.category === category)

  const categories = (Object.keys(CATEGORY_LABELS) as RoadmapCategory[]).filter(
    (cat) => byCategory(cat).length > 0,
  )

  return (
    <div className="roadmap-page">
      <div className="roadmap-page-header">
        <button className="roadmap-back-button" onClick={() => navigate('/')} type="button">
          ← Back to Command Center
        </button>
      </div>

      <div className="roadmap-page-content">
        <h1 className="roadmap-page-title">Product Roadmap</h1>
        <p className="roadmap-page-subtitle">
          See what we&apos;re building and where CEI is heading.
        </p>

        {loadState === 'loading' && (
          <div className="roadmap-loading" role="status" aria-live="polite">
            <span className="roadmap-spinner" aria-hidden="true" />
            <p>Loading roadmap...</p>
          </div>
        )}

        {loadState === 'error' && (
          <div className="roadmap-error" role="alert">
            <p>{error}</p>
            <button
              className="roadmap-retry-button"
              onClick={() => void loadRoadmap()}
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        {loadState === 'loaded' && (
          <>
            {shipped.length > 0 && (
              <section className="roadmap-shipped-section">
                <h2 className="roadmap-section-title">Recently Shipped</h2>
                <div className="roadmap-shipped-grid">
                  {shipped.map((item) => (
                    <div key={item.id} className="roadmap-shipped-item">
                      <span className="roadmap-shipped-icon">✅</span>
                      <div>
                        <strong>{item.title}</strong>
                        <p className="roadmap-shipped-desc">{item.description}</p>
                        {item.shipped_at && (
                          <span className="roadmap-shipped-date">
                            Shipped {formatShippedDate(item.shipped_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="roadmap-columns-section">
              <RoadmapColumn horizon="now" items={byHorizon('now')} />
              <RoadmapColumn horizon="next" items={byHorizon('next')} />
              <RoadmapColumn horizon="later" items={byHorizon('later')} />
            </section>

            {categories.length > 0 && (
              <section className="roadmap-categories-section">
                <h2 className="roadmap-section-title">By Category</h2>
                <div className="roadmap-categories-grid">
                  {categories.map((category) => (
                    <RoadmapCategorySection
                      key={category}
                      category={category}
                      items={byCategory(category)}
                    />
                  ))}
                </div>
              </section>
            )}

            <footer className="roadmap-disclaimer">
              This roadmap reflects our current plans and priorities. Items may shift as we learn
              from user feedback and evolving requirements.
            </footer>
          </>
        )}
      </div>
    </div>
  )
}

function formatShippedDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00Z')
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
  } catch {
    return dateStr
  }
}
