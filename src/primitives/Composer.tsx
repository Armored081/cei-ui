import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react'

import type { ComposerAttachment } from '../hooks/useChatEngine'
import { ATTACHMENT_ACCEPT_ATTRIBUTE } from '../hooks/useChatEngine'
import { AttachmentPreview } from '../components/AttachmentPreview'
import './composer.css'

export type ComposerVariant = 'full' | 'compact' | 'floating'

export interface ComposerProps {
  variant: ComposerVariant
  draftMessage: string
  onDraftMessageChange: (value: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  isStreaming: boolean
  isAttachmentProcessing: boolean
  hasFailedAttachment: boolean

  // Attachments
  attachments: ComposerAttachment[]
  attachmentError: string
  onPickAttachment: () => void
  onRemoveAttachment: (id: string) => void
  onAttachmentInputChange: (e: ChangeEvent<HTMLInputElement>) => void
  attachmentInputRef: RefObject<HTMLInputElement>

  // Drag
  isDragOver: boolean
  onDragEnter: (e: DragEvent<HTMLFormElement>) => void
  onDragOver: (e: DragEvent<HTMLFormElement>) => void
  onDragLeave: (e: DragEvent<HTMLFormElement>) => void
  onDrop: (e: DragEvent<HTMLFormElement>) => void

  composerRef: RefObject<HTMLTextAreaElement>
}

export function Composer(props: ComposerProps): JSX.Element {
  const {
    variant,
    draftMessage,
    onDraftMessageChange,
    onSubmit,
    onKeyDown,
    isStreaming,
    isAttachmentProcessing,
    hasFailedAttachment,
    attachments,
    attachmentError,
    onPickAttachment,
    onRemoveAttachment,
    onAttachmentInputChange,
    attachmentInputRef,
    isDragOver,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    composerRef,
  } = props

  const variantClass = `cei-composer-v cei-composer-v-${variant}`
  const dragClass = isDragOver ? ' cei-composer-v-drag-over' : ''
  const formRef = useRef<HTMLFormElement>(null)

  useLayoutEffect((): void => {
    const textareaElement = composerRef.current

    if (!textareaElement) {
      return
    }

    const minHeight = 40
    const maxHeight = 160
    textareaElement.style.height = 'auto'
    const nextHeight = Math.min(maxHeight, Math.max(minHeight, textareaElement.scrollHeight))
    textareaElement.style.height = `${nextHeight.toString()}px`
    textareaElement.style.overflowY = textareaElement.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [composerRef, draftMessage, variant])

  useEffect((): (() => void) | void => {
    const formElement = formRef.current

    if (!formElement) {
      return
    }

    const syncComposerHeight = (): void => {
      const nextHeight = Math.max(40, Math.round(formElement.getBoundingClientRect().height))
      document.documentElement.style.setProperty('--composer-height', `${nextHeight.toString()}px`)
    }

    syncComposerHeight()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncComposerHeight)
      return (): void => {
        window.removeEventListener('resize', syncComposerHeight)
      }
    }

    const observer = new ResizeObserver((): void => {
      syncComposerHeight()
    })

    observer.observe(formElement)
    return (): void => {
      observer.disconnect()
    }
  }, [attachments.length, attachmentError, variant])

  return (
    <form
      className={`${variantClass}${dragClass}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onSubmit={onSubmit}
      ref={formRef}
    >
      <div className="cei-composer-v-row">
        <button
          className="cei-composer-v-paperclip"
          disabled={isStreaming}
          onClick={onPickAttachment}
          title="Attach files"
          type="button"
          aria-label="Attach files"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <input
          accept={ATTACHMENT_ACCEPT_ATTRIBUTE}
          data-testid="attachment-input"
          disabled={isStreaming}
          multiple
          onChange={onAttachmentInputChange}
          ref={attachmentInputRef}
          type="file"
          className="cei-composer-v-file-input"
        />

        <textarea
          className="cei-composer-v-textarea"
          disabled={isStreaming}
          onChange={(e): void => onDraftMessageChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Message the agent..."
          ref={composerRef}
          rows={1}
          value={draftMessage}
          id="cei-message"
          aria-label="Instruction"
        />

        <button
          className="cei-composer-v-send"
          disabled={isStreaming || isAttachmentProcessing || hasFailedAttachment}
          type="submit"
          aria-label={isStreaming ? 'Sending...' : 'Send'}
        >
          {isStreaming ? (
            <span aria-hidden="true" className="cei-spinner" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>

      <AttachmentPreview attachments={attachments} onRemoveAttachment={onRemoveAttachment} />

      {attachmentError ? (
        <p className="cei-error-text cei-composer-v-error" role="alert">
          {attachmentError}
        </p>
      ) : null}
    </form>
  )
}
