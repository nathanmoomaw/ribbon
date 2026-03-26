import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Smooth sinusoidal 3D displacement for brain-like folds
function noise3D(x, y, z) {
  // Broad, rolling waves — low frequency for smooth undulations
  const n1 = Math.sin(x * 1.1 + y * 0.7) * Math.sin(y * 1.3 + z * 0.9) * Math.sin(z * 0.8 + x * 1.0)
  // Secondary wave at slightly different scale for asymmetry
  const n2 = Math.sin(x * 1.7 - z * 1.1 + y * 0.5) * Math.cos(y * 1.5 + x * 0.6 - z * 0.8) * 0.6
  // Gentle third harmonic for subtle variation
  const n3 = Math.sin(x * 2.3 + y * 2.1 - z * 1.4) * 0.3
  return (n1 + n2 + n3) / 1.9
}

// Each sphere drifts in a different direction when zooming out
const SPHERE_DRIFT_DIRS = [
  new THREE.Vector3(-1, 0.5, -0.3).normalize(),
  new THREE.Vector3(0.8, -0.6, 0.5).normalize(),
  new THREE.Vector3(0.2, 0.7, 0.8).normalize(),
]

// Each sphere has a base rotation axis
const SPHERE_ROTATION_AXES = [
  new THREE.Vector3(0.3, 1, 0.2).normalize(),
  new THREE.Vector3(-0.5, 0.4, 1).normalize(),
  new THREE.Vector3(1, -0.3, -0.6).normalize(),
]

// Colors for each sphere: red, gold, green (console button palette)
const SPHERE_COLORS = [0xcc3344, 0xccaa22, 0x22aa55]

// Idle drift offsets so spheres aren't perfectly centered on each other
const SPHERE_IDLE_OFFSETS = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.4, -0.3, 0.2),
  new THREE.Vector3(-0.3, 0.5, -0.4),
]

const SPHERE_RADIUS = 3.5
const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth <= 767
const DEFAULT_ZOOM = IS_MOBILE ? 6.6 : 1.8   // mobile starts zoomed out; desktop inside spheres
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 25
export const ZOOM_STEP = 0.8

