/**
 * AsciiOrbs — three animated ASCII wireframe spheres, one per oscillator.
 * Inspired by ribbon v2's three oscillator sphere visualizers.
 * Each orb rotates, pulses, and changes density based on its oscillator's
 * waveform, mix, and detune settings.
 */
import { useEffect, useRef } from 'react'
import './AsciiOrbs.css'

// Character density by sphere surface normal facing camera
const DEPTH_CHARS = ' .·:;+=*%#@'
// Waveform-specific surface characters
const WAVE_CHARS = {
  sine:     '·∿∿·',
  square:   '⊓⊓⊓⊓',
  sawtooth: '////',
  triangle: '∧∨∧∨',
}

const OSC_COLORS = [
  { fg: '#9988cc', bright: '#ddccff', dim: '#443366' },  // osc1: purple-steel
  { fg: '#7799bb', bright: '#aaccee', dim: '#334455' },  // osc2: steel-blue
  { fg: '#668899', bright: '#99ccbb', dim: '#223344' },  // osc3: steel-teal
]

function drawOrb(ctx, w, h, t, params, active) {
  const cx = w / 2
  const cy = h / 2
  const r  = Math.min(w, h) * 0.38

  const { mix = 0.5, waveform = 'sine', detune = 0 } = params
  const density = 0.3 + mix * 0.7        // more mix = denser surface
  const speed   = 1 + (detune / 50) * 0.4 // detune shifts rotation speed
  const theta   = t * speed               // rotation angle

  // z-buffer: for each screen cell, track max z and its char
  const cols = Math.floor(w / 6)
  const rows = Math.floor(h / 11)
  const zbuf = new Float32Array(cols * rows).fill(-2)
  const cbuf = new Array(cols * rows).fill('')

  // Parametric sphere sweep
  const steps = Math.floor(40 + mix * 60) // mix affects sample count
  const wchars = WAVE_CHARS[waveform] || WAVE_CHARS.sine

  for (let i = 0; i <= steps; i++) {
    const lat = (-Math.PI / 2) + (Math.PI * i / steps)
    const cosLat = Math.cos(lat)
    const sinLat = Math.sin(lat)
    const rowSteps = Math.max(1, Math.floor(steps * cosLat))

    for (let j = 0; j <= rowSteps; j++) {
      const lon = (2 * Math.PI * j / rowSteps)

      // Sphere point
      let x = cosLat * Math.cos(lon)
      let y = sinLat
      let z = cosLat * Math.sin(lon)

      // Rotate around Y axis
      const cosT = Math.cos(theta)
      const sinT = Math.sin(theta)
      const x2 = x * cosT + z * sinT
      const z2 = -x * sinT + z * cosT

      // Only draw front face (z2 > 0) + slight wrap for thickness
      if (z2 < -0.1) continue

      // Project to screen
      const perspective = 1.8 / (1.8 + z2 * 0.5)
      const sx = cx + x2 * r * perspective
      const sy = cy - y  * r * perspective

      // Map to character cell
      const col = Math.round(sx / 6)
      const row = Math.round(sy / 11)
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue

      const idx = row * cols + col
      if (z2 > zbuf[idx]) {
        zbuf[idx] = z2

        // Character from depth + wave pattern
        const depthNorm = (z2 + 1) / 2           // 0–1
        if (depthNorm < (1 - density) * 0.5) {
          cbuf[idx] = ''
          continue
        }
        const charIdx = Math.floor(depthNorm * (DEPTH_CHARS.length - 1))
        const wchar = wchars[j % wchars.length]
        // Mix depth char and waveform char
        cbuf[idx] = depthNorm > 0.7 ? wchar : DEPTH_CHARS[charIdx]
      }
    }
  }

  // Render character grid to canvas
  ctx.font = '9px "Courier New", monospace'
  ctx.textBaseline = 'top'
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ch = cbuf[row * cols + col]
      if (!ch) continue
      const z2 = zbuf[row * cols + col]
      const brightness = 0.25 + z2 * 0.75
      ctx.globalAlpha = brightness * (0.5 + mix * 0.5)
      ctx.fillText(ch, col * 6, row * 11)
    }
  }
  ctx.globalAlpha = 1
}

function OrbCanvas({ params, index, active, tRef }) {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const color     = OSC_COLORS[index]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function frame() {
      rafRef.current = requestAnimationFrame(frame)
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      if (canvas.width !== w  || canvas.height !== h) {
        canvas.width  = w
        canvas.height = h
      }
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = color.fg
      drawOrb(ctx, w, h, tRef.current * (index === 0 ? 1 : index === 1 ? 0.7 : 1.3), params, active)
    }
    frame()
    return () => cancelAnimationFrame(rafRef.current)
  }, [params, active, color, index, tRef])

  return (
    <div className={`ascii-orb${params?.mix > 0.05 ? ' ascii-orb--active' : ''}`} style={{ '--orb-color': color.fg }}>
      <canvas ref={canvasRef} className="ascii-orb__canvas" />
    </div>
  )
}

export function AsciiOrbs({ oscParams, shaking }) {
  const tRef = useRef(0)

  // Shared time clock for all orbs
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
      {(oscParams ?? []).map((p, i) => (
        <OrbCanvas key={i} params={p} index={i} active={p?.mix > 0.05} tRef={tRef} />
      ))}
    </div>
  )
}
