import { useNavigate } from 'react-router-dom'

interface QuickStartItem {
  description: string
  icon: string
  id: string
  title: string
}

const QUICK_START_ITEMS: QuickStartItem[] = [
  {
    id: 'quick-start-risk-assessment',
    icon: '🔍',
    title: 'Risk Assessment',
    description: 'Evaluate cyber risk posture against frameworks',
  },
  {
    id: 'quick-start-compliance-gap',
    icon: '📋',
    title: 'Compliance Gap',
    description: 'Identify regulatory gaps and remediation actions',
  },
  {
    id: 'quick-start-control-review',
    icon: '🛡️',
    title: 'Control Review',
    description: 'Assess control maturity and attestation health',
  },
  {
    id: 'quick-start-dr-readiness',
    icon: '⚡',
    title: 'DR Readiness',
    description: 'Assess disaster recovery readiness',
  },
]

/**
 * Renders quick-start cards that route users into chat workflows.
 */
export function QuickStartGrid(): JSX.Element {
  const navigate = useNavigate()

  return (
    <section className="cei-home-section" aria-labelledby="cei-home-quick-start-title">
      <h2 className="cei-home-section-title" id="cei-home-quick-start-title">
        Quick Start
      </h2>

      <div className="cei-home-quickstart-grid">
        {QUICK_START_ITEMS.map(
          (item): JSX.Element => (
            <button
              className="cei-home-card cei-home-quickstart-card"
              key={item.id}
              onClick={(): void => navigate('/chat')}
              type="button"
            >
              <span aria-hidden="true" className="cei-home-quickstart-icon">
                {item.icon}
              </span>
              <h3 className="cei-home-card-title">{item.title}</h3>
              <p className="cei-home-card-summary">{item.description}</p>
            </button>
          ),
        )}
      </div>
    </section>
  )
}
