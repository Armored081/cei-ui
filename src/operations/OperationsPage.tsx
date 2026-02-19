/* ------------------------------------------------------------------ */
/*  Operations Hub — Main page                                        */
/* ------------------------------------------------------------------ */

import { useCallback, useMemo, useState } from 'react'

import type {
  OperatingProcess,
  OperatingProcedure,
  OperationsTab,
  SharedService,
} from './types'
import {
  MATURITY_LABELS,
  SERVICE_CATEGORY_ICONS,
} from './types'
import { useOperations } from './useOperations'
import './operations.css'

/* ── Helpers ────────────────────────────────────────────────────── */

function formatCategory(raw: string): string {
  return raw
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function matchesSearch(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase())
}

/* ── Sub-components ─────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }): JSX.Element {
  return (
    <span className="ops-status" data-status={status}>
      <span className="ops-status-dot" />
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function MaturityGauge({ level }: { level: number }): JSX.Element {
  return (
    <span className="ops-maturity">
      <span className="ops-maturity-bar">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            className="ops-maturity-segment"
            data-filled={i <= level ? 'true' : 'false'}
            key={i}
          />
        ))}
      </span>
      <span className="ops-maturity-label">{MATURITY_LABELS[level] || `L${level}`}</span>
    </span>
  )
}

function RiskBadge({ level }: { level: string }): JSX.Element {
  return (
    <span className="ops-risk" data-level={level.toLowerCase()}>
      {level}
    </span>
  )
}

/* ── Service card ───────────────────────────────────────────────── */

function ServiceCard({ service }: { service: SharedService }): JSX.Element {
  const icon = SERVICE_CATEGORY_ICONS[service.service_category] || '🔧'
  const slaTarget = service.sla_availability_target
  const slaWarning = slaTarget !== undefined && slaTarget < 99.5

  return (
    <article className="ops-svc-card">
      <div className="ops-svc-card-header">
        <span className="ops-svc-card-icon">{icon}</span>
        <div>
          <h3 className="ops-svc-card-title">{service.service_name}</h3>
          <span className="ops-svc-card-category">{formatCategory(service.service_category)}</span>
        </div>
      </div>
      {service.description ? (
        <p className="ops-svc-card-desc">{service.description}</p>
      ) : null}
      <div className="ops-svc-card-footer">
        <StatusBadge status={service.status} />
        {service.service_owner ? (
          <span className="ops-svc-card-meta">
            <span>👤</span> {service.service_owner}
          </span>
        ) : null}
        {slaTarget !== undefined ? (
          <span className="ops-svc-card-sla" data-warning={slaWarning ? 'true' : 'false'}>
            {slaTarget}% SLA
          </span>
        ) : null}
      </div>
    </article>
  )
}

/* ── Procedure card ─────────────────────────────────────────────── */

function ProcedureCard({
  procedure,
  processName,
}: {
  procedure: OperatingProcedure
  processName?: string
}): JSX.Element {
  return (
    <article className="ops-proc-card" data-maturity={procedure.maturity_level}>
      <div className="ops-proc-card-header">
        <h3 className="ops-proc-card-title">{procedure.procedure_name}</h3>
        <span className="ops-proc-card-version">v{procedure.version}</span>
      </div>
      {procedure.scope_description ? (
        <p className="ops-proc-card-scope">{procedure.scope_description}</p>
      ) : null}
      <div className="ops-proc-card-tags">
        {processName ? (
          <span className="ops-proc-card-tag" data-type="process">
            {processName}
          </span>
        ) : null}
        {procedure.audience ? (
          <span className="ops-proc-card-tag" data-type="audience">
            {procedure.audience}
          </span>
        ) : null}
      </div>
      <div className="ops-proc-card-footer">
        <StatusBadge status={procedure.status} />
        <MaturityGauge level={procedure.maturity_level} />
        {procedure.next_review_date ? (
          <span className="ops-svc-card-meta" style={{ marginLeft: 'auto' }}>
            Review: {formatDate(procedure.next_review_date)}
          </span>
        ) : null}
      </div>
    </article>
  )
}

/* ── Process group accordion ────────────────────────────────────── */

