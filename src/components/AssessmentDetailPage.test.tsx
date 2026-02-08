import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AssessmentDetail } from '../assessment/types'
import { AssessmentDetailPage } from './AssessmentDetailPage'

const { mockFetchAssessmentDetail, mockExportAssessmentCsv } = vi.hoisted(
  (): {
    mockFetchAssessmentDetail: ReturnType<typeof vi.fn>
    mockExportAssessmentCsv: ReturnType<typeof vi.fn>
  } => ({
    mockFetchAssessmentDetail: vi.fn(),
    mockExportAssessmentCsv: vi.fn(),
  }),
)

const rechartsMocks = vi.hoisted(() => {
  const makeMockChartPart = (testId: string) =>
    vi.fn(
      ({ children }: { children?: ReactNode }): JSX.Element => (
        <div data-testid={testId}>{children}</div>
      ),
    )

  return {
    Bar: makeMockChartPart('Bar'),
    BarChart: makeMockChartPart('BarChart'),
    CartesianGrid: makeMockChartPart('CartesianGrid'),
    Legend: makeMockChartPart('Legend'),
    ResponsiveContainer: makeMockChartPart('ResponsiveContainer'),
    Tooltip: makeMockChartPart('Tooltip'),
    XAxis: makeMockChartPart('XAxis'),
    YAxis: makeMockChartPart('YAxis'),
  }
})

vi.mock('recharts', () => rechartsMocks)

vi.mock(
  '../assessment/client',
  (): {
    exportAssessmentCsv: typeof mockExportAssessmentCsv
    fetchAssessmentDetail: typeof mockFetchAssessmentDetail
  } => ({
    exportAssessmentCsv: mockExportAssessmentCsv,
    fetchAssessmentDetail: mockFetchAssessmentDetail,
  }),
)

const detailFixture: AssessmentDetail = {
  id: 'assessment-de-1',
  regulationId: 'DSGVO-30',
  regulationName: 'DSGVO Artikel 30 Zuordnung',
  jurisdiction: 'Germany',
  status: 'complete',
  createdAt: '2026-02-05T14:25:00.000Z',
  totalMappings: 3,
  mappedCount: 1,
  partialCount: 1,
  gapCount: 1,
  avgConfidence: 0.78,
  mappings: [
    {
      id: 'map-1',
      assessmentId: 'assessment-de-1',
      sourceRef: '§ 30 Abs. 1 – Überprüfung',
      canonicalRef: 'sec-30-1',
      sourceText: 'Der Verantwortliche führt ein Verzeichnis von Verarbeitungstätigkeiten.',
      section: 'Artikel 30',
      mappingStatus: 'gap',
      confidence: 0.42,
      nistControlId: 'PR.AC-1',
      nistControlText: 'Identities and credentials are managed.',
      nistFramework: 'NIST CSF 2.0',
      rcmControlId: 'RCM-12',
      rcmControlText: 'Access management baseline',
      gapSeverity: 'high',
      gapDescription: 'Control evidence missing for data inventory.',
      recommendedLanguage:
        'Dokumentieren Sie den Zweck und die Kategorien personenbezogener Daten.',
      rationale: 'Evidence does not map fully to inventory requirements.',
      scopeDomain: 'Data Governance',
      scopeSubject: 'Personal Data Register',
      scopeAssetType: 'Database',
      scopeEnvironment: 'Production',
      scopeSummary: 'Core customer data platforms',
      isUserOverride: true,
    },
    {
      id: 'map-2',
      assessmentId: 'assessment-de-1',
      sourceRef: 'Art. 5 Abs. 1 lit. f',
      canonicalRef: 'sec-5-1-f',
      sourceText:
        'Personenbezogene Daten müssen durch geeignete technische Maßnahmen geschützt werden.',
      section: 'Artikel 5',
      mappingStatus: 'mapped',
      confidence: 0.96,
      nistControlId: 'PR.DS-1',
      nistControlText: 'Data-at-rest protections are implemented.',
      nistFramework: 'NIST CSF 2.0',
      rcmControlId: 'RCM-2',
      rcmControlText: 'Data protection baseline',
      gapSeverity: '',
      gapDescription: '',
      recommendedLanguage: '',
      rationale: 'Control evidence fully satisfies this requirement.',
      scopeDomain: 'Security',
      scopeSubject: 'Data Encryption',
      scopeAssetType: 'Storage',
      scopeEnvironment: 'Production',
      scopeSummary: 'Primary encrypted stores',
      isUserOverride: false,
    },
    {
      id: 'map-3',
      assessmentId: 'assessment-de-1',
      sourceRef: '§ 32 Abs. 2',
      canonicalRef: 'sec-32-2',
      sourceText: 'Bei der Bewertung ist das Risiko angemessen zu berücksichtigen.',
      section: 'Artikel 32',
      mappingStatus: 'partial',
      confidence: 0.62,
      nistControlId: 'ID.RA-1',
      nistControlText: 'Asset vulnerabilities are identified and documented.',
      nistFramework: 'NIST CSF 2.0',
      rcmControlId: 'RCM-9',
      rcmControlText: 'Risk assessment cadence',
      gapSeverity: 'medium',
      gapDescription: 'Assessment exists but not complete for all systems.',
      recommendedLanguage:
        'Ergänzen Sie eine systemübergreifende Risikoanalyse mit quartalsweiser Aktualisierung.',
      rationale: 'Evidence covers only a subset of systems in scope.',
      scopeDomain: 'Risk',
      scopeSubject: 'Risk Program',
      scopeAssetType: 'Policy',
      scopeEnvironment: 'Enterprise',
      scopeSummary: 'Cross-business risk review process',
      isUserOverride: false,
    },
  ],
}

