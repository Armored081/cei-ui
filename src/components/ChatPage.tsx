import { useAuth } from '../auth/AuthProvider'
import { useChatEngine } from '../hooks/useChatEngine'
import { CommandCenter } from '../layouts/CommandCenter'
import './ChatPage.css'

export function ChatPage(): JSX.Element {
  const { getAccessToken, logout, userEmail } = useAuth()
  const engine = useChatEngine({ getAccessToken, logout })
  return (
    <CommandCenter engine={engine} userEmail={userEmail} onLogout={(): Promise<void> => logout()} />
  )
}
