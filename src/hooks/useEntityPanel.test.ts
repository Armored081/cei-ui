import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { EntityReference } from '../types/modern-context.js'
import { useEntityPanel } from './useEntityPanel.js'

const ENTITY_REF: EntityReference = {
  type: 'risk',
  id: 'RS-101',
  name: 'Credential Abuse',
}

describe('useEntityPanel', (): void => {
  it('openEntity updates panel state with active entity and source message id', (): void => {
    const { result } = renderHook(() => useEntityPanel('artifacts-only'))

    act((): void => {
      result.current.openEntity(ENTITY_REF, 'agent-1')
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.activeEntity).toEqual(ENTITY_REF)
    expect(result.current.sourceMessageId).toBe('agent-1')
    expect(result.current.previousRailMode).toBe('artifacts-only')
  })

  it('closePanel clears active entity and source message id', (): void => {
    const { result } = renderHook(() => useEntityPanel('stories+artifacts'))

    act((): void => {
      result.current.openEntity(ENTITY_REF, 'agent-2')
    })

    act((): void => {
      result.current.closePanel()
    })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.activeEntity).toBeNull()
    expect(result.current.sourceMessageId).toBeNull()
    expect(result.current.previousRailMode).toBe('stories+artifacts')
  })

  it('captures previousRailMode from the current mode when opening', (): void => {
    const { result, rerender } = renderHook(
      ({ mode }: { mode: 'artifacts-only' | 'stories+artifacts' }) => useEntityPanel(mode),
      {
        initialProps: { mode: 'artifacts-only' as 'artifacts-only' | 'stories+artifacts' },
      },
    )

    rerender({ mode: 'stories+artifacts' })

    act((): void => {
      result.current.openEntity(ENTITY_REF, 'agent-3')
    })

    expect(result.current.previousRailMode).toBe('stories+artifacts')
  })

  it('ignores entities with invalid type payloads at runtime', (): void => {
    const { result } = renderHook(() => useEntityPanel('artifacts-only'))

    act((): void => {
      result.current.openEntity(
        {
          type: 'not-valid',
          id: 'broken-1',
          name: 'Broken',
        } as unknown as EntityReference,
        'agent-4',
      )
    })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.activeEntity).toBeNull()
    expect(result.current.sourceMessageId).toBeNull()
  })

  it('replaces active entity when openEntity is called again', (): void => {
    const { result } = renderHook(() => useEntityPanel('artifacts-only'))

    act((): void => {
      result.current.openEntity(ENTITY_REF, 'agent-a')
      result.current.openEntity(
        {
          type: 'control',
          id: 'AC-9',
          name: 'Account Management',
        },
        'agent-b',
      )
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.activeEntity).toEqual({
      type: 'control',
      id: 'AC-9',
      name: 'Account Management',
    })
    expect(result.current.sourceMessageId).toBe('agent-b')
  })

  it('allows closePanel to be called when panel is already closed', (): void => {
    const { result } = renderHook(() => useEntityPanel('artifacts-only'))

    act((): void => {
      result.current.closePanel()
    })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.activeEntity).toBeNull()
    expect(result.current.sourceMessageId).toBeNull()
  })

  it('updates captured previous mode when reopened after mode change', (): void => {
    const { result, rerender } = renderHook(
      ({ mode }: { mode: 'artifacts-only' | 'stories+artifacts' }) => useEntityPanel(mode),
      {
        initialProps: { mode: 'artifacts-only' as 'artifacts-only' | 'stories+artifacts' },
      },
    )

    act((): void => {
      result.current.openEntity(ENTITY_REF, 'agent-1')
      result.current.closePanel()
    })

    rerender({ mode: 'stories+artifacts' })

    act((): void => {
      result.current.openEntity(ENTITY_REF, 'agent-2')
    })

    expect(result.current.previousRailMode).toBe('stories+artifacts')
  })
})
