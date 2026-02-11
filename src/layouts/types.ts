import type { ChatEngine } from '../hooks/useChatEngine'

export type LayoutId = 'command-center' | 'focus' | 'workspace'

export interface LayoutProps {
  engine: ChatEngine
  userEmail: string
  onLogout: () => void
  activeLayout: LayoutId
  onChangeLayout: (layout: LayoutId) => void
}
