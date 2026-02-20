import type { ChatEngine } from '../hooks/useChatEngine'
import type { ComposerProps, ComposerVariant } from './Composer'

export function composerPropsFromEngine(
  engine: ChatEngine,
  variant: ComposerVariant,
): ComposerProps {
  return {
    variant,
    draftMessage: engine.draftMessage,
    onDraftMessageChange: engine.setDraftMessage,
    onSubmit: engine.onSubmit,
    onKeyDown: engine.onComposerKeyDown,
    isStreaming: engine.isStreaming,
    isAttachmentProcessing: engine.isAttachmentProcessing,
    hasFailedAttachment: engine.hasFailedAttachment,
    attachments: engine.attachments,
    attachmentError: engine.attachmentError,
    onPickAttachment: engine.onPickAttachment,
    onRemoveAttachment: engine.removeAttachment,
    onAttachmentInputChange: engine.onAttachmentInputChange,
    attachmentInputRef: engine.attachmentInputRef,
    isDragOver: engine.isDragOver,
    onDragEnter: engine.onComposerDragEnter,
    onDragOver: engine.onComposerDragOver,
    onDragLeave: engine.onComposerDragLeave,
    onDrop: engine.onComposerDrop,
    composerRef: engine.composerRef,
  }
}
