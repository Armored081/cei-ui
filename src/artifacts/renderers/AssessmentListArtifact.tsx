import { useMemo, useState } from 'react'

import type { StructuredBlock } from '../../agent/types'
import type { Artifact } from '../../hooks/useChatEngine'
import type { ArtifactTypeDefinition } from '../ArtifactRegistry'
import './artifact-renderers.css'

type AssessmentListBlockData = Extract<StructuredBlock, { kind: 'assessment-list' }>
type AssessmentListItem = AssessmentListBlockData['assessments'][number]
type SortDirection = 'asc' | 'desc'
type AssessmentSortColumn = 'name' | 'framework' | 'status' | 'score' | 'updatedAt'

interface AssessmentSortState {
  column: AssessmentSortColumn
  direction: SortDirection
}

interface AssessmentListTableViewProps {
  artifact: Artifact & { block: AssessmentListBlockData }
  mode: 'expanded' | 'fullscreen'
}

function isAssessmentListArtifact(
  artifact: Artifact,
): artifact is Artifact & { block: AssessmentListBlockData } {
  return artifact.block.kind === 'assessment-list'
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

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

function compareAssessmentRows(
  left: AssessmentListItem,
  right: AssessmentListItem,
  column: AssessmentSortColumn,
): number {
  if (column === 'score') {
    return left.score - right.score
  }

  if (column === 'updatedAt') {
    const leftDate = new Date(left.updatedAt).getTime()
    const rightDate = new Date(right.updatedAt).getTime()

    if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate) && leftDate !== rightDate) {
      return leftDate - rightDate
    }
  }

  return compareText(String(left[column]), String(right[column]))
}

function sortIndicator(column: AssessmentSortColumn, sortState: AssessmentSortState): string {
  if (sortState.column !== column) {
    return '<>'
  }

  return sortState.direction === 'asc' ? '^' : 'v'
}

function toAriaSort(
  column: AssessmentSortColumn,
  sortState: AssessmentSortState,
): 'none' | 'ascending' | 'descending' {
  if (sortState.column !== column) {
    return 'none'
  }

  return sortState.direction === 'asc' ? 'ascending' : 'descending'
}

function inlinePreviewRows(assessments: AssessmentListItem[]): AssessmentListItem[] {
  return assessments.slice(0, 3)
}