function ProcessGroup({
  process,
  procedures,
  defaultOpen,
}: {
  process: OperatingProcess
  procedures: OperatingProcedure[]
  defaultOpen: boolean
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="ops-process-group">
      <button
        className="ops-process-group-header"
        onClick={(): void => setOpen(!open)}
        type="button"
      >
        <span className="ops-process-group-chevron" data-open={open ? 'true' : 'false'}>
          ▸
        </span>
        <span className="ops-process-group-level">L{process.process_level}</span>
        <span className="ops-process-group-name">{process.process_name}</span>
        <RiskBadge level={process.risk_rating} />
        <span className="ops-process-group-count">
          {procedures.length} SOP{procedures.length !== 1 ? 's' : ''}
        </span>
      </button>
      {open ? (
        <div className="ops-process-group-body">
          <div className="ops-grid">
            {procedures.map((proc) => (
              <ProcedureCard
                key={proc.id}
                procedure={proc}
                processName={process.process_name}
              />
            ))}
          </div>
          {procedures.length === 0 ? (
            <p className="ops-empty">No procedures linked to this process yet.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────────────── */

export function OperationsPage(): JSX.Element {
  const { services, processes, procedures, loading, error, refresh } = useOperations()
  const [activeTab, setActiveTab] = useState<OperationsTab>('services')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [domainFilter, setDomainFilter] = useState<string | null>(null)

  /* ── Derived data ────────────────────────────────────────────── */

  const filteredServices = useMemo(() => {
    let result = services
    if (search) {
      result = result.filter(
        (s) =>
          matchesSearch(s.service_name, search) ||
          matchesSearch(s.service_category, search) ||
          matchesSearch(s.description || '', search),
      )
    }
    if (categoryFilter) {
      result = result.filter((s) => s.service_category === categoryFilter)
    }
    return result
  }, [services, search, categoryFilter])

  const serviceCategories = useMemo(() => {
    const cats = new Set(services.map((s) => s.service_category))
    return Array.from(cats).sort()
  }, [services])

  const filteredProcessesWithProcedures = useMemo(() => {
    let procs = processes.filter((p) => p.process_level <= 2)
    if (domainFilter) {
      procs = procs.filter((p) => p.domain === domainFilter)
    }

    return procs
      .map((process) => {
        let matching = procedures.filter((pr) => pr.process_id === process.id)
        if (search) {
          matching = matching.filter(
            (pr) =>
              matchesSearch(pr.procedure_name, search) ||
              matchesSearch(pr.scope_description || '', search) ||
              matchesSearch(pr.audience || '', search),
          )
        }
        return { process, procedures: matching }
      })
      .filter((g) => !search || g.procedures.length > 0)
      .sort((a, b) => a.process.process_level - b.process.process_level || a.process.process_name.localeCompare(b.process.process_name))
  }, [processes, procedures, domainFilter, search])

  const processDomains = useMemo(() => {
    const doms = new Set(processes.map((p) => p.domain))
    return Array.from(doms).sort()
  }, [processes])

  /* ── Stats ───────────────────────────────────────────────────── */

  const activeServiceCount = services.filter((s) => s.status === 'active').length
  const avgMaturity =
    procedures.length > 0
      ? (procedures.reduce((sum, p) => sum + p.maturity_level, 0) / procedures.length).toFixed(1)
      : '—'

  const onToggleCategory = useCallback(
    (cat: string) => {
      setCategoryFilter((prev) => (prev === cat ? null : cat))
    },
    [],
  )

  const onToggleDomain = useCallback(
    (dom: string) => {
      setDomainFilter((prev) => (prev === dom ? null : dom))
    },
    [],
  )

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <div className="ops-page">
      <div className="ops-header">
        <div>
          <h1 className="ops-header-title">Operations Hub</h1>
          <p className="ops-header-subtitle">
            Enterprise shared services, processes &amp; operating procedures
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="ops-stats">
        <div className="ops-stat">
          <span className="ops-stat-value">{services.length}</span>
          <span className="ops-stat-label">Services</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-value">{activeServiceCount}</span>
          <span className="ops-stat-label">Active</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-value">{processes.length}</span>
          <span className="ops-stat-label">Processes</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-value">{procedures.length}</span>
          <span className="ops-stat-label">Procedures</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-value">{avgMaturity}</span>
          <span className="ops-stat-label">Avg Maturity</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="ops-tabs" role="tablist">
        <button
          className="ops-tab"
          data-active={activeTab === 'services' ? 'true' : 'false'}
          onClick={(): void => setActiveTab('services')}
          role="tab"
          type="button"
        >
          Shared Services
          <span className="ops-tab-count">{services.length}</span>
        </button>
        <button
          className="ops-tab"
          data-active={activeTab === 'procedures' ? 'true' : 'false'}
          onClick={(): void => setActiveTab('procedures')}
          role="tab"
          type="button"
        >
          Operating Procedures
          <span className="ops-tab-count">{procedures.length}</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="ops-toolbar">
        <div className="ops-search-wrapper">
          <span className="ops-search-icon">🔎</span>
          <input
            className="ops-search"
            onChange={(e): void => setSearch(e.target.value)}
            placeholder={
              activeTab === 'services'
                ? 'Search services...'
                : 'Search procedures...'
            }
            type="text"
            value={search}
          />
        </div>

        {activeTab === 'services'
          ? serviceCategories.map((cat) => (
              <button
                className="ops-filter-chip"
                data-active={categoryFilter === cat ? 'true' : 'false'}
                key={cat}
                onClick={(): void => onToggleCategory(cat)}
                type="button"
              >
                {SERVICE_CATEGORY_ICONS[cat] || '🔧'} {formatCategory(cat)}
              </button>
            ))
          : processDomains.map((dom) => (
              <button
                className="ops-filter-chip"
                data-active={domainFilter === dom ? 'true' : 'false'}
                key={dom}
                onClick={(): void => onToggleDomain(dom)}
                type="button"
              >
                {formatCategory(dom)}
              </button>
            ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="ops-loading">
          <span className="ops-spinner" />
          Loading operations data...
        </div>
      ) : error ? (
        <div className="ops-error">
          <p>{error}</p>
          <button className="ops-error-retry" onClick={refresh} type="button">
            Retry
          </button>
        </div>
      ) : activeTab === 'services' ? (
        filteredServices.length === 0 ? (
          <p className="ops-empty">No services match your filters.</p>
        ) : (
          <div className="ops-grid">
            {filteredServices.map((svc) => (
              <ServiceCard key={svc.id} service={svc} />
            ))}
          </div>
        )
      ) : filteredProcessesWithProcedures.length === 0 ? (
        <p className="ops-empty">No procedures match your filters.</p>
      ) : (
        filteredProcessesWithProcedures.map(({ process, procedures: procs }) => (
          <ProcessGroup
            defaultOpen={procs.length > 0}
            key={process.id}
            process={process}
            procedures={procs}
          />
        ))
      )}
    </div>
  )
}
