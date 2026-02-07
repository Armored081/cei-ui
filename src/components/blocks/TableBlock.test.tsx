import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StructuredBlock } from '../../agent/types'
import { TableBlock } from './TableBlock'

afterEach((): void => {
  vi.restoreAllMocks()
})

function buildTableBlock(): Extract<StructuredBlock, { kind: 'table' }> {
  return {
    columns: ['name', 'score'],
    kind: 'table',
    rows: [
      { name: 'bravo', score: 30 },
      { name: 'alpha', score: 10 },
      { name: 'charlie', score: 20 },
    ],
    title: 'Top Findings',
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

describe('TableBlock', (): void => {
  it('renders table rows and sorts by column when header is clicked', (): void => {
    render(<TableBlock block={buildTableBlock()} />)

    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('bravo')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /score/i }))

    const ascendingRows = screen.getAllByRole('row')
    expect(within(ascendingRows[1]).getByText('alpha')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /score/i }))

    const descendingRows = screen.getAllByRole('row')
    expect(within(descendingRows[1]).getByText('bravo')).toBeInTheDocument()
  })

  it('downloads table payload as json', async (): Promise<void> => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:table')
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation((): void => {})
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation((): void => {})

    const block = buildTableBlock()

    render(<TableBlock block={block} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download block data' }))

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    expect(anchorClickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:table')

    const blob = createObjectUrlSpy.mock.calls[0][0] as Blob
    const json = await readBlobAsText(blob)

    expect(JSON.parse(json)).toEqual(block)
  })
})
