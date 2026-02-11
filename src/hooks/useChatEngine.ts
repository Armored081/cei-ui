import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { v4 as uuidv4 } from 'uuid'

import { invokeAgentStream } from '../agent/AgentClient'
import type { AttachmentInput, StructuredBlock } from '../agent/types'
import { describeAuthError } from '../auth/AuthProvider'
import type {
  ChatMessageItem,
  ChatMessageSegment,
  ChatTimelineItem,
  ToolActivityItem,
} from '../components/ChatMessageList'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error'

export interface FriendlyError {
  bannerText: string
  canRetry: boolean
  messageText: string
  shouldRelogin: boolean
}

export type AttachmentStatus = 'processing' | 'ready' | 'error'

export interface ComposerAttachment {
  data: string
  errorText: string
  id: string
  mime: string
  name: string
  progressPercent: number
  sizeBytes: number
  status: AttachmentStatus
}

export interface Artifact {
  id: string
  sourceMessageId: string
  segmentIndex: number
  block: StructuredBlock
  kind: string
  title: string
}

export interface ToolLogItem extends ToolActivityItem {
  sourceMessageId: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024
export const MAX_ATTACHMENTS_PER_MESSAGE = 3
export const ATTACHMENT_ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const
export const ATTACHMENT_ACCEPT_ATTRIBUTE = ATTACHMENT_ACCEPTED_MIME_TYPES.join(',')

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function statusLabel(status: StreamStatus): string {
  if (status === 'connecting') {
    return 'Connecting...'
  }

  if (status === 'streaming') {
    return 'Streaming...'
  }

  if (status === 'done') {
    return 'Done'
  }

  if (status === 'error') {
    return 'Error'
  }

  return 'Idle'
}

export function isLikelyAuthExpiry(code: string, message: string): boolean {
  if (code === 'auth_error') {
    return true
  }

  const normalized = message.toLowerCase()

  return (
    normalized.includes('session expired') ||
    normalized.includes('token expired') ||
    normalized.includes('jwt expired') ||
    normalized.includes('no access token') ||
    normalized.includes('unauthorized') ||
    (normalized.includes('401') && normalized.includes('unauthorized'))
  )
}

export function toFriendlyError(code: string, message: string): FriendlyError {
  if (code === 'forbidden_error') {
    return {
      bannerText: 'You do not have permission to perform this action.',
      canRetry: false,
      messageText: 'Access denied. Contact your administrator if you believe this is an error.',
      shouldRelogin: false,
    }
  }

  if (code === 'connection_error') {
    return {
      bannerText: 'Unable to reach the CEI service. Check your connection and try again.',
      canRetry: true,
      messageText: 'Network connection failed before a response was received.',
      shouldRelogin: false,
    }
  }

  if (code === 'stream_interrupted') {
    return {
      bannerText: 'The response was interrupted before completion.',
      canRetry: true,
      messageText: 'Stream interrupted. Retry to continue this thread.',
      shouldRelogin: false,
    }
  }

  if (isLikelyAuthExpiry(code, message)) {
    return {
      bannerText: 'Your session expired. Please sign in again.',
      canRetry: false,
      messageText: 'Session expired. Sign in again to continue this conversation.',
      shouldRelogin: true,
    }
  }

  if (code === 'configuration_error') {
    return {
      bannerText: 'App configuration is incomplete. Contact your administrator.',
      canRetry: false,
      messageText: 'Missing required API configuration.',
      shouldRelogin: false,
    }
  }

  if (code === 'http_error' || code === 'response_parse_error' || code === 'stream_error') {
    return {
      bannerText: 'The CEI service returned an unexpected response. Please retry.',
      canRetry: true,
      messageText: 'The response could not be processed successfully.',
      shouldRelogin: false,
    }
  }

  return {
    bannerText: 'Something went wrong while processing your request. Please try again.',
    canRetry: true,
    messageText: 'Request failed. Retry when ready.',
    shouldRelogin: false,
  }
}

function isMessageItem(item: ChatTimelineItem): item is ChatMessageItem {
  return item.type === 'message'
}

function appendTextSegment(segments: ChatMessageSegment[], content: string): ChatMessageSegment[] {
  if (!content) {
    return segments
  }

  const nextSegments = [...segments]
  const lastSegment = nextSegments[nextSegments.length - 1]

  if (lastSegment?.type === 'text') {
    nextSegments[nextSegments.length - 1] = {
      ...lastSegment,
      content: `${lastSegment.content}${content}`,
    }

    return nextSegments
  }

  nextSegments.push({
    content,
    type: 'text',
  })

  return nextSegments
}

function appendBlockSegment(
  segments: ChatMessageSegment[],
  block: StructuredBlock,
): ChatMessageSegment[] {
  return [
    ...segments,
    {
      block,
      type: 'block',
    },
  ]
}

function hasRenderableSegment(segments: ChatMessageSegment[]): boolean {
  return segments.some((segment) => {
    if (segment.type === 'text') {
      return Boolean(segment.content)
    }

    return true
  })
}

function buildUserMessage(content: string): ChatMessageItem {
  return {
    canRetry: false,
    errorText: '',
    id: uuidv4(),
    isStreaming: false,
    retryPrompt: '',
    role: 'user',
    segments: [{ content, type: 'text' }],
    tools: [],
    type: 'message',
  }
}

function buildAgentMessage(retryPrompt: string, attachments?: AttachmentInput[]): ChatMessageItem {
  return {
    attachments,
    canRetry: false,
    errorText: '',
    id: uuidv4(),
    isStreaming: true,
    retryPrompt,
    role: 'agent',
    segments: [],
    tools: [],
    type: 'message',
  }
}

export function isSupportedAttachmentMimeType(mime: string): boolean {
  return (ATTACHMENT_ACCEPTED_MIME_TYPES as readonly string[]).includes(mime)
}

function toAttachmentInput(attachment: ComposerAttachment): AttachmentInput {
  return {
    name: attachment.name,
    mime: attachment.mime,
    data: attachment.data,
    sizeBytes: attachment.sizeBytes,
  }
}

function extractBase64FromDataUrl(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',')

