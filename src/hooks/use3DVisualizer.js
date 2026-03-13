import { useEffect, useRef } from 'react'
import * as THREE from 'three'

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

// Colors for each sphere: cyan, magenta, purple
const SPHERE_COLORS = [0x00f0ff, 0xff00aa, 0x8b5cf6]

// Idle drift offsets so spheres aren't perfectly centered on each other
const SPHERE_IDLE_OFFSETS = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.4, -0.3, 0.2),
  new THREE.Vector3(-0.3, 0.5, -0.4),
]

const SPHERE_RADIUS = 3.5
const DEFAULT_ZOOM = 1.8   // inside the spheres by default
const MIN_ZOOM = 0.5
const MAX_ZOOM = 25
const ZOOM_STEP = 0.8

export function use3DVisualizer(mountRef, getEngine, ribbonInteraction, visualMode) {
  const stateRef = useRef(null)
  const zoomRef = useRef(DEFAULT_ZOOM)
  const targetZoomRef = useRef(DEFAULT_ZOOM)
  const visualModeRef = useRef(visualMode)
  visualModeRef.current = visualMode

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

      // Main wireframe sphere
      const geo = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32)
      const wireGeo = new THREE.WireframeGeometry(geo)
      const mat = new THREE.LineBasicMaterial({
        color: SPHERE_COLORS[i],
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      })
      const wireframe = new THREE.LineSegments(wireGeo, mat)
      group.add(wireframe)

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
      spheres.push({ wireframe, mat, innerMesh, innerMat, group })
      sphereGroups.push(group)
    }

    // --- Audio setup ---
    let analyser = null
    let freqData = null

    function tryGetAnalyser() {
      if (analyser) return true
      try {
        const engine = getEngine()
        analyser = engine.getAnalyser()
        if (analyser) {
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

    function animate(time) {
      frameId = requestAnimationFrame(animate)

      const dt = lastTime ? (time - lastTime) / 1000 : 0.016
      lastTime = time

      const isParty = visualModeRef.current === 'party'

      tryGetAnalyser()
      const bands = getBandEnergies()
      const isActive = ribbonInteraction?.current?.active
      const velocity = ribbonInteraction?.current?.velocity ?? 0

      // Smooth zoom
      const zoomDiff = targetZoomRef.current - zoomRef.current
      zoomRef.current += zoomDiff * 0.08
      camera.position.z = zoomRef.current

      // Calculate drift amount based on how far zoomed out from default
      const driftAmount = Math.max(0, (zoomRef.current - DEFAULT_ZOOM) / (MAX_ZOOM - DEFAULT_ZOOM)) * 3.5

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

        // Position: idle offset + drift apart as zoom increases
        const drift = SPHERE_DRIFT_DIRS[i].clone().multiplyScalar(driftAmount)
        sphere.group.position.copy(SPHERE_IDLE_OFFSETS[i]).add(drift)

        // Opacity: brighter when there's energy
        if (isParty) {
          const baseOpacity = 0.2
          const activeOpacity = baseOpacity + energy * 0.5
          sphere.mat.opacity = activeOpacity
          sphere.innerMat.opacity = 0.02 + energy * 0.08
        } else {
          // Lo mode: very dim
          sphere.mat.opacity = 0.08 + energy * 0.12
          sphere.innerMat.opacity = 0.01
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
        s.wireframe.geometry.dispose()
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
