import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { fetchAssessments } from '../assessment/client'
import type { AssessmentStatus, AssessmentSummary } from '../assessment/types'
import './AssessmentListPage.css'

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

function toAssessmentStatusLabel(status: AssessmentStatus): string {
  if (status === 'in-progress') {
    return 'In progress'
  }

  return status.charAt(0).toUpperCase() + status.slice(1)
}

function toStatusClassName(status: AssessmentStatus): string {
  if (status === 'complete') {
    return 'cei-assessment-status cei-assessment-status-complete'
  }

  if (status === 'in-progress') {
    return 'cei-assessment-status cei-assessment-status-in-progress'
  }

  if (status === 'approved') {
    return 'cei-assessment-status cei-assessment-status-approved'
  }

  if (status === 'archived') {
    return 'cei-assessment-status cei-assessment-status-archived'
  }

  return 'cei-assessment-status cei-assessment-status-draft'
}

function toStatsSummary(assessment: AssessmentSummary): string {
  return `Mapped ${assessment.mappedCount} | Partial ${assessment.partialCount} | Gap ${assessment.gapCount}`
}

export function AssessmentListPage(): JSX.Element {
  const navigate = useNavigate()
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorText, setErrorText] = useState<string>('')

  useEffect((): (() => void) => {
    let isCancelled = false

    const loadAssessments = async (): Promise<void> => {
      setIsLoading(true)
      setErrorText('')

      try {
        const loadedAssessments = await fetchAssessments()

        if (isCancelled) {
          return
        }

        setAssessments(loadedAssessments)
      } catch (error) {
        if (isCancelled) {
          return
        }

        if (error instanceof Error) {
          setErrorText(error.message)
        } else {
          setErrorText('Unable to load assessments.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadAssessments()

    return (): void => {
      isCancelled = true
    }
  }, [])

  const sortedAssessments = useMemo((): AssessmentSummary[] => {
    const assessmentsCopy = [...assessments]

    assessmentsCopy.sort((left, right): number => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })

    return assessmentsCopy
  }, [assessments])

  const onOpenAssessment = (assessmentId: string): void => {
    navigate(`/assessments/${assessmentId}`)
  }

  return (
    <main className="cei-assessment-list-shell">
      <header className="cei-assessment-list-header">
        <div>
          <p className="cei-assessment-list-kicker">Regulation Assessment</p>
          <h1 className="cei-assessment-list-title">Assessments</h1>
          <p className="cei-assessment-list-subtitle">
            Browse and open completed or in-progress regulation mappings.
          </p>
        </div>
      </header>

      <section className="cei-assessment-list-panel">
        {isLoading ? (
          <div className="cei-assessment-list-empty" role="status">
            <p>Loading assessments...</p>
          </div>
        ) : null}

        {!isLoading && errorText ? (
          <div className="cei-assessment-list-error" role="alert">
            {errorText}
          </div>
        ) : null}

        {!isLoading && !errorText && sortedAssessments.length === 0 ? (
          <div className="cei-assessment-list-empty">
            <p>No assessments found.</p>
          </div>
        ) : null}

        {!isLoading && !errorText && sortedAssessments.length > 0 ? (
          <div className="cei-assessment-list-table-wrap">
            <table className="cei-assessment-list-table">
              <thead>
                <tr>
                  <th scope="col">Regulation</th>
                  <th scope="col">Jurisdiction</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                  <th scope="col">Stats</th>
                </tr>
              </thead>
              <tbody>
                {sortedAssessments.map((assessment) => (
                  <tr
                    aria-label={`Open assessment ${assessment.regulationName}`}
                    className="cei-assessment-list-row"
                    key={assessment.id}
                    onClick={(): void => onOpenAssessment(assessment.id)}
                    onKeyDown={(event): void => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onOpenAssessment(assessment.id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td>
                      <p className="cei-assessment-reg-name">{assessment.regulationName}</p>
                      <p className="cei-assessment-reg-id">{assessment.regulationId}</p>
                    </td>
                    <td>{assessment.jurisdiction}</td>
                    <td>
                      <span className={toStatusClassName(assessment.status)}>
                        {toAssessmentStatusLabel(assessment.status)}
                      </span>
                    </td>
                    <td>{formatAssessmentDate(assessment.createdAt)}</td>
                    <td>{toStatsSummary(assessment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  )
}
