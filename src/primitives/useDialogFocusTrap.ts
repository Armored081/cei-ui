import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
  )
}

interface UseDialogFocusTrapParams {
  containerRef: RefObject<HTMLElement>
  isOpen: boolean
}

/**
 * Traps focus inside a dialog while open and restores prior focus on close.
 */
export function useDialogFocusTrap({ containerRef, isOpen }: UseDialogFocusTrapParams): void {
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)

  useEffect((): (() => void) | void => {
    if (!isOpen || !containerRef.current) {
      return
    }

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const dialogContainer = containerRef.current

    const focusables = focusableElements(dialogContainer)

    if (focusables.length > 0) {
      focusables[0].focus()
    } else {
      dialogContainer.focus()
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') {
        return
      }

      const tabSequence = focusableElements(dialogContainer)

      if (tabSequence.length === 0) {
        event.preventDefault()
        dialogContainer.focus()
        return
      }

      const first = tabSequence[0]
      const last = tabSequence[tabSequence.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
        return
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    dialogContainer.addEventListener('keydown', onKeyDown)

    return (): void => {
      dialogContainer.removeEventListener('keydown', onKeyDown)

      const previous = previouslyFocusedElementRef.current
      if (previous && document.contains(previous)) {
        previous.focus()
      }
    }
  }, [containerRef, isOpen])
}
