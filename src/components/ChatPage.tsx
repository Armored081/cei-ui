import { useAuth } from '../auth/AuthProvider'
import { useChatEngine } from '../hooks/useChatEngine'
import { LayoutSwitcher } from '../layouts/LayoutSwitcher'
import './ChatPage.css'

export function ChatPage(): JSX.Element {
  const { getAccessToken, logout, userEmail } = useAuth()
  const engine = useChatEngine({ getAccessToken, logout })
  return <LayoutSwitcher engine={engine} userEmail={userEmail} onLogout={(): Promise<void> => logout()} />
}
