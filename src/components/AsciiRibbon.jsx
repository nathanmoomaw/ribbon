import { useRef, useEffect, useCallback } from 'react'
import { prepare, measureNaturalWidth } from '@chenglou/pretext'
import { useAsciiFluid } from '../hooks/useAsciiFluid'
import { positionToFrequency, frequencyToPosition, frequencyToNoteName } from '../utils/pitchMap'
import './AsciiRibbon.css'

// ASCII characters from sparse to dense — maps wave height to char
const CHARS = ' .·:;+=*#@'
const RAINBOW = [
  '#ff0080', '#ff4040', '#ff8000', '#ffcc00',
  '#80ff00', '#00ff80', '#00ccff', '#0080ff',
  '#8000ff', '#cc00ff', '#ff00cc',
]

// Keyboard → ribbon position map (ASDF home row + JKL)
const KEY_POSITIONS = {
  KeyA: 0.0, KeyS: 0.125, KeyD: 0.25, KeyF: 0.375,
  KeyG: 0.5, KeyH: 0.575, KeyJ: 0.65, KeyK: 0.775, KeyL: 0.9,
  Semicolon: 1.0,
}

// Measure a single glyph to size the grid to the canvas
function measureGlyph(font, canvasCtx) {
  try {
    const prepared = prepare('W', font)
    const w = measureNaturalWidth(prepared)
    const sizeMatch = font.match(/(\d+)px/)
    const h = sizeMatch ? parseInt(sizeMatch[1]) * 1.2 : 14
    return { w: w || 8, h }
  } catch {
    if (canvasCtx) {
      const w = canvasCtx.measureText('W').width
      const sizeMatch = font.match(/(\d+)px/)
      return { w, h: sizeMatch ? parseInt(sizeMatch[1]) * 1.2 : 14 }
    }
    return { w: 8, h: 14 }
  }
}

// Draw a waveform sample for a given waveform type at phase t (0–1)
function waveformSample(type, t) {
  switch (type) {
    case 'sine':     return Math.sin(t * Math.PI * 2)
    case 'square':   return t < 0.5 ? 1 : -1
    case 'sawtooth': return (t * 2 - 1)
    case 'triangle': return 1 - Math.abs((t * 4 % 4) - 2)
    default:         return Math.sin(t * Math.PI * 2)
  }
}

