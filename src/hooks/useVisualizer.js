import { useEffect, useRef } from 'react'

const NEON_COLORS = [
  '#00f0ff', '#ff00aa', '#39ff14', '#ff6ec7',
  '#fff01f', '#8b5cf6', '#00f0ff', '#ff00aa',
]

const CONFETTI_COLORS = [
  '#ff0044', '#00f0ff', '#39ff14', '#ff6ec7',
  '#fff01f', '#8b5cf6', '#ff8800', '#ff00aa',
  '#00ff88', '#4488ff', '#ff4444', '#ffff00',
]

// Pre-compute bar colors once
const BAR_COUNT = 64
const BAR_COLORS = []
for (let i = 0; i < BAR_COUNT; i++) {
  const hue = (i / BAR_COUNT) * 360
  BAR_COLORS.push(`hsl(${hue}, 100%, 60%)`)
}

const MAX_PARTICLES = 500

const SHAPE_CIRCLE = 0
const SHAPE_RECT = 1
const SHAPE_STAR = 2
const SHAPE_DIAMOND = 3

// Pre-compute star path points for a 5-pointed star (unit size)
const STAR_POINTS = []
{
  const spikes = 5
  let rot = (Math.PI / 2) * 3
  const step = Math.PI / spikes
  STAR_POINTS.push(0, -1) // moveTo
  for (let i = 0; i < spikes; i++) {
    STAR_POINTS.push(Math.cos(rot), Math.sin(rot)) // outer
    rot += step
    STAR_POINTS.push(Math.cos(rot) * 0.4, Math.sin(rot) * 0.4) // inner
    rot += step
  }
}

