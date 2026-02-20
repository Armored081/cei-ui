import { Link } from 'react-router-dom'

/**
 * Landing page for the admin section.
 */
export function AdminDashboard(): JSX.Element {
  return (
    <div style={{ padding: '32px 40px' }}>
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--color-text-primary, #fff)',
          marginBottom: '8px',
        }}
      >
        Administration
      </h1>
      <p
        style={{
          color: 'var(--color-text-secondary, rgba(255,255,255,0.6))',
          marginBottom: '32px',
        }}
      >
        Manage integrations, feedback, composer rollout, and product roadmap.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        <AdminCard
          title="Composer Config"
          description="Toggle prompt composer version by agent"
          icon="🧩"
          href="/admin/composer-config"
        />
        <AdminCard
          title="Integrations"
          description="Configure data sources and system connections"
          icon="🔗"
          href="/admin/integrations"
        />
        <AdminCard
          title="Feedback"
          description="Review user feedback and feature requests"
          icon="💬"
          href="/admin/feedback"
        />
        <AdminCard
          title="Roadmap"
          description="Manage product roadmap and upcoming features"
          icon="🗺️"
          href="/admin/roadmap"
        />
      </div>
    </div>
  )
}

interface AdminCardProps {
  title: string
  description: string
  icon: string
  href: string
}

function AdminCard({ title, description, icon, href }: AdminCardProps): JSX.Element {
  return (
    <Link
      to={href}
      style={{
        display: 'block',
        padding: '24px',
        background: 'var(--color-surface, rgba(255,255,255,0.04))',
        border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
        borderRadius: '12px',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '12px' }}>{icon}</div>
      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--color-text-primary, #fff)',
          marginBottom: '6px',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary, rgba(255,255,255,0.6))',
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </Link>
  )
}