export function AsciiRibbon({
  getEngine, mode, octaves, stepped, scale,
  ribbonInteraction, arpStart, arpStop, hold, poly,
  shaking, onArpNoteToggle, arpNotes,
  oscParams,
  onPuddleActivity,
  onSpawnConfetti,
  onSpawnNote,
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const glyphRef = useRef({ w: 8, h: 14 })
  const colsRef = useRef(80)
  const rowsRef = useRef(20)
  const activePointersRef = useRef(new Map()) // pointerId -> {nx, ny}
  const activeKeysRef = useRef(new Map())     // code -> voiceId
  const fontRef = useRef('14px "Courier New", monospace')
  const lastInteractionRef = useRef(0)        // timestamp of last user interaction
  const nextAmbientSplashRef = useRef(0)      // when to fire the next ambient ripple
  const nextGlitchRef = useRef(0)             // when to fire the next glitch frame
  const glitchActiveRef = useRef(false)       // glitch is currently rendering
  const glitchEndRef = useRef(0)              // when glitch effect expires

  // Stable refs for keyboard handler (avoids stale closure)
  const modeRef = useRef(mode)
  const octavesRef = useRef(octaves)
  const steppedRef = useRef(stepped)
  const scaleRef = useRef(scale)
  const holdRef = useRef(hold)
  const polyRef = useRef(poly)
  const oscParamsRef = useRef(oscParams ?? [])
  modeRef.current = mode
  octavesRef.current = octaves
  steppedRef.current = stepped
  scaleRef.current = scale
  holdRef.current = hold
  polyRef.current = poly
  oscParamsRef.current = oscParams ?? []

  const fluid = useAsciiFluid(colsRef.current, rowsRef.current)

  // Resize → recompute grid dimensions
  const resize = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    const ctx = canvas.getContext('2d')
    const fontSize = Math.max(10, Math.floor(canvas.height / 22))
    fontRef.current = `${fontSize}px "Courier New", monospace`
    ctx.font = fontRef.current

    const glyph = measureGlyph(fontRef.current, ctx)
    glyphRef.current = glyph
    colsRef.current = Math.floor(canvas.width / glyph.w)
    rowsRef.current = Math.floor(canvas.height / glyph.h)
    fluid.reset()
  }, [fluid])

  useEffect(() => {
    resize()
    const ro = new ResizeObserver(resize)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [resize])

  // Spawn confetti at a normalized ribbon position — converts to viewport coords
  const spawnConfetti = useCallback((nx, ny) => {
    if (!onSpawnConfetti) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    onSpawnConfetti(rect.left + nx * rect.width, rect.top + ny * rect.height)
  }, [onSpawnConfetti])

  // Spawn note-name particle at ribbon position
  const spawnNote = useCallback((nx, ny, hz) => {
    if (!onSpawnNote) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    onSpawnNote(
      rect.left + nx * rect.width,
      rect.top + ny * rect.height,
      frequencyToNoteName(hz)
    )
  }, [onSpawnNote])

  // Render loop
  useEffect(() => {
    let frame = 0

    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const cols = colsRef.current
      const rows = rowsRef.current
      const { w: gw, h: gh } = glyphRef.current

      const now = Date.now()
      const isIdle = activePointersRef.current.size === 0 && activeKeysRef.current.size === 0
      const idleDuration = now - lastInteractionRef.current

      if (frame % 3 === 0) fluid.ambient(0.015)

      // Ambient ripples when idle for >1.5s — creates visible propagating waves
      if (isIdle && idleDuration > 1500 && now > nextAmbientSplashRef.current) {
        const nx = Math.random()
        const ny = 0.2 + Math.random() * 0.6 // avoid edges
        fluid.splash(nx, ny, 0.25 + Math.random() * 0.2, 2)
        nextAmbientSplashRef.current = now + 1800 + Math.random() * 1400
      }

      // Glitch flicker — fires at a much lower frequency than ambient ripples (every 6-14s when idle)
      if (isIdle && idleDuration > 2000 && now > nextGlitchRef.current) {
        glitchActiveRef.current = true
        glitchEndRef.current = now + 60 + Math.random() * 120  // 60–180ms glitch burst
        nextGlitchRef.current = now + 6000 + Math.random() * 8000
      }
      if (now > glitchEndRef.current) glitchActiveRef.current = false

      fluid.step()
      frame++

      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = fontRef.current

      // Draw fluid ASCII surface
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const h = fluid.get(c, r)
          const norm = Math.max(0, Math.min(1, (h + 1) / 2))
          const charIdx = Math.floor(norm * (CHARS.length - 1))
          const ch = CHARS[charIdx]
          if (ch === ' ') continue

          const colorIdx = Math.floor((c / cols) * RAINBOW.length)
          const color = RAINBOW[Math.min(colorIdx, RAINBOW.length - 1)]
          ctx.globalAlpha = 0.3 + norm * 0.7
          ctx.fillStyle = color
          ctx.fillText(ch, c * gw, (r + 1) * gh)
        }
      }

      // Draw oscillator waveforms — each osc gets a horizontal band with its waveform shape
      const oscs = oscParamsRef.current
      const oscColors = ['#ff0080', '#00ccff', '#aaff00']
      const waveTime = frame * 0.025
      for (let oscIdx = 0; oscIdx < oscs.length; oscIdx++) {
        const osc = oscs[oscIdx]
        if (!osc || osc.mix < 0.05) continue
        const bandRow = Math.floor((oscIdx + 1) * rows / 4) // rows ~1/4, 2/4, 3/4
        const detuneFactor = 1 + (osc.detune / 50) * 0.3
        for (let c = 0; c < cols; c++) {
          const t = (c / cols + waveTime * detuneFactor) % 1
          const sample = waveformSample(osc.waveform, t)
          const rowOffset = Math.round(sample * 2.5)
          const r = Math.max(0, Math.min(rows - 1, bandRow + rowOffset))
          const alpha = osc.mix * 0.35
          if (alpha < 0.04) continue
          ctx.globalAlpha = alpha
          ctx.fillStyle = oscColors[oscIdx]
          ctx.fillText('·', c * gw, (r + 1) * gh)
        }
      }
      ctx.globalAlpha = 1

      // Glitch flicker — shift a random horizontal slice and invert chars briefly
      if (glitchActiveRef.current && frame % 2 === 0) {
        const glitchRows = 1 + Math.floor(Math.random() * 3)
        const glitchRow = Math.floor(Math.random() * rows)
        const shiftX = Math.floor((Math.random() - 0.5) * gw * 8)
        const glitchChars = '▓▒░█▌▐'
        ctx.globalAlpha = 0.55 + Math.random() * 0.3
        ctx.fillStyle = RAINBOW[Math.floor(Math.random() * RAINBOW.length)]
        for (let gr = glitchRow; gr < Math.min(rows, glitchRow + glitchRows); gr++) {
          for (let gc = 0; gc < cols; gc += 2 + Math.floor(Math.random() * 4)) {
            const ch = glitchChars[Math.floor(Math.random() * glitchChars.length)]
            ctx.fillText(ch, gc * gw + shiftX, (gr + 1) * gh)
          }
        }
        ctx.globalAlpha = 1
      }

      // Draw active pointer cursors — full-height column + bright marker at touch row
      activePointersRef.current.forEach(({ nx, ny }) => {
        const col = Math.floor(nx * cols)
        const touchRow = Math.floor(ny * rows)
        ctx.font = fontRef.current
        // Faint vertical line across full ribbon height
        ctx.globalAlpha = 0.28
        ctx.fillStyle = '#ffffff'
        for (let r = 0; r < rows; r++) {
          ctx.fillText('│', col * gw, (r + 1) * gh)
        }
        // Bright highlight at actual touch row
        ctx.globalAlpha = 1
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold ${fontRef.current}`
        ctx.fillText('◉', col * gw - gw * 0.2, (touchRow + 1) * gh)
        ctx.font = fontRef.current
      })

      // Draw keyboard key indicators
      activeKeysRef.current.forEach((_, code) => {
        const nx = KEY_POSITIONS[code]
        if (nx == null) return
        const col = Math.floor(nx * cols)
        ctx.globalAlpha = 0.85
        ctx.fillStyle = '#ffffaa'
        ctx.font = `bold ${fontRef.current}`
        for (let r = 0; r < rows; r++) {
          ctx.fillText('┊', col * gw, (r + 1) * gh)
        }
        ctx.font = fontRef.current
      })

      // Draw arp note markers
      if (mode === 'arp' && poly && hold && arpNotes?.length > 0) {
        ctx.globalAlpha = 0.7
        for (const hz of arpNotes) {
          const pos = frequencyToPosition(hz, { octaves })
          const col = Math.floor(pos * cols)
          ctx.fillStyle = '#00ffcc'
          for (let r = 0; r < rows; r++) {
            ctx.fillText('│', col * gw, (r + 1) * gh)
          }
        }
      }

      ctx.globalAlpha = 1
    }

    draw()
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [fluid, mode, poly, hold, arpNotes, octaves])

  // Shake effect — single splash, single confetti burst
  useEffect(() => {
    if (shaking) {
      const nx = Math.random()
      const ny = 0.2 + Math.random() * 0.6
      fluid.splash(nx, ny, 0.8, 5)
      spawnConfetti(nx, ny)
    }
  }, [shaking, fluid, spawnConfetti])

  // Pointer interaction helpers
  // Y axis: top = high velocity, bottom = low velocity
  const normalizePointer = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    const velocity = 1 - ny // flip: top=loud, bottom=soft
    return { nx, ny, velocity }
  }, [])

  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    const { nx, ny, velocity } = normalizePointer(e)
    activePointersRef.current.set(e.pointerId, { nx, ny })
    lastInteractionRef.current = Date.now()

    fluid.splash(nx, ny, 0.9, 3)
    spawnConfetti(nx, ny)
    if (onPuddleActivity) onPuddleActivity()

    const engine = getEngine()
    const voiceId = `touch_${e.pointerId}`
    const hz = positionToFrequency(nx, { octaves, stepped, scale })

    if (ribbonInteraction) {
      ribbonInteraction.current.position = nx
      ribbonInteraction.current.velocity = velocity
      ribbonInteraction.current.active = true
    }

    if (mode === 'play') {
      if (!poly) engine.allNotesOff()
      engine.voiceOn(voiceId, hz, velocity)
      spawnNote(nx, ny, hz)
    } else if (mode === 'arp') {
      if (hold && poly) {
        onArpNoteToggle?.(hz)
      } else {
        engine.setFrequency(hz)
        arpStart?.()
      }
    }
  }, [getEngine, mode, octaves, stepped, scale, hold, poly, fluid, ribbonInteraction, onArpNoteToggle, arpStart, onPuddleActivity, normalizePointer, spawnConfetti])

  const handlePointerMove = useCallback((e) => {
    if (!activePointersRef.current.has(e.pointerId)) return
    e.preventDefault()
    const { nx, ny, velocity } = normalizePointer(e)
    activePointersRef.current.set(e.pointerId, { nx, ny })

    fluid.splash(nx, ny, 0.3, 1)

    if (ribbonInteraction) {
      ribbonInteraction.current.position = nx
      ribbonInteraction.current.velocity = velocity
    }

    const engine = getEngine()
    const voiceId = `touch_${e.pointerId}`
    const hz = positionToFrequency(nx, { octaves, stepped, scale })

    if (mode === 'arp' && !(hold && poly)) {
      engine.setFrequency(hz)
    } else if (mode === 'play') {
      if (hold && !poly && engine.getActiveVoiceCount() > 0) {
        engine.setAllActiveFrequencies(hz)
      } else {
        engine.voiceSetFrequency(voiceId, hz)
      }
      engine.voiceSetVelocity?.(voiceId, velocity)
    }
  }, [getEngine, mode, octaves, stepped, scale, hold, poly, fluid, ribbonInteraction, normalizePointer])

  const handlePointerUp = useCallback((e) => {
    activePointersRef.current.delete(e.pointerId)
    if (activePointersRef.current.size === 0 && ribbonInteraction) {
      ribbonInteraction.current.active = false
    }

    const engine = getEngine()
    const voiceId = `touch_${e.pointerId}`

    if (mode === 'play') {
      if (!hold) engine.voiceOff(voiceId)
    } else if (mode === 'arp' && !(hold && poly)) {
      arpStop?.()
    }
  }, [getEngine, mode, hold, poly, arpStop, ribbonInteraction])

  // ASDF keyboard play
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const nx = KEY_POSITIONS[e.code]
      if (nx == null) return
      if (activeKeysRef.current.has(e.code)) return

      const voiceId = `key_${e.code}`
      activeKeysRef.current.set(e.code, voiceId)
      lastInteractionRef.current = Date.now()

      fluid.splash(nx, 0.5, 0.7, 2)
      spawnConfetti(nx, 0.5)

      const engine = getEngine()
      const hz = positionToFrequency(nx, {
        octaves: octavesRef.current,
        stepped: steppedRef.current,
        scale: scaleRef.current,
      })
      const velocity = 0.7 // default keyboard velocity

      if (modeRef.current === 'play') {
        if (!polyRef.current) engine.allNotesOff()
        engine.voiceOn(voiceId, hz, velocity)
        spawnNote(nx, 0.5, hz)
      } else if (modeRef.current === 'arp') {
        if (holdRef.current && polyRef.current) {
          // onArpNoteToggle is a prop — access via ref pattern isn't available here
          // just set frequency for simple arp
          engine.setFrequency(hz)
          arpStart?.()
        } else {
          engine.setFrequency(hz)
          arpStart?.()
        }
      }
    }

    const handleKeyUp = (e) => {
      const nx = KEY_POSITIONS[e.code]
      if (nx == null) return
      const voiceId = activeKeysRef.current.get(e.code)
      if (!voiceId) return
      activeKeysRef.current.delete(e.code)

      const engine = getEngine()
      if (modeRef.current === 'play' && !holdRef.current) {
        engine.voiceOff(voiceId)
      } else if (modeRef.current === 'arp' && !(holdRef.current && polyRef.current)) {
        arpStop?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [getEngine, fluid, spawnConfetti, spawnNote, arpStart, arpStop])

  return (
    <div className="ascii-ribbon" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="ascii-ribbon__canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none', cursor: 'crosshair' }}
      />
      <div className="ascii-ribbon__label">RIBBON v3 · ASCII</div>
    </div>
  )
}
