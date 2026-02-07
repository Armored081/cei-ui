import type { ReactNode } from 'react'

interface SectionCardProps {
  children: ReactNode
  title: string
}

export function SectionCard({ children, title }: SectionCardProps): JSX.Element {
  return (
    <section
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--bg-panel-muted)',
        boxShadow: 'var(--shadow-panel)',
        padding: 'var(--space-6)',
      }}
    >
      <h2
        style={{
          fontSize: '1rem',
          marginTop: 0,
          marginBottom: 'var(--space-4)',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}
