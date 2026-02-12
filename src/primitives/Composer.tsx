import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, RefObject } from 'react'

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

  // Actions
  onNewThread: () => void
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
    onNewThread,
    composerRef,
  } = props

  const variantClass = `cei-composer-v cei-composer-v-${variant}`
  const dragClass = isDragOver ? ' cei-composer-v-drag-over' : ''

  return (
    <form
      className={`${variantClass}${dragClass}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onSubmit={onSubmit}
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
          rows={variant === 'compact' ? 1 : 2}
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

      {variant === 'full' ? (
        <div className="cei-composer-v-actions">
          <button
            className="cei-button-secondary cei-composer-v-new-thread"
            onClick={onNewThread}
            type="button"
          >
            New Thread
          </button>
        </div>
      ) : null}
    </form>
  )
}
