import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import './resizable-split.css'

interface ResizableSplitProps {
  direction: 'vertical'
  initialRatio: number
  minRatio?: number
  maxRatio?: number
  topContent: ReactNode
  bottomContent: ReactNode
}

export function ResizableSplit({
  initialRatio,
  minRatio = 0.2,
  maxRatio = 0.8,
  topContent,
  bottomContent,
}: ResizableSplitProps): JSX.Element {
  const [ratio, setRatio] = useState(initialRatio)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const onMouseDown = useCallback((): void => {
    isDragging.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const onMouseMove = useCallback(
    (e: MouseEvent): void => {
      if (!isDragging.current || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      let newRatio = y / rect.height
      newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio))
      setRatio(newRatio)
    },
    [minRatio, maxRatio],
  )

  const onMouseUp = useCallback((): void => {
    isDragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  const onDoubleClick = (): void => {
    setRatio(initialRatio)
  }

  const topPercent = `${(ratio * 100).toFixed(1)}%`
  const bottomPercent = `${((1 - ratio) * 100).toFixed(1)}%`

  return (
    <div className="cei-resizable-split" ref={containerRef}>
      <div className="cei-resizable-split-top" style={{ height: topPercent }}>
        {topContent}
      </div>
      <div
        className="cei-resizable-split-handle"
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panels"
        tabIndex={0}
      />
      <div className="cei-resizable-split-bottom" style={{ height: bottomPercent }}>
        {bottomContent}
      </div>
    </div>
  )
}
