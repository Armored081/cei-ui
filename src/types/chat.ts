import type { AttachmentInput, StructuredBlock } from '../agent/types'

/** Supported timeline message roles. */
export type ChatMessageRole = 'user' | 'agent'

/** Tool activity lifecycle states. */
export type ToolActivityStatus = 'running' | 'complete'

/** Optional confidence level associated with artifact-producing segments. */
export type ArtifactConfidence = 'high' | 'medium' | 'low' | 'unknown'

/** Optional transparency payload attached to artifact-producing segments. */
export type ArtifactReasoning = string | Record<string, unknown>

/** Task step status in task-progress updates. */
export type TaskProgressStepStatus = 'complete' | 'active' | 'pending'

/** Individual progress step in a task-progress segment. */
export interface TaskProgressStep {
  name: string
  status: TaskProgressStepStatus
}

/** In-stream task progress payload for long-running agent operations. */
export interface TaskProgressSegment {
  taskName: string
  totalSteps: number
  completedSteps: number
  currentStep: string
  steps: TaskProgressStep[]
}

/** Tool activity emitted during assistant generation. */
export interface ToolActivityItem {
  args: Record<string, unknown>
  completedAt?: string
  id: string
  isExpanded: boolean
  name: string
  result: unknown
  startedAt?: string
  status: ToolActivityStatus
}

/** A content segment for a chat message. */
export type ChatMessageSegment =
  | {
      content: string
      type: 'text'
    }
  | {
      block: StructuredBlock
      type: 'block'
      confidence?: ArtifactConfidence
      confidenceDecay?: string
      reasoning?: ArtifactReasoning
    }
  | {
      progress: TaskProgressSegment
      type: 'task-progress'
    }

/** Timeline message item. */
export interface ChatMessageItem {
  attachments?: AttachmentInput[]
  canRetry?: boolean
  errorText: string
  id: string
  isStreaming: boolean
  retryPrompt?: string
  role: ChatMessageRole
  segments: ChatMessageSegment[]
  tools: ToolActivityItem[]
  type: 'message'
}

/** User-authored message item. */
export type UserMessage = ChatMessageItem & { role: 'user' }

/** Assistant-authored message item. */
export type AssistantMessage = ChatMessageItem & { role: 'agent' }

/** Placeholder system message type reserved for upcoming phases. */
export interface SystemMessage {
  content: string
  id: string
  type: 'system'
}

/** Placeholder tool message type reserved for upcoming phases. */
export interface ToolMessage {
  id: string
  name: string
  result: unknown
  type: 'tool'
}

/** Visual separator between threads inside a unified timeline. */
export interface ThreadSeparatorItem {
  id: string
  label: string
  type: 'thread_separator'
}

/** Items rendered in the conversation timeline. */
export type ChatTimelineItem = ChatMessageItem | ThreadSeparatorItem

/** Thread metadata tracked in the client shell. */
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

/** Exchange metadata for future thread persistence features. */
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