function AssessmentListTableView({ artifact, mode }: AssessmentListTableViewProps): JSX.Element {
  const [filterQuery, setFilterQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('')
  const [sortState, setSortState] = useState<AssessmentSortState>({
    column: 'updatedAt',
    direction: 'desc',
  })

  const normalizedQuery = filterQuery.trim().toLocaleLowerCase()

  const statusOptions = useMemo((): string[] => {
    return Array.from(
      new Set(artifact.block.assessments.map((assessment): string => assessment.status)),
    ).sort((left, right): number => compareText(left, right))
  }, [artifact.block.assessments])

  const filteredAssessments = useMemo((): AssessmentListItem[] => {
    return artifact.block.assessments.filter((assessment): boolean => {
      if (statusFilter !== 'all' && assessment.status !== statusFilter) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return (
        assessment.id.toLocaleLowerCase().includes(normalizedQuery) ||
        assessment.name.toLocaleLowerCase().includes(normalizedQuery) ||
        assessment.framework.toLocaleLowerCase().includes(normalizedQuery) ||
        assessment.status.toLocaleLowerCase().includes(normalizedQuery)
      )
    })
  }, [artifact.block.assessments, normalizedQuery, statusFilter])

  const sortedAssessments = useMemo((): AssessmentListItem[] => {
    const rows = [...filteredAssessments]

    rows.sort((left, right): number => {
      const comparison = compareAssessmentRows(left, right, sortState.column)

      if (comparison === 0) {
        return compareText(left.name, right.name)
      }

      return sortState.direction === 'asc' ? comparison : comparison * -1
    })

    return rows
  }, [filteredAssessments, sortState])

  const selectedAssessment = useMemo((): AssessmentListItem | null => {
    return (
      sortedAssessments.find((assessment): boolean => assessment.id === selectedAssessmentId) ||
      null
    )
  }, [selectedAssessmentId, sortedAssessments])

  const onSortColumn = (column: AssessmentSortColumn): void => {
    setSortState((currentSort): AssessmentSortState => {
      if (currentSort.column !== column) {
        return {
          column,
          direction: 'asc',
        }
      }

      return {
        column,
        direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
      }
    })
  }

  return (
    <div
      className={`cei-assessment-artifact-table-shell cei-assessment-artifact-table-shell-${mode}`}
    >
      <div className="cei-assessment-artifact-controls">
        <input
          aria-label="Filter assessments"
          className="cei-assessment-artifact-filter"
          onChange={(event): void => setFilterQuery(event.target.value)}
          placeholder="Filter by id, name, framework, or status"
          type="search"
          value={filterQuery}
        />
        <label className="cei-assessment-artifact-filter-label">
          <span>Status</span>
          <select
            aria-label="Filter assessments by status"
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
      </div>

      <div className="cei-assessment-artifact-table-wrap">
        <table aria-label="Assessment list table" className="cei-assessment-artifact-table">
          <thead>
            <tr>
              <th aria-sort={toAriaSort('name', sortState)} scope="col">
                <button
                  className="cei-assessment-artifact-sort-button"
                  onClick={(): void => onSortColumn('name')}
                  type="button"
                >
                  <span>Name</span>
                  <span aria-hidden="true">{sortIndicator('name', sortState)}</span>
                </button>
              </th>
              <th aria-sort={toAriaSort('framework', sortState)} scope="col">
                <button
                  className="cei-assessment-artifact-sort-button"
                  onClick={(): void => onSortColumn('framework')}
                  type="button"
                >
                  <span>Framework</span>
                  <span aria-hidden="true">{sortIndicator('framework', sortState)}</span>
                </button>
              </th>
              <th aria-sort={toAriaSort('status', sortState)} scope="col">
                <button
                  className="cei-assessment-artifact-sort-button"
                  onClick={(): void => onSortColumn('status')}
                  type="button"
                >
                  <span>Status</span>
                  <span aria-hidden="true">{sortIndicator('status', sortState)}</span>
                </button>
              </th>
              <th aria-sort={toAriaSort('score', sortState)} scope="col">
                <button
                  className="cei-assessment-artifact-sort-button"
                  onClick={(): void => onSortColumn('score')}
                  type="button"
                >
                  <span>Score</span>
                  <span aria-hidden="true">{sortIndicator('score', sortState)}</span>
                </button>
              </th>
              <th aria-sort={toAriaSort('updatedAt', sortState)} scope="col">
                <button
                  className="cei-assessment-artifact-sort-button"
                  onClick={(): void => onSortColumn('updatedAt')}
                  type="button"
                >
                  <span>Updated</span>
                  <span aria-hidden="true">{sortIndicator('updatedAt', sortState)}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAssessments.map((assessment) => {
              const isSelected = selectedAssessmentId === assessment.id

              return (
                <tr
                  aria-label={`Select assessment ${assessment.name}`}
                  className={`cei-assessment-artifact-table-row${
                    isSelected ? ' cei-assessment-artifact-table-row-selected' : ''
                  }`}
                  key={assessment.id}
                  onClick={(): void => setSelectedAssessmentId(assessment.id)}
                  onKeyDown={(event): void => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedAssessmentId(assessment.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td>{assessment.name}</td>
                  <td>{assessment.framework}</td>
                  <td>
                    <span className={toAssessmentStatusClassName(assessment.status)}>
                      {toAssessmentStatusLabel(assessment.status)}
                    </span>
                  </td>
                  <td>
                    <span className={toScoreClassName(assessment.score)}>
                      {assessment.score.toFixed(1)}
                    </span>
                  </td>
                  <td>{formatAssessmentDate(assessment.updatedAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sortedAssessments.length === 0 ? (
        <p className="cei-artifact-inline-preview">No assessments match the current filters.</p>
      ) : null}

      {selectedAssessment ? (
        <p className="cei-assessment-artifact-selection">
          Selected assessment: <strong>{selectedAssessment.name}</strong> ({selectedAssessment.id})
        </p>
      ) : null}
    </div>
  )
}

function renderInline(artifact: Artifact): JSX.Element {
  if (!isAssessmentListArtifact(artifact)) {
    return <p className="cei-artifact-inline-preview">Unsupported assessment list artifact.</p>
  }

  const previewRows = inlinePreviewRows(artifact.block.assessments)

  return (
    <>
      <div className="cei-artifact-inline-header">
        <span aria-hidden="true" className="cei-artifact-inline-icon">
          {'\u{1F4DD}'}
        </span>
        <span className="cei-artifact-inline-kind">Assessment list</span>
      </div>
      <p className="cei-artifact-inline-title">{artifact.title}</p>
      <p className="cei-artifact-inline-preview">
        {artifact.block.assessments.length.toString()} assessments
      </p>
      {previewRows.length > 0 ? (
        <div className="cei-assessment-artifact-inline-table-wrap">
          <table
            aria-label="Assessment list preview"
            className="cei-assessment-artifact-inline-table"
          >
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Status</th>
                <th scope="col">Score</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((assessment) => (
                <tr key={assessment.id}>
                  <td>{assessment.name}</td>
                  <td>
                    <span className={toAssessmentStatusClassName(assessment.status)}>
                      {toAssessmentStatusLabel(assessment.status)}
                    </span>
                  </td>
                  <td>
                    <span className={toScoreClassName(assessment.score)}>
                      {assessment.score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  )
}

function renderExpanded(artifact: Artifact): JSX.Element {
  if (!isAssessmentListArtifact(artifact)) {
    return <p>Unsupported assessment list artifact.</p>
  }

  return (
    <div className="cei-artifact-expanded-content">
      <AssessmentListTableView artifact={artifact} mode="expanded" />
    </div>
  )
}

function renderFullScreen(artifact: Artifact): JSX.Element {
  if (!isAssessmentListArtifact(artifact)) {
    return <p>Unsupported assessment list artifact.</p>
  }

  return (
    <div className="cei-artifact-fullscreen-content">
      <AssessmentListTableView artifact={artifact} mode="fullscreen" />
    </div>
  )
}

/**
 * Built-in assessment-list artifact renderer definition.
 */
export const assessmentListArtifactDefinition: ArtifactTypeDefinition = {
  kind: 'assessment-list',
  renderInline,
  renderExpanded,
  renderFullScreen,
}
