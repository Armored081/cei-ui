import { useMemo, useState, type ReactNode } from 'react'

import type { StructuredBlock } from '../../agent/types'
import type { Artifact } from '../../hooks/useChatEngine'
import type { ArtifactTypeDefinition } from '../ArtifactRegistry'
import './artifact-renderers.css'

type AssessmentDetailBlockData = Extract<StructuredBlock, { kind: 'assessment-detail' }>
type AssessmentDetail = AssessmentDetailBlockData['assessment']
type AssessmentSection = AssessmentDetail['sections'][number]
type AssessmentControl = AssessmentSection['controls'][number]

interface FlattenedControl extends AssessmentControl {
  sectionName: string
}

interface AssessmentDetailContentProps {
  artifact: Artifact & { block: AssessmentDetailBlockData }
  mode: 'expanded' | 'fullscreen'
}

interface AssessmentSectionCardProps {
  children: ReactNode
  title: string
}

function isAssessmentDetailArtifact(
  artifact: Artifact,
): artifact is Artifact & { block: AssessmentDetailBlockData } {
  return artifact.block.kind === 'assessment-detail'
}

function formatAssessmentDate(updatedAt: string): string {
  const parsedDate = new Date(updatedAt)

  if (Number.isNaN(parsedDate.getTime())) {
    return updatedAt
  }

  return parsedDate.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function toAssessmentStatusLabel(status: string): string {
  if (status === 'in-progress') {
    return 'In progress'
  }

  return status.charAt(0).toUpperCase() + status.slice(1)
}

function toAssessmentStatusClassName(status: string): string {
  if (status === 'complete') {
    return 'cei-assessment-artifact-status cei-assessment-artifact-status-complete'
  }

  if (status === 'in-progress') {
    return 'cei-assessment-artifact-status cei-assessment-artifact-status-in-progress'
  }

  if (status === 'approved') {
    return 'cei-assessment-artifact-status cei-assessment-artifact-status-approved'
  }

  if (status === 'archived') {
    return 'cei-assessment-artifact-status cei-assessment-artifact-status-archived'
  }

  if (status === 'draft') {
    return 'cei-assessment-artifact-status cei-assessment-artifact-status-draft'
  }

  if (status === 'mapped') {
    return 'cei-assessment-artifact-status cei-assessment-artifact-status-mapped'
  }

  if (status === 'partial') {
    return 'cei-assessment-artifact-status cei-assessment-artifact-status-partial'
  }

  if (status === 'gap') {
    return 'cei-assessment-artifact-status cei-assessment-artifact-status-gap'
  }

  return 'cei-assessment-artifact-status cei-assessment-artifact-status-generic'
}

function toScoreClassName(score: number): string {
  if (score >= 85) {
    return 'cei-assessment-artifact-score cei-assessment-artifact-score-high'
  }

  if (score >= 70) {
    return 'cei-assessment-artifact-score cei-assessment-artifact-score-medium'
  }

  return 'cei-assessment-artifact-score cei-assessment-artifact-score-low'
}

function AssessmentSectionCard({ children, title }: AssessmentSectionCardProps): JSX.Element {
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

function flattenControls(assessment: AssessmentDetail): FlattenedControl[] {
  return assessment.sections.flatMap((section): FlattenedControl[] => {
    return section.controls.map(
      (control): FlattenedControl => ({
        ...control,
        sectionName: section.name,
      }),
    )
  })
}

function countSectionStatuses(section: AssessmentSection): {
  gap: number
  mapped: number
  partial: number
} {
  return section.controls.reduce(
    (totals, control) => {
      if (control.status === 'mapped') {
        return {
          ...totals,
          mapped: totals.mapped + 1,
        }
      }

      if (control.status === 'partial') {
        return {
          ...totals,
          partial: totals.partial + 1,
        }
      }

      if (control.status === 'gap') {
        return {
          ...totals,
          gap: totals.gap + 1,
        }
      }

      return totals
    },
    {
      gap: 0,
      mapped: 0,
      partial: 0,
    },
  )
}

function AssessmentSummaryCards({
  assessment,
  title,
}: {
  assessment: AssessmentDetail
  title: string
}): JSX.Element {
  return (
    <div className="cei-assessment-detail-summary">
      <div className="cei-artifact-inline-header">
        <span aria-hidden="true" className="cei-artifact-inline-icon">
          {'\u{1F4DC}'}
        </span>
        <span className="cei-artifact-inline-kind">Assessment detail</span>
      </div>
      <p className="cei-artifact-inline-title">{title}</p>
      <div className="cei-assessment-detail-summary-grid">
        <div className="cei-assessment-detail-summary-card">
          <p className="cei-assessment-detail-summary-label">Name</p>
          <p className="cei-assessment-detail-summary-value">{assessment.name}</p>
        </div>
        <div className="cei-assessment-detail-summary-card">
          <p className="cei-assessment-detail-summary-label">Framework</p>
          <p className="cei-assessment-detail-summary-value">{assessment.framework}</p>
        </div>
        <div className="cei-assessment-detail-summary-card">
          <p className="cei-assessment-detail-summary-label">Score</p>
          <p
            className={`cei-assessment-detail-summary-value ${toScoreClassName(assessment.score)}`}
          >
            {assessment.score.toFixed(1)}
          </p>
        </div>
        <div className="cei-assessment-detail-summary-card">
          <p className="cei-assessment-detail-summary-label">Status</p>
          <p className="cei-assessment-detail-summary-value">
            <span className={toAssessmentStatusClassName(assessment.status)}>
              {toAssessmentStatusLabel(assessment.status)}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

function AssessmentDetailContent({ artifact, mode }: AssessmentDetailContentProps): JSX.Element {
  const { assessment } = artifact.block
  const [query, setQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  const [selectedControlId, setSelectedControlId] = useState<string>('')

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const allControls = useMemo((): FlattenedControl[] => flattenControls(assessment), [assessment])

  const statusOptions = useMemo((): string[] => {
    return Array.from(new Set(allControls.map((control): string => control.status))).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    )
  }, [allControls])

  const filteredControls = useMemo((): FlattenedControl[] => {
    return allControls.filter((control): boolean => {
      if (statusFilter !== 'all' && control.status !== statusFilter) {
        return false
      }

      if (sectionFilter !== 'all' && control.sectionName !== sectionFilter) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return (
        control.id.toLocaleLowerCase().includes(normalizedQuery) ||
        control.description.toLocaleLowerCase().includes(normalizedQuery) ||
        control.sectionName.toLocaleLowerCase().includes(normalizedQuery) ||
        control.status.toLocaleLowerCase().includes(normalizedQuery) ||
        (control.gap || '').toLocaleLowerCase().includes(normalizedQuery) ||
        (control.recommendation || '').toLocaleLowerCase().includes(normalizedQuery)
      )
    })
  }, [allControls, normalizedQuery, sectionFilter, statusFilter])

  const selectedControl = useMemo((): FlattenedControl | null => {
    return filteredControls.find((control): boolean => control.id === selectedControlId) || null
  }, [filteredControls, selectedControlId])

  return (
    <div
      className={`cei-assessment-detail-artifact-shell cei-assessment-detail-artifact-shell-${mode}`}
    >
      <AssessmentSummaryCards assessment={assessment} title={artifact.title} />

      <div className="cei-assessment-detail-meta-row">
        <span className="cei-artifact-inline-preview">Assessment ID: {assessment.id}</span>
        <span className="cei-artifact-inline-preview">
          Updated: {formatAssessmentDate(assessment.updatedAt)}
        </span>
      </div>

      <section className="cei-assessment-detail-sections" aria-label="Assessment sections">
        {assessment.sections.map((section) => {
          const totals = countSectionStatuses(section)

          return (
            <AssessmentSectionCard key={section.name} title={section.name}>
              <div className="cei-assessment-detail-section-card-content">
                <p className="cei-assessment-detail-summary-label">Section score</p>
                <p
                  className={`cei-assessment-detail-summary-value ${toScoreClassName(section.score)}`}
                >
                  {section.score.toFixed(1)}
                </p>
                <p className="cei-artifact-inline-preview">
                  Controls: {section.controls.length.toString()} • Mapped:{' '}
                  {totals.mapped.toString()} • Partial: {totals.partial.toString()} • Gap:{' '}
                  {totals.gap.toString()}
                </p>
              </div>
            </AssessmentSectionCard>
          )
        })}
      </section>

      <section className="cei-assessment-detail-controls-shell" aria-label="Assessment controls">
        <div className="cei-assessment-artifact-controls">
          <input
            aria-label="Filter controls"
            className="cei-assessment-artifact-filter"
            onChange={(event): void => setQuery(event.target.value)}
            placeholder="Filter by control id, description, status, or section"
            type="search"
            value={query}
          />
          <label className="cei-assessment-artifact-filter-label">
            <span>Status</span>
            <select
              aria-label="Filter controls by status"
              onChange={(event): void => setStatusFilter(event.target.value)}
              value={statusFilter}
            >
              <option value="all">All</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {toAssessmentStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="cei-assessment-artifact-filter-label">
            <span>Section</span>
            <select
              aria-label="Filter controls by section"
              onChange={(event): void => setSectionFilter(event.target.value)}
              value={sectionFilter}
            >
              <option value="all">All</option>
              {assessment.sections.map((section) => (
                <option key={section.name} value={section.name}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="cei-assessment-artifact-table-wrap">
          <table aria-label="Assessment controls table" className="cei-assessment-artifact-table">
            <thead>
              <tr>
                <th scope="col">Control</th>
                <th scope="col">Section</th>
                <th scope="col">Status</th>
                <th scope="col">Description</th>
                <th scope="col">Gap</th>
                <th scope="col">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {filteredControls.map((control) => {
                const isSelected = selectedControlId === control.id

                return (
                  <tr
                    aria-label={`Select control ${control.id}`}
                    className={`cei-assessment-artifact-table-row${
                      isSelected ? ' cei-assessment-artifact-table-row-selected' : ''
                    }`}
                    key={control.id}
                    onClick={(): void => setSelectedControlId(control.id)}
                    onKeyDown={(event): void => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedControlId(control.id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td>{control.id}</td>
                    <td>{control.sectionName}</td>
                    <td>
                      <span className={toAssessmentStatusClassName(control.status)}>
                        {toAssessmentStatusLabel(control.status)}
                      </span>
                    </td>
                    <td>{control.description}</td>
                    <td>{control.gap || '-'}</td>
                    <td>{control.recommendation || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredControls.length === 0 ? (
          <p className="cei-artifact-inline-preview">No controls match the current filters.</p>
        ) : null}

        {selectedControl ? (
          <div className="cei-assessment-artifact-selection">
            <strong>Selected control: {selectedControl.id}</strong>
            <p className="cei-artifact-inline-preview">{selectedControl.description}</p>
            {selectedControl.gap ? (
              <p className="cei-artifact-inline-preview">Gap: {selectedControl.gap}</p>
            ) : null}
            {selectedControl.recommendation ? (
              <p className="cei-artifact-inline-preview">
                Recommendation: {selectedControl.recommendation}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}

function renderInline(artifact: Artifact): JSX.Element {
  if (!isAssessmentDetailArtifact(artifact)) {
    return <p className="cei-artifact-inline-preview">Unsupported assessment detail artifact.</p>
  }

  return <AssessmentSummaryCards assessment={artifact.block.assessment} title={artifact.title} />
}

function renderExpanded(artifact: Artifact): JSX.Element {
  if (!isAssessmentDetailArtifact(artifact)) {
    return <p>Unsupported assessment detail artifact.</p>
  }

  return (
    <div className="cei-artifact-expanded-content">
      <AssessmentDetailContent artifact={artifact} mode="expanded" />
    </div>
  )
}

function renderFullScreen(artifact: Artifact): JSX.Element {
  if (!isAssessmentDetailArtifact(artifact)) {
    return <p>Unsupported assessment detail artifact.</p>
  }

  return (
    <div className="cei-artifact-fullscreen-content">
      <AssessmentDetailContent artifact={artifact} mode="fullscreen" />
    </div>
  )
}

/**
 * Built-in assessment-detail artifact renderer definition.
 */
export const assessmentDetailArtifactDefinition: ArtifactTypeDefinition = {
  kind: 'assessment-detail',
  renderInline,
  renderExpanded,
  renderFullScreen,
}
