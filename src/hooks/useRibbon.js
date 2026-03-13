import { useRef, useCallback } from 'react'

export function useRibbon(onPositionChange, onDown, onUp) {
  const ribbonRef = useRef(null)
  const activeRef = useRef(false)

  const getPosition = useCallback((e) => {
    const rect = ribbonRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    return { x, y }
  }, [])

  const handlePointerDown = useCallback((e) => {
    if (!ribbonRef.current) return
    ribbonRef.current.setPointerCapture(e.pointerId)
    activeRef.current = true
    const { x, y } = getPosition(e)
    onDown?.(x, y)
    onPositionChange?.(x, y)
  }, [getPosition, onDown, onPositionChange])

  const handlePointerMove = useCallback((e) => {
    if (!activeRef.current) return
    const { x, y } = getPosition(e)
    onPositionChange?.(x, y)
  }, [getPosition, onPositionChange])

  const handlePointerUp = useCallback((e) => {
    if (!activeRef.current) return
    activeRef.current = false
    if (ribbonRef.current) {
      ribbonRef.current.releasePointerCapture(e.pointerId)
    }
    onUp?.()
  }, [onUp])

  return {
    ribbonRef,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  }
}