  if (commaIndex < 0) {
    throw new Error('Unable to encode attachment data')
  }

  return dataUrl.slice(commaIndex + 1)
}

function readFileAsBase64(
  file: File,
  onProgress: (progressPercent: number) => void,
): Promise<string> {
  return new Promise<string>((resolve, reject): void => {
    const reader = new FileReader()

    reader.onprogress = (event: ProgressEvent<FileReader>): void => {
      if (!event.lengthComputable) {
        return
      }

      const progressPercent = Math.min(100, Math.round((event.loaded / event.total) * 100))
      onProgress(progressPercent)
    }

    reader.onload = (): void => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unable to encode attachment data'))
        return
      }

      try {
        resolve(extractBase64FromDataUrl(reader.result))
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = (): void => {
      reject(new Error(`Failed to read ${file.name}`))
    }

    reader.readAsDataURL(file)
  })
}

function hasFilesInDataTransfer(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false
  }

  return Array.from(dataTransfer.types).includes('Files')
}

// ---------------------------------------------------------------------------
// ChatEngine interface
// ---------------------------------------------------------------------------

export interface ChatEngine {
  // Core state
  timelineItems: ChatTimelineItem[]
  streamStatus: StreamStatus
  sessionId: string
  isStreaming: boolean
  statusLabelText: string

  // Derived
  messages: ChatMessageItem[]
  artifacts: Artifact[]
  toolLog: ToolLogItem[]

  // Composer state
  draftMessage: string
  setDraftMessage: (v: string) => void
  errorBanner: string
  setErrorBanner: (v: string) => void
  attachmentError: string
  attachments: ComposerAttachment[]
  isDragOver: boolean
  isAttachmentProcessing: boolean
  hasFailedAttachment: boolean

  // Actions
  submitPrompt: (msg: string, retryAttachments?: AttachmentInput[]) => Promise<void>
  cancelActiveStream: () => void
  createNewThread: () => void
  onRetryMessage: (messageId: string) => void
  onToggleTool: (messageId: string, toolId: string) => void

  // Attachment actions
  addFilesToAttachments: (files: File[]) => void
  removeAttachment: (id: string) => void
  onAttachmentInputChange: (e: ChangeEvent<HTMLInputElement>) => void
  onPickAttachment: () => void

