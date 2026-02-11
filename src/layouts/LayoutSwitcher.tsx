import { useCallback, useEffect, useState } from 'react'

import type { ChatEngine } from '../hooks/useChatEngine'
import type { LayoutId } from './types'
import { CommandCenter } from './CommandCenter'
import { Focus } from './Focus'
import { Workspace } from './Workspace'

const STORAGE_KEY = 'cei-layout-preference'
const DEFAULT_LAYOUT: LayoutId = 'command-center'

function readStoredLayout(): LayoutId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'command-center' || stored === 'focus' || stored === 'workspace') {
      return stored
    }
  } catch {
    // localStorage may be unavailable
  }
  return DEFAULT_LAYOUT
}

function persistLayout(layout: LayoutId): void {
  try {
    localStorage.setItem(STORAGE_KEY, layout)
  } catch {
    // localStorage may be unavailable
  }
}

interface LayoutSwitcherProps {
  engine: ChatEngine
  userEmail: string
  onLogout: () => void
}

export function LayoutSwitcher({ engine, userEmail, onLogout }: LayoutSwitcherProps): JSX.Element {
  const [activeLayout, setActiveLayout] = useState<LayoutId>(readStoredLayout)

  useEffect(() => {
    persistLayout(activeLayout)
  }, [activeLayout])

  const onChangeLayout = useCallback((layout: LayoutId): void => {
    setActiveLayout(layout)
  }, [])

  const layoutProps = {
    engine,
    userEmail,
    onLogout,
    activeLayout,
    onChangeLayout,
  }

  if (activeLayout === 'focus') {
    return <Focus {...layoutProps} />
  }

  if (activeLayout === 'workspace') {
    return <Workspace {...layoutProps} />
  }

  return <CommandCenter {...layoutProps} />
}
