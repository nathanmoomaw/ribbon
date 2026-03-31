import { useState, useRef, useCallback, useEffect } from 'react'

const GOOP_PER_DRAG = 0.12 // how much goop added per drag-over event
const SHAKE_CLEAN = 1 / 13 // ~13 shakes to fully clean
const DRAG_MOVE_THROTTLE = 50 // ms between goop additions per control

/**
 * Goop/Liquid state management.
 * Each control has a goop level (0-1). Goop increases when dragging from puddle
 * over controls. Shake decreases goop. Gooped controls get nudged by puddle ripples.
 *
 * The key challenge: the puddle uses setPointerCapture, so normal pointerover
 * events on controls won't fire. Instead, we track the drag at the document level
 * using pointermove and manually hit-test against registered control elements.
 */
export function useGoop() {
  const [goopLevels, setGoopLevels] = useState({}) // { controlId: 0-1 }
  const [puddleActivity, setPuddleActivity] = useState(0) // 0-1, current puddle interaction intensity
  const isDraggingFromPuddle = useRef(false)
  const controlElements = useRef(new Map()) // controlId -> DOM element
  const lastGoopTime = useRef({}) // controlId -> timestamp (throttle)
  const dragPointerId = useRef(null)

  // Register a control element for goop hit-testing
  const registerControl = useCallback((controlId, element) => {
    if (element) {
      controlElements.current.set(controlId, element)
    } else {
      controlElements.current.delete(controlId)
    }
  }, [])

  // Called when a pointer leaves the puddle during an active drag
  const startDragging = useCallback((pointerId) => {
    isDraggingFromPuddle.current = true
    dragPointerId.current = pointerId
  }, [])

  const stopDragging = useCallback(() => {
    isDraggingFromPuddle.current = false
    dragPointerId.current = null
  }, [])

  // Hit-test: is this point inside any registered control?
  const hitTestControls = useCallback((clientX, clientY) => {
    const hits = []
    for (const [id, el] of controlElements.current) {
      const rect = el.getBoundingClientRect()
      if (
        clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top && clientY <= rect.bottom
      ) {
        hits.push(id)
      }
    }
    return hits
  }, [])

  // Document-level pointermove handler for goop drag detection
  useEffect(() => {
    function onPointerMove(e) {
      if (!isDraggingFromPuddle.current) return

      const now = Date.now()
      const hits = hitTestControls(e.clientX, e.clientY)

      for (const controlId of hits) {
        const lastTime = lastGoopTime.current[controlId] || 0
        if (now - lastTime < DRAG_MOVE_THROTTLE) continue
        lastGoopTime.current[controlId] = now

        setGoopLevels(prev => ({
          ...prev,
          [controlId]: Math.min(1, (prev[controlId] || 0) + GOOP_PER_DRAG),
        }))
      }
    }

    function onPointerUp(e) {
      if (isDraggingFromPuddle.current) {
        isDraggingFromPuddle.current = false
        dragPointerId.current = null
      }
    }

    document.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerUp)

    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerUp)
    }
  }, [hitTestControls])

  // Called on shake — reduces all goop
  const shakeClean = useCallback(() => {
    setGoopLevels(prev => {
      const next = {}
      let anyRemaining = false
      for (const [id, level] of Object.entries(prev)) {
        const newLevel = Math.max(0, level - SHAKE_CLEAN)
        if (newLevel > 0.001) {
          next[id] = newLevel
          anyRemaining = true
        }
      }
      return anyRemaining ? next : {}
    })
  }, [])

  // Broadcast puddle activity to gooped controls (call from puddle pointer events)
  const updatePuddleActivity = useCallback((intensity) => {
    setPuddleActivity(intensity)
  }, [])

  // Get goop level for a specific control
  const getGoopLevel = useCallback((controlId) => {
    return goopLevels[controlId] || 0
  }, [goopLevels])

  // Get all goop for serialization
  const getGoopData = useCallback(() => {
    const entries = Object.entries(goopLevels)
    return entries.length > 0 ? goopLevels : null
  }, [goopLevels])

  // Load goop from preset
  const loadGoopData = useCallback((data) => {
    if (data && typeof data === 'object') {
      setGoopLevels(data)
    }
  }, [])

  return {
    goopLevels,
    puddleActivity,
    isDraggingFromPuddle,
    registerControl,
    startDragging,
    stopDragging,
    shakeClean,
    updatePuddleActivity,
    getGoopLevel,
    getGoopData,
    loadGoopData,
  }
}
