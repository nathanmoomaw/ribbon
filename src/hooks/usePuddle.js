import { useRef, useCallback, useEffect } from 'react'

/**
 * 2D pointer tracking for the Puddle surface.
 * Adapted from useRibbon — tracks X (pitch) and Y (velocity/filter) in 0-1 range.
 * Returns puddle ref, event handlers, and active ripple origins for the renderer.
 */
export function usePuddle(onPositionChange, onDown, onUp, onDragEscape) {
  const puddleRef = useRef(null)
  const activePointers = useRef(new Set())
  const escapedPointers = useRef(new Set()) // pointers that left the puddle bounds
  const ripples = useRef([]) // ring buffer of { x, y, t, intensity }
  const lastDragRippleTime = useRef(0)
  const MAX_RIPPLES = 24

  const getPosition = useCallback((e) => {
    const rect = puddleRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    return { x, y }
  }, [])

  // Check if pointer is within the puddle's bounding rect
  const isInsidePuddle = useCallback((e) => {
    if (!puddleRef.current) return false
    const rect = puddleRef.current.getBoundingClientRect()
    return (
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom
    )
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
    escapedPointers.current.delete(e.pointerId)
    const { x, y } = getPosition(e)
    addRipple(x, y, 1)
    onDown?.(e.pointerId, x, y)
    onPositionChange?.(e.pointerId, x, y)
  }, [getPosition, addRipple, onDown, onPositionChange])

  const handlePointerMove = useCallback((e) => {
    if (!activePointers.current.has(e.pointerId)) return

    const inside = isInsidePuddle(e)

    if (!inside && !escapedPointers.current.has(e.pointerId)) {
      // Pointer just left the puddle — release capture so document events work,
      // and notify the goop system that a drag has escaped
      escapedPointers.current.add(e.pointerId)
      if (puddleRef.current) {
        try { puddleRef.current.releasePointerCapture(e.pointerId) } catch (_) {}
      }
      onDragEscape?.(e.pointerId)
      // Don't call onUp — the note keeps playing, we just allow goop dragging
      return
    }

    if (escapedPointers.current.has(e.pointerId)) {
      // Pointer is outside the puddle — skip normal puddle processing
      // (goop detection happens via document-level events in useGoop)
      return
    }

    const { x, y } = getPosition(e)
    // Throttle drag ripples to ~10fps to reduce physics overhead
    const now = performance.now()
    if (now - lastDragRippleTime.current > 100) {
      addRipple(x, y, 0.3)
      lastDragRippleTime.current = now
    }
    onPositionChange?.(e.pointerId, x, y)
  }, [getPosition, isInsidePuddle, addRipple, onPositionChange, onDragEscape])

  const handlePointerUp = useCallback((e) => {
    if (!activePointers.current.has(e.pointerId)) return
    activePointers.current.delete(e.pointerId)
    escapedPointers.current.delete(e.pointerId)
    if (puddleRef.current) {
      try { puddleRef.current.releasePointerCapture(e.pointerId) } catch (_) {}
    }
    onUp?.(e.pointerId)
  }, [onUp])

  // Document-level pointerup for escaped pointers (capture released, so
  // the puddle element won't receive the pointerup directly)
  useEffect(() => {
    function onDocPointerUp(e) {
      if (escapedPointers.current.has(e.pointerId)) {
        activePointers.current.delete(e.pointerId)
        escapedPointers.current.delete(e.pointerId)
        onUp?.(e.pointerId)
      }
    }
    document.addEventListener('pointerup', onDocPointerUp)
    document.addEventListener('pointercancel', onDocPointerUp)
    return () => {
      document.removeEventListener('pointerup', onDocPointerUp)
      document.removeEventListener('pointercancel', onDocPointerUp)
    }
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
