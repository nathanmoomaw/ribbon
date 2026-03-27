import { useRef, useCallback } from 'react'

/**
 * 2D pointer tracking for the Puddle surface.
 * Adapted from useRibbon — tracks X (pitch) and Y (velocity/filter) in 0-1 range.
 * Returns puddle ref, event handlers, and active ripple origins for the renderer.
 */
export function usePuddle(onPositionChange, onDown, onUp) {
  const puddleRef = useRef(null)
  const activePointers = useRef(new Set())
  const ripples = useRef([]) // ring buffer of { x, y, t, intensity }
  const MAX_RIPPLES = 24

  const getPosition = useCallback((e) => {
    const rect = puddleRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    return { x, y }
  }, [])

  const addRipple = useCallback((x, y, intensity = 1) => {
    const r = ripples.current
    r.push({ x, y, t: performance.now(), intensity })
    if (r.length > MAX_RIPPLES) r.shift()
  }, [])

  const handlePointerDown = useCallback((e) => {
    if (!puddleRef.current) return
    puddleRef.current.setPointerCapture(e.pointerId)
    activePointers.current.add(e.pointerId)
    const { x, y } = getPosition(e)
    addRipple(x, y, 1)
    onDown?.(e.pointerId, x, y)
    onPositionChange?.(e.pointerId, x, y)
  }, [getPosition, addRipple, onDown, onPositionChange])

  const handlePointerMove = useCallback((e) => {
    if (!activePointers.current.has(e.pointerId)) return
    const { x, y } = getPosition(e)
    // Add smaller ripples on drag
    addRipple(x, y, 0.3)
    onPositionChange?.(e.pointerId, x, y)
  }, [getPosition, addRipple, onPositionChange])

  const handlePointerUp = useCallback((e) => {
    if (!activePointers.current.has(e.pointerId)) return
    activePointers.current.delete(e.pointerId)
    if (puddleRef.current) {
      puddleRef.current.releasePointerCapture(e.pointerId)
    }
    onUp?.(e.pointerId)
  }, [onUp])

  return {
    puddleRef,
    ripples,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  }
}
