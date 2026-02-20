import type { CSSProperties } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

/**
 * Shared layout for admin routes with a persistent sidebar.
 */
export function AdminLayout(): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--color-bg-base, #0f1117)',
      }}
    >
      <nav
        style={{
          width: '220px',
          flexShrink: 0,
          borderRight: '1px solid var(--color-border, rgba(255,255,255,0.08))',
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div
          style={{
            padding: '0 16px',
            marginBottom: '8px',
          }}
        >
          <Link
            to="/"
            style={{
              color: 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '13px',
            }}
          >
            ← Back
          </Link>
        </div>
        <div
          style={{
            padding: '0 16px 16px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: 'var(--color-text-muted, rgba(255,255,255,0.4))',
            textTransform: 'uppercase',
          }}
        >
          Administration
        </div>
        <AdminNavLink to="/admin" end label="Overview" icon="⚙️" />
        <AdminNavLink to="/admin/composer-config" label="Composer Config" icon="🧩" />
        <AdminNavLink to="/admin/integrations" label="Integrations" icon="🔗" />
        <AdminNavLink to="/admin/feedback" label="Feedback" icon="💬" />
      </nav>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  )
}

interface AdminNavLinkProps {
  to: string
  label: string
  icon: string
  end?: boolean
}

function AdminNavLink({ to, label, icon, end }: AdminNavLinkProps): JSX.Element {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }): CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 16px',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: isActive ? 600 : 400,
        color: isActive
          ? 'var(--color-text-primary, #fff)'
          : 'var(--color-text-secondary, rgba(255,255,255,0.6))',
        background: isActive ? 'var(--color-surface-hover, rgba(255,255,255,0.06))' : 'transparent',
        borderRadius: '6px',
        margin: '0 8px',
        transition: 'all 0.15s ease',
      })}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}
