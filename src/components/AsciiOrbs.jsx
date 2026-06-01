/**
 * AsciiOrbs — three animated ASCII wireframe spheres on a shared canvas.
 * Spheres orbit a common center at different speeds/phases so they loop
 * through and around each other like interacting bodies.
 */
import { useEffect, useRef } from 'react'
import './AsciiOrbs.css'

const DEPTH_CHARS = ' .·:;+=*%#@'
const WAVE_CHARS = {
  sine:     '·∿∿·',
  square:   '⊓⊓⊓⊓',
  sawtooth: '////',
  triangle: '∧∨∧∨',
}

const OSC_COLORS = [
  { fg: '#39FF14', bright: '#aaff80' },  // osc1: terminal lime
  { fg: '#FFE840', bright: '#fffaaa' },  // osc2: meyer lemon
  { fg: '#FF9030', bright: '#ffcc88' },  // osc3: orange
]

// Draw a single orb at (cx, cy) on the given canvas context
function drawOrb(ctx, w, h, cx, cy, t, params) {
  const r = Math.min(w, h) * 0.27   // slightly smaller since all 3 share canvas

  const { mix = 0.5, waveform = 'sine', detune = 0 } = params
  const density = 0.3 + mix * 0.7
  const speed   = 1 + (detune / 50) * 0.4
  const theta   = t * speed

  const cols = Math.floor(w / 6)
  const rows = Math.floor(h / 11)
  const zbuf = new Float32Array(cols * rows).fill(-2)
  const cbuf = new Array(cols * rows).fill('')

  const steps = Math.floor(36 + mix * 50)
  const wchars = WAVE_CHARS[waveform] || WAVE_CHARS.sine

  for (let i = 0; i <= steps; i++) {
    const lat = (-Math.PI / 2) + (Math.PI * i / steps)
    const cosLat = Math.cos(lat)
    const sinLat = Math.sin(lat)
    const rowSteps = Math.max(1, Math.floor(steps * cosLat))

    for (let j = 0; j <= rowSteps; j++) {
      const lon = (2 * Math.PI * j / rowSteps)

      let x = cosLat * Math.cos(lon)
      let y = sinLat
      let z = cosLat * Math.sin(lon)

      const cosT = Math.cos(theta)
      const sinT = Math.sin(theta)
      const x2 = x * cosT + z * sinT
      const z2 = -x * sinT + z * cosT

      if (z2 < -0.1) continue

      const perspective = 1.8 / (1.8 + z2 * 0.5)
      const sx = cx + x2 * r * perspective
      const sy = cy - y  * r * perspective

      const col = Math.round(sx / 6)
      const row = Math.round(sy / 11)
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue

      const idx = row * cols + col
      if (z2 > zbuf[idx]) {
        zbuf[idx] = z2
        const depthNorm = (z2 + 1) / 2
        if (depthNorm < (1 - density) * 0.5) {
          cbuf[idx] = ''
          continue
        }
        const charIdx = Math.floor(depthNorm * (DEPTH_CHARS.length - 1))
        const wchar = wchars[j % wchars.length]
        cbuf[idx] = depthNorm > 0.7 ? wchar : DEPTH_CHARS[charIdx]
      }
    }
  }

  ctx.font = '9px "Courier New", monospace'
  ctx.textBaseline = 'top'
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ch = cbuf[row * cols + col]
      if (!ch) continue
      const z2 = zbuf[row * cols + col]
      const brightness = 0.25 + z2 * 0.75
      ctx.globalAlpha = brightness * (0.4 + mix * 0.6)
      ctx.fillText(ch, col * 6, row * 11)
    }
  }
  ctx.globalAlpha = 1
}

// Orbital speeds and phase offsets — different enough to create interesting crossings
const ORBIT_CONFIGS = [
  { speedX: 0.52, speedY: 0.38, phase: 0 },
  { speedX: 0.88, speedY: 0.63, phase: 2.09 },
  { speedX: 0.65, speedY: 1.02, phase: 4.19 },
]
// Each orb's own rotation speed multiplier
const SPIN_SPEEDS = [1.0, 0.70, 1.30]

function SharedOrbsCanvas({ oscParams, tRef }) {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function frame() {
      rafRef.current = requestAnimationFrame(frame)
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      if (!w || !h) return
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w
        canvas.height = h
      }
      ctx.clearRect(0, 0, w, h)

      const t = tRef.current
      const baseCx = w / 2
      const baseCy = h / 2
      // Orbit radius: spheres drift within ~16% of the smaller dimension
      const orbitR = Math.min(w, h) * 0.16

      oscParams.forEach((p, i) => {
        const cfg = ORBIT_CONFIGS[i]
        // Lissajous-style orbit so paths cross and interweave
        const ox = baseCx + orbitR * Math.cos(t * cfg.speedX + cfg.phase)
        const oy = baseCy + orbitR * Math.sin(t * cfg.speedY + cfg.phase) * 0.65
        ctx.fillStyle = OSC_COLORS[i].fg
        drawOrb(ctx, w, h, ox, oy, t * SPIN_SPEEDS[i], p)
      })
    }

    frame()
    return () => cancelAnimationFrame(rafRef.current)
  }, [oscParams, tRef])

  return (
    <canvas
      ref={canvasRef}
      className="ascii-orbs__canvas"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}

export function AsciiOrbs({ oscParams, shaking }) {
  const tRef = useRef(0)

  useEffect(() => {
    let rafId
    function tick() {
      rafId = requestAnimationFrame(tick)
      tRef.current += 0.016
    }
    tick()
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div className="ascii-orbs">
      <SharedOrbsCanvas oscParams={oscParams ?? []} tRef={tRef} />
    </div>
  )
}
