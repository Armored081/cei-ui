import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AssessmentDetail, MappingRecord } from '../assessment/types'
import { AssessmentDetailPage } from './AssessmentDetailPage'

const {
  mockApproveAssessment,
  mockExportAssessmentCsv,
  mockFetchAssessmentDetail,
  mockUpdateAssessmentStatus,
  mockUpdateMappingRecord,
} = vi.hoisted(
  (): {
    mockApproveAssessment: ReturnType<typeof vi.fn>
    mockExportAssessmentCsv: ReturnType<typeof vi.fn>
    mockFetchAssessmentDetail: ReturnType<typeof vi.fn>
    mockUpdateAssessmentStatus: ReturnType<typeof vi.fn>
    mockUpdateMappingRecord: ReturnType<typeof vi.fn>
  } => ({
    mockApproveAssessment: vi.fn(),
    mockExportAssessmentCsv: vi.fn(),
    mockFetchAssessmentDetail: vi.fn(),
    mockUpdateAssessmentStatus: vi.fn(),
    mockUpdateMappingRecord: vi.fn(),
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
    approveAssessment: typeof mockApproveAssessment
    exportAssessmentCsv: typeof mockExportAssessmentCsv
    fetchAssessmentDetail: typeof mockFetchAssessmentDetail
    updateAssessmentStatus: typeof mockUpdateAssessmentStatus
    updateMappingRecord: typeof mockUpdateMappingRecord
  } => ({
    approveAssessment: mockApproveAssessment,
    exportAssessmentCsv: mockExportAssessmentCsv,
    fetchAssessmentDetail: mockFetchAssessmentDetail,
    updateAssessmentStatus: mockUpdateAssessmentStatus,
    updateMappingRecord: mockUpdateMappingRecord,
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

function buildDetailFixture(overrides: Partial<AssessmentDetail> = {}): AssessmentDetail {
  return {
    ...detailFixture,
    ...overrides,
    mappings: (overrides.mappings || detailFixture.mappings).map(
      (mapping): MappingRecord => ({
        ...mapping,
      }),
    ),
  }
}

function renderAssessmentDetailPage(): void {
  render(
    <MemoryRouter initialEntries={['/assessments/assessment-de-1']}>
      <Routes>
        <Route element={<AssessmentDetailPage />} path="/assessments/:id" />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach((): void => {
  mockApproveAssessment.mockReset()
  mockExportAssessmentCsv.mockReset()
  mockFetchAssessmentDetail.mockReset()
  mockUpdateAssessmentStatus.mockReset()
  mockUpdateMappingRecord.mockReset()

  mockFetchAssessmentDetail.mockResolvedValue(buildDetailFixture())
  mockExportAssessmentCsv.mockResolvedValue(new Blob(['sourceRef,section'], { type: 'text/csv' }))
  mockUpdateMappingRecord.mockResolvedValue(buildDetailFixture().mappings[0])
  mockApproveAssessment.mockResolvedValue(
    buildDetailFixture({ status: 'approved', approvedAt: '2026-02-08T12:45:00.000Z' }),
  )
  mockUpdateAssessmentStatus.mockResolvedValue(buildDetailFixture({ status: 'draft' }))

  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:assessment-csv')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation((): void => {})
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation((): void => {})
})

describe('AssessmentDetailPage', (): void => {
  it('renders summary cards and German source references', async (): Promise<void> => {
    renderAssessmentDetailPage()

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
    renderAssessmentDetailPage()

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
    renderAssessmentDetailPage()

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

  it('renders refinement controls when mapping is selected and status is draft', async (): Promise<void> => {
    mockFetchAssessmentDetail.mockResolvedValueOnce(buildDetailFixture({ status: 'draft' }))

    renderAssessmentDetailPage()

    await screen.findByText('§ 30 Abs. 1 – Überprüfung')

    fireEvent.click(screen.getByText('§ 30 Abs. 1 – Überprüfung'))

    expect(await screen.findByLabelText('Status override')).toBeInTheDocument()
    expect(screen.getByLabelText(/Confidence adjustment/i)).toBeInTheDocument()
    expect(screen.getByLabelText('NIST Control ID')).toBeInTheDocument()
    expect(screen.getByLabelText('RCM Control ID')).toBeInTheDocument()
    expect(screen.getByLabelText('Override rationale')).toBeInTheDocument()
  })

  it('hides refinement controls when assessment status is approved', async (): Promise<void> => {
    mockFetchAssessmentDetail.mockResolvedValueOnce(buildDetailFixture({ status: 'approved' }))

    renderAssessmentDetailPage()

    await screen.findByText('§ 30 Abs. 1 – Überprüfung')

    fireEvent.click(screen.getByText('§ 30 Abs. 1 – Überprüfung'))

    expect(screen.queryByLabelText('Status override')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Override rationale')).not.toBeInTheDocument()
  })

  it('saves refinement, calls API, and updates local mapping state', async (): Promise<void> => {
    mockFetchAssessmentDetail.mockResolvedValueOnce(buildDetailFixture({ status: 'draft' }))

    const updatedMapping: MappingRecord = {
      ...buildDetailFixture().mappings[0],
      mappingStatus: 'mapped',
      confidence: 0.55,
      nistControlId: 'PR.AC-9',
      rcmControlId: 'RCM-99',
      rationale: 'Manual reviewer override based on audit packet.',
      isUserOverride: true,
    }

    mockUpdateMappingRecord.mockResolvedValueOnce(updatedMapping)

    renderAssessmentDetailPage()

    await screen.findByText('§ 30 Abs. 1 – Überprüfung')

    fireEvent.click(screen.getByText('§ 30 Abs. 1 – Überprüfung'))

    fireEvent.change(screen.getByLabelText('Status override'), { target: { value: 'mapped' } })
    fireEvent.change(screen.getByLabelText(/Confidence adjustment/i), { target: { value: '55' } })
    fireEvent.change(screen.getByLabelText('NIST Control ID'), { target: { value: 'PR.AC-9' } })
    fireEvent.change(screen.getByLabelText('RCM Control ID'), { target: { value: 'RCM-99' } })
    fireEvent.change(screen.getByLabelText('Override rationale'), {
      target: { value: 'Manual reviewer override based on audit packet.' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor((): void => {
      expect(mockUpdateMappingRecord).toHaveBeenCalledWith('assessment-de-1', 'map-1', {
        mappingStatus: 'mapped',
        confidence: 0.55,
        nistControlId: 'PR.AC-9',
        rcmControlId: 'RCM-99',
        rationale: 'Manual reviewer override based on audit packet.',
        isUserOverride: true,
      })
    })

    expect(await screen.findByText('Mapping refinement saved')).toBeInTheDocument()
    expect(await screen.findAllByText('PR.AC-9')).toHaveLength(2)
  })

  it('shows approval confirmation modal from the approve button', async (): Promise<void> => {
    renderAssessmentDetailPage()

    await screen.findByText('Ready for approval')

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Approve Assessment')).toBeInTheDocument()
    expect(screen.getByLabelText('Approved by')).toBeInTheDocument()
  })

  it('shows rejection confirmation modal from reject button', async (): Promise<void> => {
    renderAssessmentDetailPage()

    await screen.findByText('Ready for approval')

    fireEvent.click(screen.getByRole('button', { name: 'Reject / Send Back' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Send Assessment Back')).toBeInTheDocument()
    expect(screen.getByLabelText('Rejection reason')).toBeInTheDocument()
  })
})
