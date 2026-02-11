import './tab-bar.css'

export interface TabItem {
  id: string
  label: string
  badge?: number
}

interface TabBarProps {
  tabs: TabItem[]
  activeTabId: string
  onTabChange: (tabId: string) => void
}

export function TabBar({ tabs, activeTabId, onTabChange }: TabBarProps): JSX.Element {
  return (
    <div className="cei-tab-bar" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`cei-tab-bar-item${activeTabId === tab.id ? ' cei-tab-bar-item-active' : ''}`}
          onClick={(): void => onTabChange(tab.id)}
          role="tab"
          aria-selected={activeTabId === tab.id}
          type="button"
        >
          <span>{tab.label}</span>
          {tab.badge !== undefined && tab.badge > 0 ? (
            <span className="cei-tab-bar-badge">{tab.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
