import { useEffect, useRef, useCallback } from 'react'

const SHAKE_THRESHOLD = 15      // m/s² acceleration needed to trigger
const ACCEL_SAMPLE_INTERVAL = 50 // ms between acceleration checks
const COMBO_WINDOW = 800         // ms window for accumulating rapid shakes
const MIN_GAP = 80               // ms minimum between triggers (debounce double-fires)

export function useShake(onShake, controlsRef, ribbonRef) {
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 })
  const recentTimesRef = useRef([])
  const lastTriggerRef = useRef(0)

  const triggerShake = useCallback((baseIntensity = 0.5) => {
    const now = Date.now()
    // Debounce very rapid double-fires
    if (now - lastTriggerRef.current < MIN_GAP) return
    lastTriggerRef.current = now

    // Track recent trigger times, prune old ones
    const recent = recentTimesRef.current.filter(t => now - t < COMBO_WINDOW)
    recent.push(now)
    recentTimesRef.current = recent

    // Boost intensity based on combo count: each extra hit in the window adds ~0.15
    const comboCount = recent.length
    const comboBoost = Math.min(0.6, (comboCount - 1) * 0.15)
    const intensity = Math.min(1, Math.max(0.2, baseIntensity + comboBoost))

    onShake(intensity)
  }, [onShake])

  useEffect(() => {
    // --- Enter key ---
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'Enter') {
        e.preventDefault()
        triggerShake(0.5)
      }
    }

    // --- Click outside controls/ribbon ---
    function onClick(e) {
      // Check if click is inside controls or ribbon
      const controls = controlsRef?.current
      const ribbon = ribbonRef?.current
      if (controls && controls.contains(e.target)) return
      if (ribbon && ribbon.contains(e.target)) return
      // Also ignore clicks on activation mode buttons, header, zoom/visuals buttons
      if (e.target.closest('.activation') || e.target.closest('.app-header') || e.target.closest('.visualizer__zoom') || e.target.closest('.visualizer__visuals')) return
      // Ignore clicks on buttons/inputs generally
      if (e.target.closest('button') || e.target.closest('input')) return
      triggerShake(0.4)
    }

    // --- Device accelerometer (mobile shake) ---
    let lastSampleTime = 0
    function onMotion(e) {
      const now = Date.now()
      if (now - lastSampleTime < ACCEL_SAMPLE_INTERVAL) return
      lastSampleTime = now

      const acc = e.accelerationIncludingGravity
      if (!acc) return

      const dx = acc.x - lastAccelRef.current.x
      const dy = acc.y - lastAccelRef.current.y
      const dz = acc.z - lastAccelRef.current.z
      lastAccelRef.current = { x: acc.x, y: acc.y, z: acc.z }

      const magnitude = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (magnitude > SHAKE_THRESHOLD) {
        // Map magnitude to intensity (threshold..50 -> 0.3..1)
        const intensity = Math.min(1, 0.3 + (magnitude - SHAKE_THRESHOLD) / 35 * 0.7)
        triggerShake(intensity)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('click', onClick)
    window.addEventListener('devicemotion', onMotion)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('click', onClick)
      window.removeEventListener('devicemotion', onMotion)
    }
  }, [triggerShake, controlsRef, ribbonRef])
}