export function use3DVisualizer(mountRef, getEngine, ribbonInteraction, visualMode, reverbMix = 0, delayParams = {}) {
  const stateRef = useRef(null)
  const zoomRef = useRef(DEFAULT_ZOOM)
  const targetZoomRef = useRef(DEFAULT_ZOOM)
  const visualModeRef = useRef(visualMode)
  visualModeRef.current = visualMode
  const reverbMixRef = useRef(reverbMix)
  reverbMixRef.current = reverbMix
  const delayRef = useRef(delayParams)
  delayRef.current = delayParams

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // --- Three.js setup ---
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.z = zoomRef.current

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    // --- Create 3 grid spheres ---
    const spheres = []
    const sphereGroups = []

    for (let i = 0; i < 3; i++) {
      const group = new THREE.Group()

      // Main wireframe sphere (using Mesh + wireframe material for vertex displacement)
      const geo = new THREE.SphereGeometry(SPHERE_RADIUS, 48, 48)
      const mat = new THREE.MeshBasicMaterial({
        color: SPHERE_COLORS[i],
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        wireframe: true,
      })
      const mesh = new THREE.Mesh(geo, mat)

      // Store original vertex positions for displacement
      const posAttr = geo.getAttribute('position')
      const basePositions = new Float32Array(posAttr.array.length)
      basePositions.set(posAttr.array)

      group.add(mesh)

      // Inner glow sphere (slightly smaller, very faint)
      const innerGeo = new THREE.SphereGeometry(SPHERE_RADIUS * 0.96, 20, 20)
      const innerMat = new THREE.MeshBasicMaterial({
        color: SPHERE_COLORS[i],
        transparent: true,
        opacity: 0.04,
        depthWrite: false,
        side: THREE.BackSide,
      })
      const innerMesh = new THREE.Mesh(innerGeo, innerMat)
      group.add(innerMesh)

      scene.add(group)
      spheres.push({ mesh, geo, mat, basePositions, innerMesh, innerMat, group })
      sphereGroups.push(group)
    }

    // --- Audio setup ---
    let analyser = null
    let freqData = null

    function tryGetAnalyser() {
      if (analyser) return true
      try {
        // Use peek to avoid triggering AudioContext init outside a gesture
        const a = getEngine.peek ? getEngine.peek()?.getAnalyser() : getEngine()?.getAnalyser()
        if (a) {
          analyser = a
          freqData = new Uint8Array(analyser.frequencyBinCount)
          return true
        }
      } catch {
        // not ready
      }
      return false
    }

    // Split frequency data into 3 bands (low/mid/high) and return avg energy per band
    function getBandEnergies() {
      if (!freqData || !analyser) return [0, 0, 0]
      analyser.getByteFrequencyData(freqData)
      const binCount = freqData.length
      const third = Math.floor(binCount / 3)

      const bands = [0, 0, 0]
      for (let b = 0; b < 3; b++) {
        const start = b * third
        const end = b === 2 ? binCount : (b + 1) * third
        let sum = 0
        for (let i = start; i < end; i++) {
          sum += freqData[i]
        }
        bands[b] = sum / ((end - start) * 255)
      }
      return bands
    }

    // --- Resize handler ---
    function onResize() {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (w === 0 || h === 0) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    const observer = new ResizeObserver(onResize)
    observer.observe(mount)
    onResize()

    // --- Keyboard handler for +/- zoom ---
    function onKeyDown(e) {
      if (e.key === '-' || e.key === '_') {
        // Zoom out (pull camera back, see more)
        targetZoomRef.current = Math.min(MAX_ZOOM, targetZoomRef.current + ZOOM_STEP)
      } else if (e.key === '=' || e.key === '+') {
        // Zoom in (push camera forward, deeper inside)
        targetZoomRef.current = Math.max(MIN_ZOOM, targetZoomRef.current - ZOOM_STEP)
      }
    }
    window.addEventListener('keydown', onKeyDown)

    // --- Animation loop ---
    let frameId = null
    let lastTime = 0
    // Accumulated rotation per sphere
    const rotations = [
      new THREE.Quaternion(),
      new THREE.Quaternion(),
      new THREE.Quaternion(),
    ]
    const tempQuat = new THREE.Quaternion()

    // Smoothed reactive offsets per sphere (lerped toward targets each frame)
    const reactiveOffsets = [
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]

    // Each sphere reacts to pitch differently — unique direction per sphere
    const PITCH_SHIFT_DIRS = [
      new THREE.Vector3(-0.8, 0.2, 0.3).normalize(),
      new THREE.Vector3(0.5, -0.7, -0.2).normalize(),
      new THREE.Vector3(0.3, 0.5, -0.8).normalize(),
    ]

    // Each sphere reacts to velocity differently — push outward
    const VELOCITY_PUSH_DIRS = [
      new THREE.Vector3(-0.4, 0.6, -0.5).normalize(),
      new THREE.Vector3(0.7, -0.3, 0.4).normalize(),
      new THREE.Vector3(-0.3, -0.5, 0.7).normalize(),
    ]

    function animate(time) {
      frameId = requestAnimationFrame(animate)

      const dt = lastTime ? (time - lastTime) / 1000 : 0.016
      lastTime = time

      const isParty = visualModeRef.current === 'party'

      tryGetAnalyser()
      const bands = getBandEnergies()
      const isActive = ribbonInteraction?.current?.active
      const velocity = ribbonInteraction?.current?.velocity ?? 0
      // position: 0 (low pitch) to 1 (high pitch), centered at 0.5
      const position = ribbonInteraction?.current?.position ?? 0.5

      // Smooth zoom with ambient breathing
      const breathe = Math.sin(time * 0.0004) * 0.6 + Math.sin(time * 0.00017) * 0.3
      const zoomDiff = targetZoomRef.current - zoomRef.current
      zoomRef.current += zoomDiff * 0.08
      camera.position.z = zoomRef.current + breathe

      // Calculate drift amount based on how far zoomed out from default
      const driftAmount = Math.max(0, (zoomRef.current - DEFAULT_ZOOM) / (MAX_ZOOM - DEFAULT_ZOOM)) * 3.5

      // Pitch offset: how far from center (0 = center, ±0.5 = extremes)
      const pitchOffset = isActive ? (position - 0.5) * 2 : 0  // -1 to 1
      // Velocity as a 0–1 factor for push strength
      const velFactor = isActive ? Math.min(1, velocity * 0.0003) : 0

      const lerpSpeed = 3.0 * dt  // smoothing rate

      for (let i = 0; i < 3; i++) {
        const sphere = spheres[i]
        const energy = bands[i]

        // Base rotation speed + audio-driven boost
        const baseSpeed = 0.15 + i * 0.08
        const audioBoost = energy * 1.8
        const velocityBoost = isActive ? velocity * 0.0001 : 0
        const rotSpeed = (baseSpeed + audioBoost + velocityBoost) * dt

        // Rotate around the sphere's unique axis
        tempQuat.setFromAxisAngle(SPHERE_ROTATION_AXES[i], rotSpeed)
        rotations[i].premultiply(tempQuat)
        sphere.group.quaternion.copy(rotations[i])

        // Scale pulse from audio energy
        const scalePulse = 1 + energy * 0.3
        sphere.group.scale.setScalar(scalePulse)

        // Brain-like vertex displacement driven by reverb mix
        const reverb = reverbMixRef.current
        if (reverb > 0.01) {
          const posAttr = sphere.geo.getAttribute('position')
          const arr = posAttr.array
          const base = sphere.basePositions
          const vertCount = posAttr.count
          // Displacement amount: reverb controls intensity, time adds slow undulation
          const displaceAmt = reverb * 0.35
          // Slow time crawl for organic pulsing of the folds
          const t = time * 0.0003 + i * 2.0

          for (let v = 0; v < vertCount; v++) {
            const bx = base[v * 3]
            const by = base[v * 3 + 1]
            const bz = base[v * 3 + 2]

            // Normal direction (sphere centered at origin, so normal = normalized position)
            const len = Math.sqrt(bx * bx + by * by + bz * bz)
            if (len === 0) continue
            const nx = bx / len
            const ny = by / len
            const nz = bz / len

            // Noise-based displacement along normal (brain folds)
            const n = noise3D(bx * 1.2 + t, by * 1.2 + t * 0.7, bz * 1.2 + t * 0.5)
            const displacement = n * displaceAmt

            arr[v * 3] = bx + nx * displacement
            arr[v * 3 + 1] = by + ny * displacement
            arr[v * 3 + 2] = bz + nz * displacement
          }
          posAttr.needsUpdate = true
        }

        // Calculate target reactive offset from pitch + velocity
        // Each sphere shifts in its own direction based on pitch, different magnitude
        const pitchMag = pitchOffset * (0.6 + i * 0.3)
        const velMag = velFactor * (0.4 + i * 0.25) + energy * 0.3
        const targetX = PITCH_SHIFT_DIRS[i].x * pitchMag + VELOCITY_PUSH_DIRS[i].x * velMag
        const targetY = PITCH_SHIFT_DIRS[i].y * pitchMag + VELOCITY_PUSH_DIRS[i].y * velMag
        const targetZ = PITCH_SHIFT_DIRS[i].z * pitchMag + VELOCITY_PUSH_DIRS[i].z * velMag

        // Smoothly lerp reactive offsets
        reactiveOffsets[i].x += (targetX - reactiveOffsets[i].x) * lerpSpeed
        reactiveOffsets[i].y += (targetY - reactiveOffsets[i].y) * lerpSpeed
        reactiveOffsets[i].z += (targetZ - reactiveOffsets[i].z) * lerpSpeed

        // Position: idle offset + zoom drift + reactive offset
        const drift = SPHERE_DRIFT_DIRS[i].clone().multiplyScalar(driftAmount)
        sphere.group.position.copy(SPHERE_IDLE_OFFSETS[i]).add(drift).add(reactiveOffsets[i])

        // Delay-driven shimmer: time → speed, feedback → depth, mix → intensity
        const delay = delayRef.current
        const delayMix = delay.mix ?? 0
        const delayTime = delay.time ?? 0.3
        const delayFeedback = delay.feedback ?? 0.4
        // Shimmer frequency: shorter delay time = faster shimmer
        const shimmerSpeed = delayMix > 0.01 ? (1 / Math.max(delayTime, 0.05)) * 2 : 0
        // Shimmer depth: feedback controls how dramatic the pulsing is
        const shimmerDepth = delayMix * delayFeedback * 0.4
        // Each sphere shimmers at offset phase
        const shimmer = shimmerDepth > 0.001
          ? Math.sin(time * 0.001 * shimmerSpeed + i * 2.1) * shimmerDepth
          : 0

        // Opacity: brighter when there's energy, modulated by delay shimmer
        if (isParty) {
          const baseOpacity = 0.12
          const activeOpacity = baseOpacity + energy * 0.35 + shimmer * 0.6
          sphere.mat.opacity = Math.max(0.04, Math.min(0.6, activeOpacity))
          sphere.innerMat.opacity = Math.max(0, 0.01 + energy * 0.05 + shimmer * 0.2)
        } else {
          // Lo mode: very dim, subtle shimmer
          sphere.mat.opacity = Math.max(0.02, 0.05 + energy * 0.08 + shimmer * 0.3)
          sphere.innerMat.opacity = 0.005
        }
      }

      renderer.render(scene, camera)
    }

    frameId = requestAnimationFrame(animate)

    stateRef.current = { renderer, scene, camera, spheres }

    return () => {
      if (frameId) cancelAnimationFrame(frameId)
      window.removeEventListener('keydown', onKeyDown)
      observer.disconnect()
      renderer.dispose()
      // Cleanup geometries and materials
      for (const s of spheres) {
        s.geo.dispose()
        s.mat.dispose()
        s.innerMesh.geometry.dispose()
        s.innerMat.dispose()
      }
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
      stateRef.current = null
    }
  }, [mountRef, getEngine, ribbonInteraction])

  return { zoomRef, targetZoomRef }
}
