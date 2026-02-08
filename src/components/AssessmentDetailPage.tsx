import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { exportAssessmentCsv, fetchAssessmentDetail } from '../assessment/client'
import type {
  AssessmentDetail,
  GapSeverity,
  MappingFilters,
  MappingRecord,
  MappingSort,
  MappingSortColumn,
  MappingStatus,
} from '../assessment/types'
import { AppNavigation } from './AppNavigation'
import './AssessmentDetailPage.css'

interface SectionChartRow {
  gap: number
  label: string
  mapped: number
  partial: number
}

const PAGE_SIZE = 25
const DEFAULT_FILTERS: MappingFilters = {
  minConfidence: 0,
  section: 'all',
  severity: 'all',
  status: 'all',
}

function formatAssessmentDate(createdAt: string): string {
  const parsedDate = new Date(createdAt)

  if (Number.isNaN(parsedDate.getTime())) {
    return createdAt
  }

  return parsedDate.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function toConfidencePercent(confidence: number): number {
  if (confidence <= 1) {
    return clampPercentage(confidence * 100)
  }

  return clampPercentage(confidence)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function toPercentage(value: number, total: number): number {
  if (total <= 0) {
    return 0
  }

  return (value / total) * 100
}

function toStatusBadgeClassName(status: MappingStatus): string {
  if (status === 'mapped') {
    return 'cei-mapping-status cei-mapping-status-mapped'
  }

  if (status === 'partial') {
    return 'cei-mapping-status cei-mapping-status-partial'
  }

  return 'cei-mapping-status cei-mapping-status-gap'
}

function toSeverityLabel(severity: GapSeverity | ''): string {
  if (!severity) {
    return '—'
  }

  return severity.charAt(0).toUpperCase() + severity.slice(1)
}

function toComparableText(value: string): string {
  return value.toLocaleLowerCase()
}

function compareStrings(left: string, right: string): number {
  return toComparableText(left).localeCompare(toComparableText(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

function compareMappings(
  left: MappingRecord,
  right: MappingRecord,
  column: MappingSortColumn,
): number {
  if (column === 'sourceRef') {
    return compareStrings(left.sourceRef, right.sourceRef)
  }

  if (column === 'section') {
    return compareStrings(left.section, right.section)
  }

  if (column === 'mappingStatus') {
    const statusRank: Record<MappingStatus, number> = {
      mapped: 1,
      partial: 2,
      gap: 3,
    }

    return statusRank[left.mappingStatus] - statusRank[right.mappingStatus]
  }

  if (column === 'confidence') {
    return toConfidencePercent(left.confidence) - toConfidencePercent(right.confidence)
  }

  if (column === 'nistControlId') {
    return compareStrings(left.nistControlId, right.nistControlId)
  }

  const severityRank: Record<GapSeverity | '', number> = {
    '': 5,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }

  return severityRank[left.gapSeverity] - severityRank[right.gapSeverity]
}

function toSortIndicator(column: MappingSortColumn, sortState: MappingSort): string {
  if (sortState.column !== column) {
    return '<>'
  }

  return sortState.direction === 'asc' ? '^' : 'v'
}

function toAriaSort(
  column: MappingSortColumn,
  sortState: MappingSort,
): 'none' | 'ascending' | 'descending' {
  if (sortState.column !== column) {
    return 'none'
  }

  return sortState.direction === 'asc' ? 'ascending' : 'descending'
}

function buildSectionChartData(mappings: MappingRecord[]): SectionChartRow[] {
  const sectionMap = new Map<string, SectionChartRow>()

  for (const mapping of mappings) {
    const sectionName = mapping.section || 'Unspecified'
    const existing = sectionMap.get(sectionName)

    if (!existing) {
      sectionMap.set(sectionName, {
        gap: mapping.mappingStatus === 'gap' ? 1 : 0,
        label: sectionName,
        mapped: mapping.mappingStatus === 'mapped' ? 1 : 0,
        partial: mapping.mappingStatus === 'partial' ? 1 : 0,
      })
      continue
    }

    if (mapping.mappingStatus === 'mapped') {
      existing.mapped += 1
    } else if (mapping.mappingStatus === 'partial') {
      existing.partial += 1
    } else {
      existing.gap += 1
    }
  }

  return Array.from(sectionMap.values()).sort((left, right): number => {
    return compareStrings(left.label, right.label)
  })
}

function toCsvFileName(assessment: AssessmentDetail): string {
  const segment = (assessment.regulationId || assessment.id)
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return `${segment || 'assessment'}-mappings.csv`
}

function startBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = filename
  anchor.style.display = 'none'

  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

function toApiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unable to load assessment.'
}

function shouldShowRecommendedLanguage(mapping: MappingRecord): boolean {
  if (mapping.mappingStatus === 'mapped') {
    return false
  }

  return Boolean(mapping.recommendedLanguage)
}

export function AssessmentDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorText, setErrorText] = useState<string>('')
  const [filters, setFilters] = useState<MappingFilters>(DEFAULT_FILTERS)
  const [sortState, setSortState] = useState<MappingSort>({
    column: 'sourceRef',
    direction: 'asc',
  })
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [selectedMappingId, setSelectedMappingId] = useState<string>('')
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [exportError, setExportError] = useState<string>('')

  useEffect((): (() => void) => {
    let isCancelled = false

    const assessmentId = id || ''

    if (!assessmentId) {
      setErrorText('Assessment ID is missing from the route.')
      setIsLoading(false)

      return (): void => {
        isCancelled = true
      }
    }

    const loadAssessment = async (): Promise<void> => {
      setIsLoading(true)
      setErrorText('')

      try {
        const loadedAssessment = await fetchAssessmentDetail(assessmentId)

        if (isCancelled) {
          return
        }

        setAssessment(loadedAssessment)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setErrorText(toApiErrorMessage(error))
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadAssessment()

    return (): void => {
      isCancelled = true
    }
  }, [id])

  const sections = useMemo((): string[] => {
    if (!assessment) {
      return []
    }

    return Array.from(
      new Set(
        assessment.mappings
          .map((mapping): string => mapping.section)
          .filter((section): boolean => Boolean(section)),
      ),
    ).sort((left, right): number => compareStrings(left, right))
  }, [assessment])

  const filteredMappings = useMemo((): MappingRecord[] => {
    if (!assessment) {
      return []
    }

    return assessment.mappings.filter((mapping): boolean => {
      if (filters.status !== 'all' && mapping.mappingStatus !== filters.status) {
        return false
      }

      if (filters.section !== 'all' && mapping.section !== filters.section) {
        return false
      }

      if (filters.severity !== 'all' && mapping.gapSeverity !== filters.severity) {
        return false
      }

      if (toConfidencePercent(mapping.confidence) < filters.minConfidence) {
        return false
      }

      return true
    })
  }, [assessment, filters])

  const sortedMappings = useMemo((): MappingRecord[] => {
    const mappingsCopy = [...filteredMappings]

    mappingsCopy.sort((left, right): number => {
      const comparison = compareMappings(left, right, sortState.column)

      if (comparison === 0) {
        return compareStrings(left.sourceRef, right.sourceRef)
      }

      return sortState.direction === 'asc' ? comparison : comparison * -1
    })

    return mappingsCopy
  }, [filteredMappings, sortState])

  const totalPages = useMemo((): number => {
    if (sortedMappings.length === 0) {
      return 1
    }

    return Math.ceil(sortedMappings.length / PAGE_SIZE)
  }, [sortedMappings])

  useEffect((): void => {
    setCurrentPage((current): number => {
      if (current <= totalPages) {
        return current
      }

      return totalPages
    })
  }, [totalPages])

  useEffect((): void => {
    if (!selectedMappingId) {
      return
    }

    const existsInFilteredRows = sortedMappings.some(
      (mapping): boolean => mapping.id === selectedMappingId,
    )

    if (!existsInFilteredRows) {
      setSelectedMappingId('')
    }
  }, [selectedMappingId, sortedMappings])

  const pagedMappings = useMemo((): MappingRecord[] => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedMappings.slice(start, start + PAGE_SIZE)
  }, [currentPage, sortedMappings])

  const selectedMapping = useMemo((): MappingRecord | null => {
    if (!selectedMappingId) {
      return null
    }

    return sortedMappings.find((mapping): boolean => mapping.id === selectedMappingId) || null
  }, [selectedMappingId, sortedMappings])

  const sectionChartData = useMemo((): SectionChartRow[] => {
    if (!assessment) {
      return []
    }

    return buildSectionChartData(assessment.mappings)
  }, [assessment])

  const mappedPercent = assessment
    ? toPercentage(assessment.mappedCount, assessment.totalMappings)
    : 0
  const partialPercent = assessment
    ? toPercentage(assessment.partialCount, assessment.totalMappings)
    : 0
  const gapPercent = assessment ? toPercentage(assessment.gapCount, assessment.totalMappings) : 0
  const avgConfidencePercent = assessment ? toConfidencePercent(assessment.avgConfidence) : 0

  const onChangeStatusFilter = (status: MappingFilters['status']): void => {
    setFilters(
      (current): MappingFilters => ({
        ...current,
        status,
      }),
    )
    setCurrentPage(1)
  }

  const onChangeSectionFilter = (section: string): void => {
    setFilters(
      (current): MappingFilters => ({
        ...current,
        section,
      }),
    )
    setCurrentPage(1)
  }

  const onChangeSeverityFilter = (severity: MappingFilters['severity']): void => {
    setFilters(
      (current): MappingFilters => ({
        ...current,
        severity,
      }),
    )
    setCurrentPage(1)
  }

  const onChangeMinConfidence = (nextValue: string): void => {
    const parsed = Number(nextValue)

    if (!Number.isFinite(parsed)) {
      return
    }

    setFilters(
      (current): MappingFilters => ({
        ...current,
        minConfidence: clampPercentage(parsed),
      }),
    )
    setCurrentPage(1)
  }

  const onSortColumn = (column: MappingSortColumn): void => {
    setSortState((currentSort): MappingSort => {
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

  const onExportCsv = async (): Promise<void> => {
    if (!assessment || isExporting) {
      return
    }

    setIsExporting(true)
    setExportError('')

    try {
      const csvBlob = await exportAssessmentCsv(assessment.id, filters)
      startBlobDownload(csvBlob, toCsvFileName(assessment))
    } catch (error) {
      setExportError(toApiErrorMessage(error))
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="cei-assessment-detail-shell">
        <div className="cei-assessment-detail-loading" role="status">
          Loading assessment...
        </div>
      </main>
    )
  }

  if (!assessment) {
    return (
      <main className="cei-assessment-detail-shell">
        <header className="cei-assessment-detail-header">
          <AppNavigation />
        </header>
        <div className="cei-assessment-detail-error" role="alert">
          {errorText || 'Assessment not found.'}
        </div>
      </main>
    )
  }

  return (
    <main className="cei-assessment-detail-shell">
      <header className="cei-assessment-detail-header">
        <div className="cei-assessment-detail-header-main">
          <button
            className="cei-assessment-link-button"
            onClick={(): void => navigate('/assessments')}
            type="button"
          >
            Back to assessments
          </button>
          <p className="cei-assessment-detail-kicker">Assessment Detail</p>
          <h1 className="cei-assessment-detail-title">{assessment.regulationName}</h1>
          <p className="cei-assessment-detail-subtitle">
            {assessment.jurisdiction} | Created {formatAssessmentDate(assessment.createdAt)}
          </p>
        </div>
        <div className="cei-assessment-detail-header-actions">
          <AppNavigation />
          <button className="cei-button-secondary" onClick={onExportCsv} type="button">
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </header>

      {errorText ? (
        <div className="cei-assessment-detail-error" role="alert">
          {errorText}
        </div>
      ) : null}

      {exportError ? (
        <div className="cei-assessment-detail-error" role="alert">
          {exportError}
        </div>
      ) : null}

      <section className="cei-summary-grid" aria-label="Assessment summary">
        <article className="cei-summary-card">
          <p className="cei-summary-label">Total requirements</p>
          <p className="cei-summary-value">{assessment.totalMappings}</p>
        </article>
        <article className="cei-summary-card cei-summary-card-mapped">
          <p className="cei-summary-label">Mapped %</p>
          <p className="cei-summary-value">{formatPercent(mappedPercent)}</p>
        </article>
        <article className="cei-summary-card cei-summary-card-partial">
          <p className="cei-summary-label">Partial %</p>
          <p className="cei-summary-value">{formatPercent(partialPercent)}</p>
        </article>
        <article className="cei-summary-card cei-summary-card-gap">
          <p className="cei-summary-label">Gap %</p>
          <p className="cei-summary-value">{formatPercent(gapPercent)}</p>
        </article>
        <article className="cei-summary-card">
          <p className="cei-summary-label">Avg confidence</p>
          <p className="cei-summary-value">{formatPercent(avgConfidencePercent)}</p>
        </article>
      </section>

      <section className="cei-assessment-panel" aria-label="Section mapping chart">
        <header className="cei-assessment-panel-header">
          <h2>Mappings by section</h2>
        </header>

        {sectionChartData.length === 0 ? (
          <p className="cei-panel-empty">No mapping data available for charting.</p>
        ) : (
          <div className="cei-assessment-chart-wrap" data-testid="section-chart">
            <ResponsiveContainer height={280} width="100%">
              <BarChart data={sectionChartData} margin={{ left: 0, right: 20, top: 8, bottom: 12 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="mapped"
                  fill="rgba(82, 196, 116, 0.8)"
                  name="Mapped"
                  stackId="status"
                />
                <Bar
                  dataKey="partial"
                  fill="rgba(255, 196, 92, 0.82)"
                  name="Partial"
                  stackId="status"
                />
                <Bar dataKey="gap" fill="rgba(255, 125, 158, 0.82)" name="Gap" stackId="status" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="cei-assessment-panel" aria-label="Mapping table">
        <header className="cei-assessment-panel-header">
          <h2>Requirement mappings</h2>
          <p>{sortedMappings.length} rows</p>
        </header>

        <div className="cei-filter-grid" role="group" aria-label="Table filters">
          <label className="cei-filter-label" htmlFor="filter-status">
            Status
            <select
              id="filter-status"
              onChange={(event): void =>
                onChangeStatusFilter(event.target.value as MappingFilters['status'])
              }
              value={filters.status}
            >
              <option value="all">All</option>
              <option value="mapped">Mapped</option>
              <option value="partial">Partial</option>
              <option value="gap">Gap</option>
            </select>
          </label>

          <label className="cei-filter-label" htmlFor="filter-section">
            Section
            <select
              id="filter-section"
              onChange={(event): void => onChangeSectionFilter(event.target.value)}
              value={filters.section}
            >
              <option value="all">All</option>
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </label>

          <label className="cei-filter-label" htmlFor="filter-severity">
            Severity
            <select
              id="filter-severity"
              onChange={(event): void =>
                onChangeSeverityFilter(event.target.value as MappingFilters['severity'])
              }
              value={filters.severity}
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>

          <label className="cei-filter-label" htmlFor="filter-confidence">
            Confidence threshold (%)
            <input
              id="filter-confidence"
              max={100}
              min={0}
              onChange={(event): void => onChangeMinConfidence(event.target.value)}
              step={1}
              type="number"
              value={filters.minConfidence}
            />
          </label>
        </div>

        <div className="cei-assessment-table-wrap">
          <table className="cei-assessment-table">
            <thead>
              <tr>
                <th aria-sort={toAriaSort('sourceRef', sortState)} scope="col">
                  <button
                    className="cei-table-sort-button"
                    onClick={(): void => onSortColumn('sourceRef')}
                    type="button"
                  >
                    <span>Source ref</span>
                    <span aria-hidden="true">{toSortIndicator('sourceRef', sortState)}</span>
                  </button>
                </th>
                <th aria-sort={toAriaSort('section', sortState)} scope="col">
                  <button
                    className="cei-table-sort-button"
                    onClick={(): void => onSortColumn('section')}
                    type="button"
                  >
                    <span>Section</span>
                    <span aria-hidden="true">{toSortIndicator('section', sortState)}</span>
                  </button>
                </th>
                <th aria-sort={toAriaSort('mappingStatus', sortState)} scope="col">
                  <button
                    className="cei-table-sort-button"
                    onClick={(): void => onSortColumn('mappingStatus')}
                    type="button"
                  >
                    <span>Status</span>
                    <span aria-hidden="true">{toSortIndicator('mappingStatus', sortState)}</span>
                  </button>
                </th>
                <th aria-sort={toAriaSort('confidence', sortState)} scope="col">
                  <button
                    className="cei-table-sort-button"
                    onClick={(): void => onSortColumn('confidence')}
                    type="button"
                  >
                    <span>Confidence</span>
                    <span aria-hidden="true">{toSortIndicator('confidence', sortState)}</span>
                  </button>
                </th>
                <th aria-sort={toAriaSort('nistControlId', sortState)} scope="col">
                  <button
                    className="cei-table-sort-button"
                    onClick={(): void => onSortColumn('nistControlId')}
                    type="button"
                  >
                    <span>NIST control</span>
                    <span aria-hidden="true">{toSortIndicator('nistControlId', sortState)}</span>
                  </button>
                </th>
                <th aria-sort={toAriaSort('gapSeverity', sortState)} scope="col">
                  <button
                    className="cei-table-sort-button"
                    onClick={(): void => onSortColumn('gapSeverity')}
                    type="button"
                  >
                    <span>Gap severity</span>
                    <span aria-hidden="true">{toSortIndicator('gapSeverity', sortState)}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedMappings.map((mapping) => (
                <tr
                  className={
                    selectedMappingId === mapping.id
                      ? 'cei-assessment-table-row cei-assessment-table-row-selected'
                      : 'cei-assessment-table-row'
                  }
                  key={mapping.id}
                  onClick={(): void => setSelectedMappingId(mapping.id)}
                >
                  <td>{mapping.sourceRef}</td>
                  <td>{mapping.section || '—'}</td>
                  <td>
                    <span className={toStatusBadgeClassName(mapping.mappingStatus)}>
                      {mapping.mappingStatus}
                    </span>
                  </td>
                  <td>{formatPercent(toConfidencePercent(mapping.confidence))}</td>
                  <td>{mapping.nistControlId || '—'}</td>
                  <td>{toSeverityLabel(mapping.gapSeverity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedMappings.length === 0 ? (
          <p className="cei-panel-empty">No rows match the selected filters.</p>
        ) : null}

        <div className="cei-pagination-row">
          <button
            className="cei-button-secondary"
            disabled={currentPage <= 1}
            onClick={(): void => setCurrentPage((page): number => Math.max(1, page - 1))}
            type="button"
          >
            Previous
          </button>
          <p>
            Page {currentPage} of {totalPages}
          </p>
          <button
            className="cei-button-secondary"
            disabled={currentPage >= totalPages}
            onClick={(): void => setCurrentPage((page): number => Math.min(totalPages, page + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </section>

      <section className="cei-assessment-panel" aria-label="Mapping detail panel">
        <header className="cei-assessment-panel-header">
          <h2>Mapping detail</h2>
        </header>

        {!selectedMapping ? (
          <p className="cei-panel-empty">Select a row to inspect detailed mapping information.</p>
        ) : (
          <div className="cei-detail-grid">
            <article className="cei-detail-card">
              <h3>{selectedMapping.sourceRef}</h3>
              <p>{selectedMapping.sourceText || 'No source text available.'}</p>
              {selectedMapping.isUserOverride ? (
                <span className="cei-user-override-badge">User override</span>
              ) : null}
            </article>

            <article className="cei-detail-card">
              <h3>Scope metadata</h3>
              <dl className="cei-detail-definition-list">
                <div>
                  <dt>Domain</dt>
                  <dd>{selectedMapping.scopeDomain || '—'}</dd>
                </div>
                <div>
                  <dt>Subject</dt>
                  <dd>{selectedMapping.scopeSubject || '—'}</dd>
                </div>
                <div>
                  <dt>Asset type</dt>
                  <dd>{selectedMapping.scopeAssetType || '—'}</dd>
                </div>
                <div>
                  <dt>Environment</dt>
                  <dd>{selectedMapping.scopeEnvironment || '—'}</dd>
                </div>
                <div>
                  <dt>Summary</dt>
                  <dd>{selectedMapping.scopeSummary || '—'}</dd>
                </div>
              </dl>
            </article>

            <article className="cei-detail-card">
              <h3>NIST mapping</h3>
              <p>
                <strong>Control ID:</strong> {selectedMapping.nistControlId || '—'}
              </p>
              <p>
                <strong>Control text:</strong> {selectedMapping.nistControlText || '—'}
              </p>
              <p>
                <strong>Framework:</strong> {selectedMapping.nistFramework || '—'}
              </p>
            </article>

            <article className="cei-detail-card">
              <h3>RCM mapping</h3>
              <p>
                <strong>Control ID:</strong> {selectedMapping.rcmControlId || '—'}
              </p>
              <p>
                <strong>Control text:</strong> {selectedMapping.rcmControlText || '—'}
              </p>
            </article>

            <article className="cei-detail-card">
              <h3>Rationale</h3>
              <p>{selectedMapping.rationale || 'No rationale available.'}</p>
            </article>

            {shouldShowRecommendedLanguage(selectedMapping) ? (
              <article className="cei-detail-card">
                <h3>Recommended language</h3>
                <p>{selectedMapping.recommendedLanguage}</p>
              </article>
            ) : null}
          </div>
        )}
      </section>
    </main>
  )
}
