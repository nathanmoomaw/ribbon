import { useEffect, useRef, useCallback } from 'react'

const SHAKE_THRESHOLD = 15      // m/s² acceleration needed to trigger
const ACCEL_SAMPLE_INTERVAL = 50 // ms between acceleration checks
const COMBO_WINDOW = 800         // ms window for accumulating rapid shakes
const MIN_GAP = 80               // ms minimum between triggers (debounce double-fires)

// Track whether we've already requested/been granted accelerometer permission
let motionPermissionState = 'unknown' // 'unknown' | 'granted' | 'denied' | 'not-needed'

/**
 * Request DeviceMotion permission (required on iOS 13+ and some Android).
 * Must be called from a user gesture handler.
 * Returns true if permission was granted (or not needed).
 */
export async function requestMotionPermission() {
  if (motionPermissionState === 'granted' || motionPermissionState === 'not-needed') return true
  if (motionPermissionState === 'denied') return false

  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const result = await DeviceMotionEvent.requestPermission()
      motionPermissionState = result === 'granted' ? 'granted' : 'denied'
      return result === 'granted'
    } catch {
      motionPermissionState = 'denied'
      return false
    }
  }

  // Browser doesn't require permission (most Android Chrome)
  motionPermissionState = 'not-needed'
  return true
}

export function useShake(onShake, controlsRef, ribbonRef) {
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 })
  const recentTimesRef = useRef([])
  const lastTriggerRef = useRef(0)
  const motionListenerRef = useRef(false)

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

  // Motion event handler (stable ref so we can add/remove it)
  const onMotionRef = useRef(null)
  onMotionRef.current = (e) => {
    const now = Date.now()
    const lastSample = lastAccelRef.current._t || 0
    if (now - lastSample < ACCEL_SAMPLE_INTERVAL) return

    const acc = e.accelerationIncludingGravity || e.acceleration
    if (!acc || (acc.x === null && acc.y === null && acc.z === null)) return

    const x = acc.x || 0, y = acc.y || 0, z = acc.z || 0
    const dx = x - (lastAccelRef.current.x || 0)
    const dy = y - (lastAccelRef.current.y || 0)
    const dz = z - (lastAccelRef.current.z || 0)
    lastAccelRef.current = { x, y, z, _t: now }

    const magnitude = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (magnitude > SHAKE_THRESHOLD) {
      const intensity = Math.min(1, 0.3 + (magnitude - SHAKE_THRESHOLD) / 35 * 0.7)
      triggerShake(intensity)
    }
  }

  // Attach motion listener once permission is granted
  const attachMotionListener = useCallback(() => {
    if (motionListenerRef.current) return
    motionListenerRef.current = true
    function handler(e) { onMotionRef.current?.(e) }
    window.addEventListener('devicemotion', handler)
    // Store for cleanup
    motionListenerRef.current = handler
  }, [])

  useEffect(() => {
    // Enter key moved to looper (useLooper) — toggles recording

    // --- Click outside controls/ribbon ---
    function onClick(e) {
      // If the clicked element was removed from the DOM before this handler ran
      // (e.g. a modal close button that unmounts its parent), we can't safely
      // determine whether it was in an excluded zone — skip shake entirely.
      if (!document.body.contains(e.target)) return

      const controls = controlsRef?.current
      const ribbon = ribbonRef?.current
      if (controls && controls.contains(e.target)) return
      if (ribbon && ribbon.contains(e.target)) return
      if (e.target.closest('.activation') || e.target.closest('.app-header') || e.target.closest('.visualizer__zoom') || e.target.closest('.visualizer__visuals')) return
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.vcf-control')) return
      // Don't shake when interacting with modals/overlays
      if (e.target.closest('.preset-splash') || e.target.closest('.preset-qr-overlay') || e.target.closest('.milestone-toast')) return
      // Don't shake for clicks inside portals (e.g. RainbowKit wallet modal appended directly to body)
      const appRoot = document.getElementById('root')
      if (appRoot && !appRoot.contains(e.target)) return
      triggerShake(0.4)
    }

    // --- Request accelerometer permission on first user gesture ---
    function onFirstGesture() {
      requestMotionPermission().then(granted => {
        if (granted) attachMotionListener()
      })
      // Remove after first attempt
      gestureEvents.forEach(e => document.removeEventListener(e, onFirstGesture, true))
    }

    // If permission already granted, attach immediately
    if (motionPermissionState === 'granted' || motionPermissionState === 'not-needed') {
      attachMotionListener()
    } else {
      // Wait for a user gesture to request permission
      var gestureEvents = ['touchstart', 'pointerdown', 'click', 'keydown']
      gestureEvents.forEach(e => document.addEventListener(e, onFirstGesture, true))
    }

    window.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('click', onClick)
      if (motionListenerRef.current && typeof motionListenerRef.current === 'function') {
        window.removeEventListener('devicemotion', motionListenerRef.current)
        motionListenerRef.current = false
      }
    }
  }, [triggerShake, controlsRef, ribbonRef, attachMotionListener])
}