export function useVisualizer(canvasRef, getEngine, ribbonInteraction, visualMode) {
  const particlesRef = useRef([])
  const frameRef = useRef(null)
  const visualModeRef = useRef(visualMode)
  visualModeRef.current = visualMode

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('2d')
    let analyser = null
    let timeDomain = null
    let freqData = null
    let wasActive = false
    let cachedW = 0
    let cachedH = 0
    let ambientGradient = null

    function resize() {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.setTransform(dpr, 0, 0, dpr, 0, 0)
      cachedW = canvas.clientWidth
      cachedH = canvas.clientHeight
      ambientGradient = null // invalidate cached gradient
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    function tryGetAnalyser() {
      if (analyser) return true
      try {
        // Use getAnalyser import to avoid triggering AudioContext init outside a gesture
        const a = getEngine.peek ? getEngine.peek()?.getAnalyser() : getEngine()?.getAnalyser()
        if (a) {
          analyser = a
          timeDomain = new Uint8Array(analyser.fftSize)
          freqData = new Uint8Array(analyser.frequencyBinCount)
          return true
        }
      } catch {
        // Engine not initialized yet
      }
      return false
    }

    function getRibbonScreenX() {
      if (!ribbonInteraction?.current) return null
      const pos = ribbonInteraction.current.position
      if (pos === null) return null
      return pos * cachedW
    }

    function spawnConfettiBurst(x, y, intensity) {
      const particles = particlesRef.current
      const count = Math.floor(8 + intensity * 20)

      for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2
        const speed = 2 + Math.random() * 6 * intensity

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.001 + Math.random() * 0.003,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 2 + Math.random() * 5,
          shape: Math.floor(Math.random() * 4),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          gravity: 0.008 + Math.random() * 0.012,
          shimmer: Math.random(),
        })
      }
    }

    function spawnFireworkBurst(x, y) {
      const particles = particlesRef.current
      const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)]
      const count = 30 + Math.floor(Math.random() * 20)

      for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3
        const speed = 1.5 + Math.random() * 4
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.002 + Math.random() * 0.004,
          color,
          size: 1.5 + Math.random() * 2.5,
          shape: SHAPE_CIRCLE,
          rotation: 0,
          rotationSpeed: 0,
          gravity: 0.005,
          shimmer: 0,
          trail: true,
        })
      }
    }

    function spawnContinuousConfetti(x, y, amplitude) {
      const particles = particlesRef.current
      const count = Math.floor(1 + amplitude * 6)

      for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI
        const speed = 1 + Math.random() * 4 * amplitude

        particles.push({
          x: x + (Math.random() - 0.5) * 30,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.0015 + Math.random() * 0.004,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 1.5 + Math.random() * 4,
          shape: Math.floor(Math.random() * 4),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.15,
          gravity: 0.006 + Math.random() * 0.01,
          shimmer: Math.random(),
        })
      }
    }

    function updateParticles() {
      const particles = particlesRef.current
      let writeIdx = 0
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += p.gravity
        p.vx *= 0.99
        p.rotation += p.rotationSpeed
        p.shimmer += 0.05
        p.life -= p.decay
        if (p.life > 0) {
          particles[writeIdx++] = p
        }
      }
      particles.length = writeIdx
    }

    function drawParticles() {
      const particles = particlesRef.current
      if (particles.length === 0) return

      // No shadowBlur — much faster
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const alpha = p.life * 0.9
        const shimmerAlpha = p.shimmer ? alpha * (0.7 + 0.3 * Math.sin(p.shimmer * 10)) : alpha
        gl.globalAlpha = shimmerAlpha
        gl.fillStyle = p.color

        // Manual transform instead of save/restore
        const cos = Math.cos(p.rotation)
        const sin = Math.sin(p.rotation)
        const dpr = window.devicePixelRatio || 1
        gl.setTransform(cos * dpr, sin * dpr, -sin * dpr, cos * dpr, p.x * dpr, p.y * dpr)

        if (p.trail && p.life > 0.3) {
          gl.globalAlpha = alpha * 0.3
          gl.beginPath()
          gl.arc(-p.vx * 2, -p.vy * 2, p.size * 0.6, 0, Math.PI * 2)
          gl.fill()
          gl.globalAlpha = shimmerAlpha
        }

        switch (p.shape) {
          case SHAPE_RECT:
            gl.fillRect(-p.size / 2, -p.size * 0.6, p.size, p.size * 1.2)
            break
          case SHAPE_STAR: {
            const s = p.size
            gl.beginPath()
            gl.moveTo(STAR_POINTS[0] * s, STAR_POINTS[1] * s)
            for (let j = 2; j < STAR_POINTS.length; j += 2) {
              gl.lineTo(STAR_POINTS[j] * s, STAR_POINTS[j + 1] * s)
            }
            gl.closePath()
            gl.fill()
            break
          }
          case SHAPE_DIAMOND: {
            const sz = p.size
            gl.beginPath()
            gl.moveTo(0, -sz)
            gl.lineTo(sz * 0.6, 0)
            gl.lineTo(0, sz)
            gl.lineTo(-sz * 0.6, 0)
            gl.closePath()
            gl.fill()
            break
          }
          default:
            gl.beginPath()
            gl.arc(0, 0, p.size, 0, Math.PI * 2)
            gl.fill()
        }
      }

      // Reset transform
      const dpr = window.devicePixelRatio || 1
      gl.setTransform(dpr, 0, 0, dpr, 0, 0)
      gl.globalAlpha = 1
    }

    // --- Staff notation state ---
    const staffNotes = [] // { x, staffY, age, freq, velocity }
    const STAFF_SCROLL_SPEED = 1.2 // px per frame
    const MAX_STAFF_NOTES = 120
    const NOTE_SPAWN_INTERVAL = 3 // frames between note spawns when active
    let noteSpawnCounter = 0
    let lastDetectedFreq = 0

    // Convert frequency to staff Y position (relative 0-1 within staff)
    // Maps roughly C3(130Hz) to C6(1046Hz) across staff range
    function freqToStaffPosition(freq) {
      if (freq < 20) return 0.5
      // MIDI note number from freq
      const midi = 12 * Math.log2(freq / 440) + 69
      // Map MIDI 48(C3) to bottom, MIDI 84(C6) to top — 3 octaves = 36 semitones
      const normalized = (midi - 48) / 36
      return Math.max(0, Math.min(1, normalized))
    }

    // Detect dominant frequency from analyser data
    function detectPitch() {
      if (!freqData || !analyser) return 0
      analyser.getByteFrequencyData(freqData)
      let maxVal = 0
      let maxIdx = 0
      // Skip very low bins (noise)
      for (let i = 2; i < freqData.length / 2; i++) {
        if (freqData[i] > maxVal) {
          maxVal = freqData[i]
          maxIdx = i
        }
      }
      if (maxVal < 30) return 0 // silence threshold
      // Convert bin index to frequency
      const nyquist = (analyser.context?.sampleRate || 44100) / 2
      return maxIdx * nyquist / analyser.frequencyBinCount
    }

    // Flag wave function — returns Y offset for a given x position and time
    // Creates a flag-like undulation that waves back and forth with depth
    function flagWave(x, time) {
      // Amplitude increases toward the edges (like a flag on a pole in the center)
      const centerDist = Math.abs(x / cachedW - 0.5) * 2 // 0 at center, 1 at edges
      const amp = 8 + centerDist * 18
      // Multiple sine waves at different frequencies for organic motion
      const wave1 = Math.sin(x * 0.008 - time * 0.002) * amp
      const wave2 = Math.sin(x * 0.012 + time * 0.0015) * amp * 0.4
      const wave3 = Math.sin(x * 0.004 - time * 0.001) * amp * 0.25
      return wave1 + wave2 + wave3
    }

    // Depth (z-axis) wave — returns a scale factor (0.85–1.15) to simulate forward/backward motion
    function flagDepth(x, time) {
      const centerDist = Math.abs(x / cachedW - 0.5) * 2
      const depthAmp = 0.12 + centerDist * 0.06
      return 1 + Math.sin(x * 0.006 + time * 0.0018) * depthAmp +
             Math.sin(x * 0.01 - time * 0.0012) * depthAmp * 0.4
    }

    function drawStaffNotation(time) {
      const staffTop = cachedH * 0.32
      const staffBottom = cachedH * 0.58
      const staffHeight = staffBottom - staffTop
      const lineCount = 5
      const lineSpacing = staffHeight / (lineCount - 1)

      // Detect current pitch and spawn notes
      const isActive = ribbonInteraction?.current?.active
      const velocity = ribbonInteraction?.current?.velocity ?? 0

      if (isActive && velocity > 0.05) {
        const freq = detectPitch()
        if (freq > 40) {
          lastDetectedFreq = freq
          noteSpawnCounter++
          if (noteSpawnCounter >= NOTE_SPAWN_INTERVAL) {
            noteSpawnCounter = 0
            const staffPos = freqToStaffPosition(freq)
            // Snap to nearest staff line or space
            const lineUnit = 1 / ((lineCount - 1) * 2) // half-steps between lines
            const snapped = Math.round(staffPos / lineUnit) * lineUnit
            staffNotes.push({
              x: cachedW + 20,
              staffY: snapped,
              age: 0,
              freq,
              velocity,
              size: 8 + velocity * 6,
            })
            if (staffNotes.length > MAX_STAFF_NOTES) staffNotes.shift()
          }
        }
      } else {
        noteSpawnCounter = 0
      }

      // Staff activity factor: dim when no notes visible, bright when playing
      const hasNotes = staffNotes.length > 0
      const staffActivity = hasNotes ? 1 : 0.3

      // Draw staff lines — green neon, waving like a flag with depth
      const staffCenterY = (staffTop + staffBottom) / 2
      for (let i = 0; i < lineCount; i++) {
        const baseY = staffTop + i * lineSpacing
        // Main line
        gl.lineWidth = 1.5
        gl.beginPath()
        for (let x = 0; x <= cachedW; x += 8) {
          const depth = flagDepth(x, time + i * 60)
          const waveY = baseY + flagWave(x, time + i * 80)
          // Depth pulls lines toward/away from staff center (perspective)
          const perspY = staffCenterY + (waveY - staffCenterY) * depth
          const lineAlpha = (0.2 + depth * 0.18 + Math.sin(time * 0.002 + i) * 0.06) * staffActivity
          if (x === 0) {
            gl.strokeStyle = `rgba(57, 255, 20, ${lineAlpha})`
            gl.moveTo(x, perspY)
          } else {
            gl.lineTo(x, perspY)
          }
        }
        gl.globalAlpha = 0.35 * staffActivity
        gl.stroke()

        // Glow layer (skip when inactive for performance)
        if (hasNotes) {
          gl.beginPath()
          gl.lineWidth = 3 + Math.sin(time * 0.001 + i * 1.5) * 1
          for (let x = 0; x <= cachedW; x += 8) {
            const depth = flagDepth(x, time + i * 60)
            const waveY = baseY + flagWave(x, time + i * 80)
            const perspY = staffCenterY + (waveY - staffCenterY) * depth
            if (x === 0) gl.moveTo(x, perspY)
            else gl.lineTo(x, perspY)
          }
          gl.globalAlpha = 0.08 + Math.abs(flagDepth(cachedW * 0.5, time + i * 60) - 1) * 0.3
          gl.strokeStyle = '#39ff14'
          gl.stroke()
        }
      }

      // Update and draw notes — pink/magenta neon, following the flag wave
      let writeIdx = 0
      for (let i = 0; i < staffNotes.length; i++) {
        const note = staffNotes[i]
        note.x -= STAFF_SCROLL_SPEED
        note.age++

        if (note.x < -40) continue // off screen left
        staffNotes[writeIdx++] = note

        // Base staff position + flag wave displacement at this note's x, with depth
        const baseNoteY = staffBottom - note.staffY * staffHeight
        const waveOffset = flagWave(note.x, time)
        const depth = flagDepth(note.x, time)
        const rawNoteY = baseNoteY + waveOffset
        const noteY = staffCenterY + (rawNoteY - staffCenterY) * depth

        // Fade in and out
        const fadeIn = Math.min(1, note.age / 15)
        const fadeOut = note.x < 60 ? note.x / 60 : 1
        // Depth affects brightness — closer = brighter, further = dimmer
        const depthAlpha = 0.7 + (depth - 0.88) * 1.5
        const alpha = fadeIn * fadeOut * Math.min(1, depthAlpha)

        const sz = note.size * depth // scale with depth

        // Glow
        gl.globalAlpha = alpha * 0.3
        gl.fillStyle = '#ff00aa'
        gl.beginPath()
        gl.ellipse(note.x, noteY, sz * 1.8, sz * 1.3, -0.2, 0, Math.PI * 2)
        gl.fill()

        // Note head (filled ellipse)
        gl.globalAlpha = alpha
        gl.fillStyle = '#ff6ec7'
        gl.beginPath()
        gl.ellipse(note.x, noteY, sz, sz * 0.7, -0.2, 0, Math.PI * 2)
        gl.fill()

        // Bright center
        gl.globalAlpha = alpha * 0.6
        gl.fillStyle = '#ffaadd'
        gl.beginPath()
        gl.ellipse(note.x, noteY, sz * 0.5, sz * 0.35, -0.2, 0, Math.PI * 2)
        gl.fill()

        // Note stem — follows wave slope for natural look
        gl.globalAlpha = alpha * 0.7
        gl.strokeStyle = '#ff6ec7'
        gl.lineWidth = 1.5 * depth
        const stemDir = note.staffY > 0.5 ? 1 : -1
        const stemX = note.x + (stemDir > 0 ? -sz : sz) * 0.9
        const stemTopY = noteY + stemDir * 28 * depth
        gl.beginPath()
        gl.moveTo(stemX, noteY)
        gl.lineTo(stemX, stemTopY)
        gl.stroke()

        // Flag on the stem (for eighth-note look)
        if (note.velocity > 0.3) {
          gl.globalAlpha = alpha * 0.5
          gl.strokeStyle = '#ff6ec7'
          gl.lineWidth = 1.5 * depth
          gl.beginPath()
          gl.moveTo(stemX, stemTopY)
          gl.quadraticCurveTo(
            stemX + 10 * depth, stemTopY + stemDir * 5,
            stemX + 8 * depth, stemTopY + stemDir * 14
          )
          gl.stroke()
        }
      }
      staffNotes.length = writeIdx

      gl.globalAlpha = 1
    }

    // Gentle flag wave for lo mode (damped version)
    function loFlagWave(x, time) {
      const centerDist = Math.abs(x / cachedW - 0.5) * 2
      const amp = 3 + centerDist * 6
      return Math.sin(x * 0.008 - time * 0.0015) * amp +
             Math.sin(x * 0.012 + time * 0.001) * amp * 0.3
    }

    // Gentle depth for lo mode
    function loFlagDepth(x, time) {
      const centerDist = Math.abs(x / cachedW - 0.5) * 2
      const depthAmp = 0.06 + centerDist * 0.03
      return 1 + Math.sin(x * 0.006 + time * 0.0012) * depthAmp
    }

    function drawLoStaff(time) {
      const staffTop = cachedH * 0.35
      const staffBottom = cachedH * 0.55
      const staffHeight = staffBottom - staffTop
      const lineCount = 5
      const lineSpacing = staffHeight / (lineCount - 1)

      // Detect and spawn notes in lo mode too
      const isActive = ribbonInteraction?.current?.active
      const velocity = ribbonInteraction?.current?.velocity ?? 0

      if (isActive && velocity > 0.05) {
        const freq = detectPitch()
        if (freq > 40) {
          noteSpawnCounter++
          if (noteSpawnCounter >= NOTE_SPAWN_INTERVAL) {
            noteSpawnCounter = 0
            const staffPos = freqToStaffPosition(freq)
            const lineUnit = 1 / ((lineCount - 1) * 2)
            const snapped = Math.round(staffPos / lineUnit) * lineUnit
            staffNotes.push({
              x: cachedW + 20,
              staffY: snapped,
              age: 0,
              freq,
              velocity,
              size: 6 + velocity * 4,
            })
            if (staffNotes.length > MAX_STAFF_NOTES) staffNotes.shift()
          }
        }
      } else {
        noteSpawnCounter = 0
      }

      // Staff lines with gentle flag wave + depth — muted, dimmer when inactive
      const loStaffCenterY = (staffTop + staffBottom) / 2
      const loHasNotes = staffNotes.length > 0
      const loStaffActivity = loHasNotes ? 1 : 0.25
      gl.lineWidth = 1
      gl.strokeStyle = `rgba(57, 255, 20, ${0.2 * loStaffActivity})`
      for (let i = 0; i < lineCount; i++) {
        const baseY = staffTop + i * lineSpacing
        gl.beginPath()
        for (let x = 0; x <= cachedW; x += 12) {
          const waveY = baseY + loFlagWave(x, time + i * 80)
          const depth = loFlagDepth(x, time + i * 60)
          const perspY = loStaffCenterY + (waveY - loStaffCenterY) * depth
          if (x === 0) gl.moveTo(x, perspY)
          else gl.lineTo(x, perspY)
        }
        gl.globalAlpha = 0.15 * loStaffActivity
        gl.stroke()
      }

      // Notes — follow the wave with depth, simpler muted style
      let writeIdx = 0
      for (let i = 0; i < staffNotes.length; i++) {
        const note = staffNotes[i]
        note.x -= STAFF_SCROLL_SPEED * 0.8
        note.age++
        if (note.x < -30) continue
        staffNotes[writeIdx++] = note

        const baseNoteY = staffBottom - note.staffY * staffHeight
        const waveOffset = loFlagWave(note.x, time)
        const depth = loFlagDepth(note.x, time)
        const rawY = baseNoteY + waveOffset
        const noteY = loStaffCenterY + (rawY - loStaffCenterY) * depth
        const fadeIn = Math.min(1, note.age / 15)
        const fadeOut = note.x < 60 ? note.x / 60 : 1
        const alpha = fadeIn * fadeOut * 0.35
        const sz = note.size * depth

        gl.globalAlpha = alpha
        gl.fillStyle = 'rgba(255, 110, 199, 0.4)'
        gl.beginPath()
        gl.ellipse(note.x, noteY, sz, sz * 0.7, -0.2, 0, Math.PI * 2)
        gl.fill()
      }
      staffNotes.length = writeIdx
      gl.globalAlpha = 1
    }

    function drawFrequencyBars(time) {
      const barWidth = cachedW / BAR_COUNT
      const hasFreq = freqData && analyser

      if (hasFreq) {
        analyser.getByteFrequencyData(freqData)
      }

      const step = hasFreq ? Math.floor(freqData.length / BAR_COUNT) : 1

      for (let i = 0; i < BAR_COUNT; i++) {
        const value = hasFreq ? freqData[i * step] / 255 : 0

        // Shimmer: per-bar wave at different speeds/phases
        const shimmer1 = Math.sin(time * 0.001 + i * 0.4) * 0.5 + 0.5
        const shimmer2 = Math.sin(time * 0.0017 + i * 0.25 + 2.0) * 0.5 + 0.5
        const shimmer3 = Math.sin(time * 0.0007 + i * 0.6 + 4.5) * 0.5 + 0.5
        const shimmerAlpha = (shimmer1 * 0.4 + shimmer2 * 0.35 + shimmer3 * 0.25)

        // Idle: subtle shimmering outlines; active: shimmer + frequency response
        const idleAlpha = 0.03 + shimmerAlpha * 0.08
        const activeAlpha = 0.3 + value * 0.4 + shimmerAlpha * 0.15
        const alpha = value > 0.01 ? activeAlpha : idleAlpha

        const idleHeight = (10 + shimmerAlpha * 25)
        const activeHeight = value * cachedH * 0.4
        const barHeight = Math.max(idleHeight, activeHeight)

        // Shimmer the hue slightly for extra sparkle
        const hueShift = Math.sin(time * 0.002 + i * 0.3) * 8
        const hue = (i / BAR_COUNT) * 360 + hueShift
        const idleLightness = 40 + shimmerAlpha * 10
        const activeLightness = 60 + shimmerAlpha * 15
        const lightness = value > 0.01 ? activeLightness : idleLightness

        gl.strokeStyle = `hsl(${hue}, 100%, ${lightness}%)`
        gl.lineWidth = 1 + shimmerAlpha * 0.8
        gl.globalAlpha = alpha
        gl.strokeRect(
          i * barWidth + 0.5,
          0.5,
          barWidth - 2,
          barHeight
        )
      }

      gl.globalAlpha = 1
    }

    let gridPhase = 0
    let vanishXSmoothed = 0.5

    function drawPerspectiveGrid(time, dt) {
      const horizonY = cachedH * 0.45
      const isActive = ribbonInteraction?.current?.active
      const velocity = ribbonInteraction?.current?.velocity ?? 0
      const position = ribbonInteraction?.current?.position ?? 0.5

      // Forward speed: only moves when actively touching, scaled by velocity
      if (isActive) {
        gridPhase += velocity * 0.000015 * (dt || 16)
      }

      // Lateral drift: lower notes push vanishing point right, higher push left
      const targetVanishNorm = isActive ? 0.5 - (position - 0.5) * 0.8 : 0.5
      vanishXSmoothed += (targetVanishNorm - vanishXSmoothed) * 0.05
      const vanishX = vanishXSmoothed * cachedW

      // Draw horizontal lines with perspective
      gl.lineWidth = 1

      const lineCount = 20
      for (let i = 0; i < lineCount; i++) {
        const t = i / lineCount
        // Scroll lines toward viewer using accumulated phase
        const scrollOffset = (gridPhase % (1 / lineCount)) * lineCount
        const adjustedT = (t + scrollOffset) % 1
        const adjustedY = horizonY + Math.pow(adjustedT, 1.8) * (cachedH - horizonY)

        const alpha = 0.03 + adjustedT * 0.08
        gl.strokeStyle = `rgba(0, 240, 255, ${alpha})`
        gl.beginPath()
        gl.moveTo(0, adjustedY)
        gl.lineTo(cachedW, adjustedY)
        gl.stroke()
      }

      // Draw vertical lines converging to vanishing point
      const verticalLines = 16
      gl.lineWidth = 1

      for (let i = 0; i < verticalLines; i++) {
        const t = (i / (verticalLines - 1)) * 2 - 1  // -1 to 1
        const bottomX = vanishX + t * cachedW * 0.8
        const alpha = 0.04 + (1 - Math.abs(t)) * 0.06
        gl.strokeStyle = `rgba(139, 92, 246, ${alpha})`
        gl.beginPath()
        gl.moveTo(vanishX, horizonY)
        gl.lineTo(bottomX, cachedH)
        gl.stroke()
      }

      // Horizon glow line
      const horizonGrad = gl.createLinearGradient(0, horizonY - 2, 0, horizonY + 2)
      horizonGrad.addColorStop(0, 'transparent')
      horizonGrad.addColorStop(0.5, 'rgba(255, 0, 170, 0.12)')
      horizonGrad.addColorStop(1, 'transparent')
      gl.fillStyle = horizonGrad
      gl.fillRect(0, horizonY - 2, cachedW, 4)
    }

    function drawIdleAmbient(time) {
      const particles = particlesRef.current

      if (particles.length < 30 && Math.random() < 0.1) {
        particles.push({
          x: Math.random() * cachedW,
          y: Math.random() * cachedH,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          life: 1,
          decay: 0.003 + Math.random() * 0.005,
          color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
          size: 0.5 + Math.random() * 1.5,
          shape: SHAPE_CIRCLE,
          rotation: 0,
          rotationSpeed: 0,
          gravity: 0,
          shimmer: 0,
        })
      }

      // Cache the gradient — only recreate on resize
      if (!ambientGradient) {
        ambientGradient = gl.createRadialGradient(
          cachedW / 2, cachedH / 2, 0,
          cachedW / 2, cachedH / 2, cachedW * 0.5
        )
        ambientGradient.addColorStop(0, 'rgba(0, 240, 255, 0.05)')
        ambientGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.025)')
        ambientGradient.addColorStop(1, 'transparent')
      }

      const pulse = 0.6 + Math.sin(time * 0.001) * 0.4
      gl.globalAlpha = pulse
      gl.fillStyle = ambientGradient
      gl.fillRect(0, 0, cachedW, cachedH)
      gl.globalAlpha = 1
    }

    let fireworkTimer = 0
    let lastMode = visualModeRef.current
    let lastTime = 0

    function renderLo(time) {
      // Full clear — no trails
      gl.globalCompositeOperation = 'source-over'
      gl.clearRect(0, 0, cachedW, cachedH)

      // Kill any lingering particles from party mode
      particlesRef.current.length = 0

      const hasAnalyser = tryGetAnalyser()

      if (hasAnalyser && analyser) {
        analyser.getByteTimeDomainData(timeDomain)
      }
      drawLoStaff(time)

      // Very subtle ambient pulse — dimmer than party
      const pulse = 0.3 + Math.sin(time * 0.0008) * 0.2
      if (!ambientGradient) {
        ambientGradient = gl.createRadialGradient(
          cachedW / 2, cachedH / 2, 0,
          cachedW / 2, cachedH / 2, cachedW * 0.5
        )
        ambientGradient.addColorStop(0, 'rgba(0, 240, 255, 0.03)')
        ambientGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.015)')
        ambientGradient.addColorStop(1, 'transparent')
      }
      gl.globalAlpha = pulse
      gl.fillStyle = ambientGradient
      gl.fillRect(0, 0, cachedW, cachedH)
      gl.globalAlpha = 1

      frameRef.current = requestAnimationFrame(render)
    }

    function renderParty(time) {
      gl.globalCompositeOperation = 'source-over'
      gl.clearRect(0, 0, cachedW, cachedH)

      // Perspective grid behind everything
      const dt = lastTime ? time - lastTime : 16
      lastTime = time
      drawPerspectiveGrid(time, dt)

      gl.globalCompositeOperation = 'lighter'

      const hasAnalyser = tryGetAnalyser()
      const isActive = ribbonInteraction?.current?.active
      const ribbonX = getRibbonScreenX()
      const ribbonY = cachedH * 0.85

      if (hasAnalyser && analyser) {
        // Single read of time domain data for the whole frame
        analyser.getByteTimeDomainData(timeDomain)

        let maxAmplitude = 0
        for (let i = 0; i < timeDomain.length; i++) {
          const amp = Math.abs(timeDomain[i] - 128) / 128
          if (amp > maxAmplitude) maxAmplitude = amp
        }

        if (isActive && ribbonX !== null && maxAmplitude > 0.05) {
          spawnContinuousConfetti(ribbonX, ribbonY, maxAmplitude)
        }

        if (isActive && !wasActive && ribbonX !== null) {
          spawnConfettiBurst(ribbonX, ribbonY, 1)
        }

        if (isActive && ribbonX !== null && maxAmplitude > 0.1) {
          fireworkTimer++
          if (fireworkTimer % 60 === 0) {
            const fwX = ribbonX + (Math.random() - 0.5) * cachedW * 0.3
            const fwY = cachedH * 0.2 + Math.random() * cachedH * 0.3
            spawnFireworkBurst(fwX, fwY)
          }
        } else {
          fireworkTimer = 0
        }

      }

      wasActive = isActive

      drawStaffNotation(time)
      drawFrequencyBars(time)
      drawIdleAmbient(time)
      updateParticles()
      drawParticles()

      gl.globalCompositeOperation = 'source-over'

      frameRef.current = requestAnimationFrame(render)
    }

    function render(time) {
      const mode = visualModeRef.current
      if (mode !== lastMode) {
        ambientGradient = null // invalidate on mode switch
        lastMode = mode
      }
      if (mode === 'lo') {
        renderLo(time)
      } else {
        renderParty(time)
      }
    }

    frameRef.current = requestAnimationFrame(render)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      observer.disconnect()
    }
  }, [canvasRef, getEngine, ribbonInteraction])
}