  // Drag handlers
  onComposerDragEnter: (e: DragEvent<HTMLFormElement>) => void
  onComposerDragOver: (e: DragEvent<HTMLFormElement>) => void
  onComposerDragLeave: (e: DragEvent<HTMLFormElement>) => void
  onComposerDrop: (e: DragEvent<HTMLFormElement>) => void

  // Form handlers
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  onComposerKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void

  // Refs
  attachmentInputRef: RefObject<HTMLInputElement>
  composerRef: RefObject<HTMLTextAreaElement>
  messageListRef: RefObject<HTMLDivElement>

  // Scroll
  updateMessageScrollIntent: () => void
  scrollToBottom: () => void
}

// ---------------------------------------------------------------------------
// Hook params
// ---------------------------------------------------------------------------

export interface UseChatEngineParams {
  getAccessToken: () => Promise<string>
  logout: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useChatEngine(params: UseChatEngineParams): ChatEngine {
  const { getAccessToken, logout } = params

  const [draftMessage, setDraftMessage] = useState<string>('')
  const [errorBanner, setErrorBanner] = useState<string>('')
  const [attachmentError, setAttachmentError] = useState<string>('')
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([])
  const [isDragOver, setIsDragOver] = useState<boolean>(false)
  const [sessionId, setSessionId] = useState<string>(uuidv4())
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle')
  const [timelineItems, setTimelineItems] = useState<ChatTimelineItem[]>([])

  const activeAbortControllerRef = useRef<AbortController | null>(null)
  const activeStreamIdRef = useRef<number>(0)
  const activeAgentMessageIdRef = useRef<string | null>(null)
  const isMountedRef = useRef<boolean>(true)
  const attachmentsRef = useRef<ComposerAttachment[]>([])
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef<boolean>(true)

  const statusLabelText = useMemo((): string => statusLabel(streamStatus), [streamStatus])
  const isStreaming = streamStatus === 'connecting' || streamStatus === 'streaming'
  const isAttachmentProcessing = attachments.some(
    (attachment: ComposerAttachment): boolean => attachment.status === 'processing',
  )
  const hasFailedAttachment = attachments.some(
    (attachment: ComposerAttachment): boolean => attachment.status === 'error',
  )

  // Derived: messages only
  const messages = useMemo(
    () => timelineItems.filter((item): item is ChatMessageItem => item.type === 'message'),
    [timelineItems],
  )

  // Derived: artifacts from block segments
  const artifacts = useMemo((): Artifact[] => {
    const result: Artifact[] = []
    for (const msg of messages) {
      msg.segments.forEach((seg, segIndex) => {
        if (seg.type === 'block') {
          result.push({
            id: `${msg.id}-block-${segIndex.toString()}`,
            sourceMessageId: msg.id,
            segmentIndex: segIndex,
            block: seg.block,
            kind: seg.block.kind,
            title: seg.block.title,
          })
        }
      })
    }
    return result
  }, [messages])

  // Derived: tool log
  const toolLog = useMemo((): ToolLogItem[] => {
    const result: ToolLogItem[] = []
    for (const msg of messages) {
      for (const tool of msg.tools) {
        result.push({ ...tool, sourceMessageId: msg.id })
      }
    }
    return result
  }, [messages])

  // Scroll helpers
  const updateMessageScrollIntent = (): void => {
    const messageListElement = messageListRef.current

    if (!messageListElement) {
      return
    }

    const distanceFromBottom =
      messageListElement.scrollHeight -
      (messageListElement.scrollTop + messageListElement.clientHeight)

    shouldAutoScrollRef.current = distanceFromBottom < 24
  }

  const scrollToBottom = (): void => {
    const messageListElement = messageListRef.current

    if (!messageListElement) {
      return
    }

    messageListElement.scrollTop = messageListElement.scrollHeight
  }

  // Auto-scroll on new items
  useEffect((): void => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom()
    }
  }, [timelineItems])

  // Sync attachments ref
  useEffect((): void => {
    attachmentsRef.current = attachments
  }, [attachments])

  // Cleanup on unmount
  useEffect((): (() => void) => {
    isMountedRef.current = true

    return (): void => {
      isMountedRef.current = false
      activeStreamIdRef.current += 1
      activeAbortControllerRef.current?.abort()
      activeAbortControllerRef.current = null
    }
  }, [])

  // Focus composer when not streaming
  useEffect((): void => {
    if (!isStreaming) {
      composerRef.current?.focus()
    }
  }, [isStreaming])

  // Message state updater
  const setAgentMessageState = (
    messageId: string,
    updater: (message: ChatMessageItem) => ChatMessageItem,
  ): void => {
    setTimelineItems((currentItems: ChatTimelineItem[]): ChatTimelineItem[] => {
      return currentItems.map((item: ChatTimelineItem): ChatTimelineItem => {
        if (!isMessageItem(item) || item.id !== messageId) {
          return item
        }

        return updater(item)
      })
    })
  }

  const cancelActiveStream = (): void => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort()
      activeAbortControllerRef.current = null
    }

    activeStreamIdRef.current += 1
  }

  // Escape key listener
  useEffect((): (() => void) => {
    const onWindowKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return
      }

      if (!isStreaming) {
        return
      }

      cancelActiveStream()
      setStreamStatus('idle')

      const pendingMessageId = activeAgentMessageIdRef.current
      if (pendingMessageId) {
        setTimelineItems((currentItems: ChatTimelineItem[]): ChatTimelineItem[] => {
          return currentItems.filter((item: ChatTimelineItem): boolean => {
            if (!isMessageItem(item) || item.id !== pendingMessageId) {
              return true
            }
            return item.segments.length > 0 || item.tools.length > 0 || item.errorText !== ''
          })
        })
        activeAgentMessageIdRef.current = null
      }
    }

    window.addEventListener('keydown', onWindowKeyDown)

    return (): void => {
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [isStreaming])

  const createNewThread = (): void => {
    cancelActiveStream()
    setSessionId(uuidv4())
    setTimelineItems([
      {
        id: uuidv4(),
        label: 'New thread started',
        type: 'thread_separator',
      },
    ])
    setDraftMessage('')
    setAttachmentError('')
    setAttachments([])
    setIsDragOver(false)
    setErrorBanner('')
    setStreamStatus('idle')
    composerRef.current?.focus()
  }

  // Attachment helpers
  const updateAttachmentById = (
    attachmentId: string,
    updater: (attachment: ComposerAttachment) => ComposerAttachment,
  ): void => {
    setAttachments((currentAttachments: ComposerAttachment[]): ComposerAttachment[] => {
      return currentAttachments.map((attachment: ComposerAttachment): ComposerAttachment => {
        if (attachment.id !== attachmentId) {
          return attachment
        }

        return updater(attachment)
      })
    })
  }

  const encodeAttachment = async (attachmentId: string, file: File): Promise<void> => {
    try {
      const base64Data = await readFileAsBase64(file, (progressPercent: number): void => {
        if (!isMountedRef.current) {
          return
        }

        updateAttachmentById(
          attachmentId,
          (attachment: ComposerAttachment): ComposerAttachment => ({
            ...attachment,
            progressPercent,
            status: 'processing',
          }),
        )
      })

      if (!isMountedRef.current) {
        return
      }

      updateAttachmentById(
        attachmentId,
        (attachment: ComposerAttachment): ComposerAttachment => ({
          ...attachment,
          data: base64Data,
          errorText: '',
          progressPercent: 100,
          status: 'ready',
        }),
      )
    } catch (encodeError) {
      if (!isMountedRef.current) {
        return
      }

      const errorMessage = encodeError instanceof Error ? encodeError.message : 'Attachment failed'

      updateAttachmentById(
        attachmentId,
        (attachment: ComposerAttachment): ComposerAttachment => ({
          ...attachment,
          errorText: errorMessage,
          progressPercent: 0,
          status: 'error',
        }),
      )
      setAttachmentError('One or more attachments failed to upload. Remove and retry.')
    }
  }

  const removeAttachment = (attachmentId: string): void => {
    setAttachments((currentAttachments: ComposerAttachment[]): ComposerAttachment[] => {
      return currentAttachments.filter(
        (attachment: ComposerAttachment): boolean => attachment.id !== attachmentId,
      )
    })
    setAttachmentError('')
  }

  const addFilesToAttachments = (files: File[]): void => {
    if (files.length === 0) {
      return
    }

    setAttachmentError('')

    const availableSlots = MAX_ATTACHMENTS_PER_MESSAGE - attachmentsRef.current.length
    if (availableSlots <= 0) {
      setAttachmentError(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`)
      return
    }

    const filesWithinLimit = files.slice(0, availableSlots)

    if (files.length > filesWithinLimit.length) {
      setAttachmentError(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`)
    }

    const pendingAttachments: Array<{ attachmentId: string; file: File }> = []

    for (const file of filesWithinLimit) {
      if (!isSupportedAttachmentMimeType(file.type)) {
        setAttachmentError(`File "${file.name}" has an unsupported MIME type.`)
        continue
      }

      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        setAttachmentError(`File "${file.name}" exceeds the 5MB limit.`)
        continue
      }

      const attachmentId = uuidv4()
      pendingAttachments.push({ attachmentId, file })
    }

    if (pendingAttachments.length === 0) {
      return
    }

    setAttachments((currentAttachments: ComposerAttachment[]): ComposerAttachment[] => [
      ...currentAttachments,
      ...pendingAttachments.map(
        ({ attachmentId, file }): ComposerAttachment => ({
          data: '',
          errorText: '',
          id: attachmentId,
          mime: file.type,
          name: file.name,
          progressPercent: 0,
          sizeBytes: file.size,
          status: 'processing',
        }),
      ),
    ])

    for (const pendingAttachment of pendingAttachments) {
      void encodeAttachment(pendingAttachment.attachmentId, pendingAttachment.file)
    }
  }

  const onAttachmentInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const nextFiles = event.target.files ? Array.from(event.target.files) : []
    addFilesToAttachments(nextFiles)
    event.target.value = ''
  }

  const onPickAttachment = (): void => {
    attachmentInputRef.current?.click()
  }

  // Drag handlers
  const onComposerDragEnter = (event: DragEvent<HTMLFormElement>): void => {
    if (!hasFilesInDataTransfer(event.dataTransfer)) {
      return
    }

    event.preventDefault()

    if (isStreaming) {
      return
    }

    setIsDragOver(true)
  }

  const onComposerDragOver = (event: DragEvent<HTMLFormElement>): void => {
    if (!hasFilesInDataTransfer(event.dataTransfer)) {
      return
    }

    event.preventDefault()

    if (isStreaming) {
      return
    }

    setIsDragOver(true)
  }

  const onComposerDragLeave = (event: DragEvent<HTMLFormElement>): void => {
    const relatedTarget = event.relatedTarget
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
      return
    }

    setIsDragOver(false)
  }

  const onComposerDrop = (event: DragEvent<HTMLFormElement>): void => {
    if (!hasFilesInDataTransfer(event.dataTransfer)) {
      return
    }

    event.preventDefault()

    if (isStreaming) {
      return
    }

    setIsDragOver(false)
    const droppedFiles = Array.from(event.dataTransfer.files)
    addFilesToAttachments(droppedFiles)
  }

  // Submit
  const submitPrompt = async (
    messageToSend: string,
    retryAttachments?: AttachmentInput[],
  ): Promise<void> => {
    const trimmedMessage = messageToSend.trim()

    if (!trimmedMessage) {
      return
    }

    if (!retryAttachments && isAttachmentProcessing) {
      setAttachmentError('Please wait for attachments to finish uploading.')
      return
    }

    if (!retryAttachments && hasFailedAttachment) {
      setAttachmentError('Remove failed attachments before sending.')
      return
    }

    const requestAttachments: AttachmentInput[] =
      retryAttachments ||
      attachments
        .filter((attachment: ComposerAttachment): boolean => attachment.status === 'ready')
        .map((attachment: ComposerAttachment): AttachmentInput => toAttachmentInput(attachment))

    cancelActiveStream()

    const streamId = activeStreamIdRef.current + 1
    activeStreamIdRef.current = streamId

    const abortController = new AbortController()
    activeAbortControllerRef.current = abortController

    const requestId = uuidv4()
    const userMessage = buildUserMessage(trimmedMessage)
    const agentMessage = buildAgentMessage(trimmedMessage, requestAttachments)

    activeAgentMessageIdRef.current = agentMessage.id

    setDraftMessage('')
    setAttachmentError('')
    setAttachments([])
    setIsDragOver(false)
    setErrorBanner('')
    setStreamStatus('connecting')
    setTimelineItems((currentItems: ChatTimelineItem[]): ChatTimelineItem[] => [
      ...currentItems,
      userMessage,
      agentMessage,
    ])

    let sawDoneEvent = false
    let sawErrorEvent = false

    try {
      const accessToken = await getAccessToken()

      if (
        !isMountedRef.current ||
        activeStreamIdRef.current !== streamId ||
        abortController.signal.aborted
      ) {
        return
      }

      for await (const streamEvent of invokeAgentStream({
        accessToken,
        attachments: requestAttachments,
        message: trimmedMessage,
        requestId,
        sessionId,
        signal: abortController.signal,
      })) {
        if (
          !isMountedRef.current ||
          activeStreamIdRef.current !== streamId ||
          abortController.signal.aborted
        ) {
          return
        }

        if (streamEvent.type === 'delta') {
          setStreamStatus('streaming')
          setAgentMessageState(
            agentMessage.id,
            (currentMessage: ChatMessageItem): ChatMessageItem => ({
              ...currentMessage,
              isStreaming: true,
              segments: appendTextSegment(currentMessage.segments, streamEvent.content),
            }),
          )
          continue
        }

        if (streamEvent.type === 'block') {
          setStreamStatus('streaming')
          setAgentMessageState(
            agentMessage.id,
            (currentMessage: ChatMessageItem): ChatMessageItem => ({
              ...currentMessage,
              isStreaming: true,
              segments: appendBlockSegment(currentMessage.segments, streamEvent.block),
            }),
          )
          continue
        }

        if (streamEvent.type === 'tool_call') {
          setStreamStatus('streaming')
          setAgentMessageState(
            agentMessage.id,
            (currentMessage: ChatMessageItem): ChatMessageItem => ({
              ...currentMessage,
              tools: [
                ...currentMessage.tools,
                {
                  args: streamEvent.args,
                  id: uuidv4(),
                  isExpanded: true,
                  name: streamEvent.name,
                  result: null,
                  status: 'running',
                },
              ],
            }),
          )
          continue
        }

        if (streamEvent.type === 'tool_result') {
          setAgentMessageState(
            agentMessage.id,
            (currentMessage: ChatMessageItem): ChatMessageItem => {
              const nextTools = [...currentMessage.tools]
              let matchedIndex = -1

              for (let index = nextTools.length - 1; index >= 0; index -= 1) {
                const tool = nextTools[index]

                if (tool.name === streamEvent.name && tool.status === 'running') {
                  matchedIndex = index
                  break
                }
              }

              if (matchedIndex === -1) {
                nextTools.push({
                  args: {},
                  id: uuidv4(),
                  isExpanded: false,
                  name: streamEvent.name,
                  result: streamEvent.result,
                  status: 'complete',
                })
              } else {
                nextTools[matchedIndex] = {
                  ...nextTools[matchedIndex],
                  isExpanded: false,
                  result: streamEvent.result,
                  status: 'complete',
                }
              }

              return {
                ...currentMessage,
                tools: nextTools,
              }
            },
          )
          continue
        }

        if (streamEvent.type === 'error') {
          sawErrorEvent = true
          activeAgentMessageIdRef.current = null
          const friendlyError = toFriendlyError(streamEvent.code, streamEvent.message)
          setErrorBanner(friendlyError.bannerText)
          setStreamStatus('error')
          setAgentMessageState(
            agentMessage.id,
            (currentMessage: ChatMessageItem): ChatMessageItem => ({
              ...currentMessage,
              canRetry: friendlyError.canRetry,
              errorText: friendlyError.messageText,
              isStreaming: false,
            }),
          )

          if (friendlyError.shouldRelogin) {
            try {
              await logout()
            } catch {
              // Logout failure is non-critical here; user will be redirected on next auth check
            }
          }

          return
        }

        if (streamEvent.type === 'done') {
          sawDoneEvent = true
          setStreamStatus('done')
          activeAgentMessageIdRef.current = null
          setAgentMessageState(
            agentMessage.id,
            (currentMessage: ChatMessageItem): ChatMessageItem => {
              const nextSegments = hasRenderableSegment(currentMessage.segments)
                ? currentMessage.segments
                : appendTextSegment(currentMessage.segments, streamEvent.summary || '')

              return {
                ...currentMessage,
                isStreaming: false,
                segments: nextSegments,
              }
            },
          )
        }
      }

      if (!sawDoneEvent && !sawErrorEvent && !abortController.signal.aborted && isMountedRef.current) {
        setStreamStatus('done')
        setAgentMessageState(
          agentMessage.id,
          (currentMessage: ChatMessageItem): ChatMessageItem => ({
            ...currentMessage,
            isStreaming: false,
          }),
        )
      }
    } catch (submitError) {
      if (
        !isMountedRef.current ||
        activeStreamIdRef.current !== streamId ||
        abortController.signal.aborted
      ) {
        return
      }

      activeAgentMessageIdRef.current = null
      const authErrorMessage = describeAuthError(submitError)
      const friendlyError = toFriendlyError('auth_client_error', authErrorMessage)
      setErrorBanner(friendlyError.bannerText)
      setStreamStatus('error')
      setAgentMessageState(
        agentMessage.id,
        (currentMessage: ChatMessageItem): ChatMessageItem => ({
          ...currentMessage,
          canRetry: friendlyError.canRetry,
          errorText: friendlyError.messageText,
          isStreaming: false,
        }),
      )

      if (friendlyError.shouldRelogin) {
        try {
          await logout()
        } catch {
          // Logout failure is non-critical here; user will be redirected on next auth check
        }
      }
    } finally {
      if (isMountedRef.current) {
        setAgentMessageState(
          agentMessage.id,
          (currentMessage: ChatMessageItem): ChatMessageItem => ({
            ...currentMessage,
            isStreaming: false,
          }),
        )
      }

      if (
        activeStreamIdRef.current === streamId &&
        activeAbortControllerRef.current === abortController
      ) {
        activeAbortControllerRef.current = null
      }
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    void submitPrompt(draftMessage)
  }

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submitPrompt(draftMessage)
    }
  }

  const onToggleTool = (messageId: string, toolId: string): void => {
    setTimelineItems((currentItems: ChatTimelineItem[]): ChatTimelineItem[] => {
      return currentItems.map((item: ChatTimelineItem): ChatTimelineItem => {
        if (!isMessageItem(item) || item.id !== messageId) {
          return item
        }

        return {
          ...item,
          tools: item.tools.map((tool) => {
            if (tool.id !== toolId) {
              return tool
            }

            return {
              ...tool,
              isExpanded: !tool.isExpanded,
            }
          }),
        }
      })
    })
  }

  const onRetryMessage = (messageId: string): void => {
    if (isStreaming) {
      return
    }

    const retrySource = timelineItems.find((item: ChatTimelineItem): boolean => {
      return isMessageItem(item) && item.id === messageId
    })

    if (!retrySource || !isMessageItem(retrySource) || !retrySource.retryPrompt) {
      return
    }

    setTimelineItems((currentItems: ChatTimelineItem[]): ChatTimelineItem[] => {
      return currentItems.map((item: ChatTimelineItem): ChatTimelineItem => {
        if (!isMessageItem(item) || item.id !== messageId) {
          return item
        }

        return {
          ...item,
          canRetry: false,
        }
      })
    })

    void submitPrompt(retrySource.retryPrompt, retrySource.attachments)
  }

  return {
    // Core state
    timelineItems,
    streamStatus,
    sessionId,
    isStreaming,
    statusLabelText,

    // Derived
    messages,
    artifacts,
    toolLog,

    // Composer state
    draftMessage,
    setDraftMessage,
    errorBanner,
    setErrorBanner,
    attachmentError,
    attachments,
    isDragOver,
    isAttachmentProcessing,
    hasFailedAttachment,

    // Actions
    submitPrompt,
    cancelActiveStream,
    createNewThread,
    onRetryMessage,
    onToggleTool,

    // Attachment actions
    addFilesToAttachments,
    removeAttachment,
    onAttachmentInputChange,
    onPickAttachment,

    // Drag handlers
    onComposerDragEnter,
    onComposerDragOver,
    onComposerDragLeave,
    onComposerDrop,

    // Form handlers
    onSubmit,
    onComposerKeyDown,

    // Refs
    attachmentInputRef,
    composerRef,
    messageListRef,

    // Scroll
    updateMessageScrollIntent,
    scrollToBottom,
  }
}
