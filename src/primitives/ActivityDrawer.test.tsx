import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ToolLogItem } from '../hooks/useChatEngine'
import { ActivityDrawer } from './ActivityDrawer'

afterEach((): void => {
  vi.restoreAllMocks()
})

function buildToolLogItem(overrides: Partial<ToolLogItem> = {}): ToolLogItem {
  return {
    args: { query: 'risk matrix' },
    completedAt: '2026-02-12T01:02:01.000Z',
    id: 'tool-1',
    isExpanded: false,
    name: 'db_lookup',
    result: { summary: 'lookup complete' },
    sourceMessageId: 'agent-1',
    startedAt: '2026-02-12T01:02:00.000Z',
    status: 'complete',
    ...overrides,
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

interface HarnessProps {
  currentExchangeMessageId: string | null
  toolLog: ToolLogItem[]
}

function ActivityDrawerHarness({ currentExchangeMessageId, toolLog }: HarnessProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <ActivityDrawer
      currentExchangeMessageId={currentExchangeMessageId}
      isExpanded={isExpanded}
      onToggleExpanded={(): void =>
        setIsExpanded((currentExpanded: boolean): boolean => !currentExpanded)
      }
      toolLog={toolLog}
    />
  )
}

describe('ActivityDrawer', (): void => {
  it('shows collapsed summary and exchange-scoped count', (): void => {
    const oldExchangeItem = buildToolLogItem({
      id: 'tool-old',
      sourceMessageId: 'agent-0',
    })

    const currentExchangeItem = buildToolLogItem({
      id: 'tool-current',
      name: 'risk_matrix_query',
      sourceMessageId: 'agent-1',
      status: 'running',
    })

    render(
      <ActivityDrawer
        currentExchangeMessageId="agent-1"
        isExpanded={false}
        onToggleExpanded={vi.fn()}
        toolLog={[oldExchangeItem, currentExchangeItem]}
      />,
    )

    const summaryButton = screen.getByRole('button', { name: 'Activity summary' })
    expect(summaryButton).toHaveTextContent('Querying risk matrix query...')
    expect(within(summaryButton).getByText('1')).toBeInTheDocument()
  })

  it('toggles between collapsed and expanded states', (): void => {
    render(
      <ActivityDrawerHarness
        currentExchangeMessageId="agent-1"
        toolLog={[buildToolLogItem(), buildToolLogItem({ id: 'tool-2' })]}
      />,
    )

    expect(screen.queryByRole('heading', { name: 'Activity Log' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Activity summary' }))

    expect(screen.getByRole('heading', { name: 'Activity Log' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Collapse activity log' }))

    expect(screen.queryByRole('heading', { name: 'Activity Log' })).not.toBeInTheDocument()
  })

  it('shows empty state when expanded exchange has no activity', (): void => {
    render(
      <ActivityDrawer
        currentExchangeMessageId="agent-2"
        isExpanded
        onToggleExpanded={vi.fn()}
        toolLog={[buildToolLogItem({ sourceMessageId: 'agent-1' })]}
      />,
    )

    expect(screen.getByText('No activity in this exchange yet')).toBeInTheDocument()
  })

  it('exports current exchange activity as json', async (): Promise<void> => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:activity')
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation((): void => {})
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation((): void => {})

    render(
      <ActivityDrawer
        currentExchangeMessageId="agent-1"
        isExpanded
        onToggleExpanded={vi.fn()}
        toolLog={[
          buildToolLogItem({ id: 'tool-current', sourceMessageId: 'agent-1' }),
          buildToolLogItem({ id: 'tool-old', sourceMessageId: 'agent-0' }),
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }))

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    expect(anchorClickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:activity')

    const blob = createObjectUrlSpy.mock.calls[0][0] as Blob
    const json = await readBlobAsText(blob)
    const parsed = JSON.parse(json) as {
      exchangeMessageId: string
      items: Array<{ id: string; sourceMessageId: string }>
    }

    expect(parsed.exchangeMessageId).toBe('agent-1')
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({
      id: 'tool-current',
      sourceMessageId: 'agent-1',
    })
  })
})
