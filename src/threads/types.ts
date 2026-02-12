export interface Thread {
  id: string
  title: string | null
  status: 'active' | 'idle' | 'archived'
  isPinned: boolean
  createdAt: string
  updatedAt: string
  lastActivityAt: string
  messageCount: number
  artifactCount: number
}

export interface Exchange {
  id: string
  threadId: string
  userMessageId: string
  agentMessageId: string | null
  createdAt: string
  completedAt: string | null
  toolCallCount: number
  status: 'active' | 'complete' | 'failed' | 'cancelled'
}
