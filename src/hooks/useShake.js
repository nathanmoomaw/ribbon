import { useEffect, useRef, useCallback } from 'react'

const SHAKE_THRESHOLD = 15      // m/s² acceleration needed to trigger
const SHAKE_COOLDOWN = 600      // ms between shake triggers
const ACCEL_SAMPLE_INTERVAL = 50 // ms between acceleration checks

export function useShake(onShake, controlsRef, ribbonRef) {
  const lastShakeRef = useRef(0)
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 })

  const triggerShake = useCallback((intensity = 1) => {
    const now = Date.now()
    if (now - lastShakeRef.current < SHAKE_COOLDOWN) return
    lastShakeRef.current = now
    onShake(Math.min(1, Math.max(0.2, intensity)))
  }, [onShake])

  useEffect(() => {
    // --- Enter key ---
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'Enter') {
        e.preventDefault()
        triggerShake(0.7)
      }
    }

    // --- Click outside controls/ribbon ---
    function onClick(e) {
      // Check if click is inside controls or ribbon
      const controls = controlsRef?.current
      const ribbon = ribbonRef?.current
      if (controls && controls.contains(e.target)) return
      if (ribbon && ribbon.contains(e.target)) return
      // Also ignore clicks on activation mode buttons, header, zoom buttons
      if (e.target.closest('.activation') || e.target.closest('.app-header') || e.target.closest('.visualizer__zoom')) return
      // Ignore clicks on buttons/inputs generally
      if (e.target.closest('button') || e.target.closest('input')) return
      triggerShake(0.6)
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
