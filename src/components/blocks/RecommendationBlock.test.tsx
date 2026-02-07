import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StructuredBlock } from '../../agent/types'
import { RecommendationBlock } from './RecommendationBlock'

afterEach((): void => {
  vi.restoreAllMocks()
})

function buildRecommendationBlock(
  severity: 'critical' | 'high' | 'medium' | 'low',
): Extract<StructuredBlock, { kind: 'recommendation' }> {
  return {
    body: 'Rotate credentials and enforce MFA for privileged roles.',
    kind: 'recommendation',
    severity,
    title: 'Credential Hardening',
  }
}

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject): void => {
    const reader = new FileReader()

    reader.addEventListener('load', (): void => {
      resolve(String(reader.result || ''))
    })
    reader.addEventListener('error', (): void => {
      reject(reader.error)
    })
    reader.readAsText(blob)
  })
}

describe('RecommendationBlock', (): void => {
  it.each([
    ['critical', 'CRIT'],
    ['high', 'HIGH'],
    ['medium', 'MED'],
    ['low', 'LOW'],
  ] as const)('renders %s severity styling and badge', (severity, badgeText): void => {
    render(<RecommendationBlock block={buildRecommendationBlock(severity)} />)

    expect(screen.getByTestId('recommendation-block')).toHaveClass(`cei-recommendation-${severity}`)
    expect(screen.getByTestId('recommendation-severity-badge')).toHaveTextContent(badgeText)
    expect(screen.getByText('Credential Hardening')).toBeInTheDocument()
    expect(
      screen.getByText('Rotate credentials and enforce MFA for privileged roles.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download block data' })).toBeInTheDocument()
  })

  it('downloads recommendation payload as json', async (): Promise<void> => {
    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:recommendation')
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation((): void => {})
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation((): void => {})

    const block = buildRecommendationBlock('critical')

    render(<RecommendationBlock block={block} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download block data' }))

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    expect(anchorClickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:recommendation')

    const blob = createObjectUrlSpy.mock.calls[0][0] as Blob
    const json = await readBlobAsText(blob)

    expect(JSON.parse(json)).toEqual(block)
  })
})
