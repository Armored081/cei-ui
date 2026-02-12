import type { ChatEngine } from '../hooks/useChatEngine'

export interface LayoutProps {
  engine: ChatEngine
  userEmail: string
  onLogout: () => void
}