beforeEach((): void => {
  mockFetchAssessmentDetail.mockReset()
  mockExportAssessmentCsv.mockReset()
  mockFetchAssessmentDetail.mockResolvedValue(detailFixture)
  mockExportAssessmentCsv.mockResolvedValue(new Blob(['sourceRef,section'], { type: 'text/csv' }))

  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:assessment-csv')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation((): void => {})
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation((): void => {})
})

describe('AssessmentDetailPage', (): void => {
  it('renders summary cards and German source references', async (): Promise<void> => {
    render(
      <MemoryRouter initialEntries={['/assessments/assessment-de-1']}>
        <Routes>
          <Route element={<AssessmentDetailPage />} path="/assessments/:id" />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('DSGVO Artikel 30 Zuordnung')).toBeInTheDocument()

    expect(screen.getByText('Total requirements')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Mapped %')).toBeInTheDocument()
    expect(screen.getAllByText('33.3%')).toHaveLength(3)
    expect(screen.getByText('Avg confidence')).toBeInTheDocument()
    expect(screen.getByText('78.0%')).toBeInTheDocument()

    expect(screen.getByText('§ 30 Abs. 1 – Überprüfung')).toBeInTheDocument()
  })

  it('filters rows by status and toggles sort direction', async (): Promise<void> => {
    render(
      <MemoryRouter initialEntries={['/assessments/assessment-de-1']}>
        <Routes>
          <Route element={<AssessmentDetailPage />} path="/assessments/:id" />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('§ 30 Abs. 1 – Überprüfung')

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'gap' } })

    expect(screen.getByText('§ 30 Abs. 1 – Überprüfung')).toBeInTheDocument()
    expect(screen.queryByText('Art. 5 Abs. 1 lit. f')).not.toBeInTheDocument()
    expect(screen.queryByText('§ 32 Abs. 2')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'all' } })

    fireEvent.click(screen.getByRole('button', { name: 'Confidence' }))

    await waitFor((): void => {
      const rows = screen.getAllByRole('row')
      expect(within(rows[1]).getByText('§ 30 Abs. 1 – Überprüfung')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Confidence' }))

    await waitFor((): void => {
      const rows = screen.getAllByRole('row')
      expect(within(rows[1]).getByText('Art. 5 Abs. 1 lit. f')).toBeInTheDocument()
    })
  })

  it('expands detail panel on row click and triggers CSV export', async (): Promise<void> => {
    render(
      <MemoryRouter initialEntries={['/assessments/assessment-de-1']}>
        <Routes>
          <Route element={<AssessmentDetailPage />} path="/assessments/:id" />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('§ 30 Abs. 1 – Überprüfung')

    fireEvent.click(screen.getByText('§ 30 Abs. 1 – Überprüfung'))

    expect(
      await screen.findByText(
        'Der Verantwortliche führt ein Verzeichnis von Verarbeitungstätigkeiten.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('User override')).toBeInTheDocument()
    expect(
      screen.getByText('Dokumentieren Sie den Zweck und die Kategorien personenbezogener Daten.'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))

    await waitFor((): void => {
      expect(mockExportAssessmentCsv).toHaveBeenCalledWith('assessment-de-1', {
        minConfidence: 0,
        section: 'all',
        severity: 'all',
        status: 'all',
      })
    })
  })
})
