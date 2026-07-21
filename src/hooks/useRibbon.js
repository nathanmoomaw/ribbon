import { useRef, useCallback } from 'react'

export function useRibbon(onPositionChange, onDown, onUp) {
  const ribbonRef = useRef(null)
  const activePointers = useRef(new Set())

  const getPosition = useCallback((e) => {
    const rect = ribbonRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    return { x, y }
  }, [])

  const handlePointerDown = useCallback((e) => {
    if (!ribbonRef.current) return
    // setPointerCapture can throw InvalidPointerId under rapid/overlapping pointer
    // events (browser quirk, esp. touch). Never let that swallow the note-on below.
    try { ribbonRef.current.setPointerCapture(e.pointerId) } catch (_) {}
    activePointers.current.add(e.pointerId)
    const { x, y } = getPosition(e)
    onDown?.(e.pointerId, x, y)
    onPositionChange?.(e.pointerId, x, y)
  }, [getPosition, onDown, onPositionChange])

  const handlePointerMove = useCallback((e) => {
    if (!activePointers.current.has(e.pointerId)) return
    const { x, y } = getPosition(e)
    onPositionChange?.(e.pointerId, x, y)
  }, [getPosition, onPositionChange])

  const handlePointerUp = useCallback((e) => {
    if (!activePointers.current.has(e.pointerId)) return
    activePointers.current.delete(e.pointerId)
    if (ribbonRef.current) {
      try { ribbonRef.current.releasePointerCapture(e.pointerId) } catch (_) {}
    }
    onUp?.(e.pointerId)
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
