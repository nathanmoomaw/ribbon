import { useState, useRef, useCallback } from 'react'

const GOOP_PER_DRAG = 0.08 // how much goop added per drag-over event
const SHAKE_CLEAN = 1 / 13 // ~13 shakes to fully clean

/**
 * Goop/Liquid state management.
 * Each control has a goop level (0-1). Goop increases when dragging from puddle
 * over controls. Shake decreases goop. Gooped controls get nudged by puddle ripples.
 */
export function useGoop() {
  const [goopLevels, setGoopLevels] = useState({}) // { controlId: 0-1 }
  const isDraggingFromPuddle = useRef(false)

  // Called when pointer leaves puddle during drag
  const startDragging = useCallback(() => {
    isDraggingFromPuddle.current = true
  }, [])

  const stopDragging = useCallback(() => {
    isDraggingFromPuddle.current = false
  }, [])

  // Called when pointer moves over a control while dragging from puddle
  const addGoop = useCallback((controlId) => {
    if (!isDraggingFromPuddle.current) return
    setGoopLevels(prev => ({
      ...prev,
      [controlId]: Math.min(1, (prev[controlId] || 0) + GOOP_PER_DRAG),
    }))
  }, [])

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
    isDraggingFromPuddle,
    startDragging,
    stopDragging,
    addGoop,
    shakeClean,
    getGoopLevel,
    getGoopData,
    loadGoopData,
  }
}
