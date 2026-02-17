import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { useChatEngine } from '../hooks/useChatEngine'
import { CommandCenter } from '../layouts/CommandCenter'
import './ChatPage.css'

export function ChatPage(): JSX.Element {
  const { getAccessToken, logout, userEmail } = useAuth()
  const engine = useChatEngine({ getAccessToken, logout })
  const [searchParams] = useSearchParams()
  const hasAppliedDraftRef = useRef<boolean>(false)

  useEffect((): void => {
    if (hasAppliedDraftRef.current) {
      return
    }

    hasAppliedDraftRef.current = true
    const draft = searchParams.get('draft')

    if (!draft) {
      return
    }

    const decodedDraft = decodeURIComponent(draft)

    if (!decodedDraft.trim()) {
      return
    }

    engine.setDraftMessage(decodedDraft)
  }, [engine, searchParams])

  return (
    <CommandCenter engine={engine} userEmail={userEmail} onLogout={(): Promise<void> => logout()} />
  )
}
