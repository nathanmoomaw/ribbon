import { useRef, useEffect, useCallback, useState } from 'react'
import { prepare, measureNaturalWidth } from '@chenglou/pretext'
import { useAsciiFluid } from '../hooks/useAsciiFluid'
import { positionToFrequency, frequencyToPosition } from '../utils/pitchMap'
import './AsciiRibbon.css'

// ASCII characters from sparse to dense — maps wave height to char
const CHARS = ' .·:;+=*#@'
const RAINBOW = [
  '#ff0080', '#ff4040', '#ff8000', '#ffcc00',
  '#80ff00', '#00ff80', '#00ccff', '#0080ff',
  '#8000ff', '#cc00ff', '#ff00cc',
]

// Measure a single glyph to size the grid to the canvas
// Uses pretext for width (zero DOM layout thrash) + canvas for height
function measureGlyph(font, canvasCtx) {
  try {
    const prepared = prepare('W', font)
    const w = measureNaturalWidth(prepared)
    // Height approximated from font size (canvas ctx.measureText doesn't give height directly)
    const sizeMatch = font.match(/(\d+)px/)
    const h = sizeMatch ? parseInt(sizeMatch[1]) * 1.2 : 14
    return { w: w || 8, h }
  } catch {
    // Fallback: measure via canvas
    if (canvasCtx) {
      const w = canvasCtx.measureText('W').width
      const sizeMatch = font.match(/(\d+)px/)
      return { w, h: sizeMatch ? parseInt(sizeMatch[1]) * 1.2 : 14 }
    }
    return { w: 8, h: 14 }
  }
}

export function AsciiRibbon({
  getEngine, mode, octaves, stepped, scale,
  ribbonInteraction, arpStart, arpStop, hold, poly,
  shaking, onArpNoteToggle, arpNotes,
  onPuddleActivity,
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const glyphRef = useRef({ w: 8, h: 14 })
  const colsRef = useRef(80)
  const rowsRef = useRef(20)
  const activePointersRef = useRef(new Map()) // pointerId -> {x,y} normalized
  const fontRef = useRef('14px "Courier New", monospace')

  const fluid = useAsciiFluid(colsRef.current, rowsRef.current)

  // Resize → recompute grid dimensions
  const resize = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    const ctx = canvas.getContext('2d')
    // Choose font size that fits comfortably
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

      // Add ambient movement
      if (frame % 3 === 0) fluid.ambient(0.015)
      fluid.step()
      frame++

      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = fontRef.current

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const h = fluid.get(c, r)
          // Map [-1,1] to [0,1], clip
          const norm = Math.max(0, Math.min(1, (h + 1) / 2))
          const charIdx = Math.floor(norm * (CHARS.length - 1))
          const ch = CHARS[charIdx]
          if (ch === ' ') continue

          // Color: blend horizontal rainbow with brightness
          const colorIdx = Math.floor((c / cols) * RAINBOW.length)
          const color = RAINBOW[Math.min(colorIdx, RAINBOW.length - 1)]
          const alpha = 0.3 + norm * 0.7
          ctx.globalAlpha = alpha
          ctx.fillStyle = color
          ctx.fillText(ch, c * gw, (r + 1) * gh)
        }
      }

      // Draw active pointer cursors
      activePointersRef.current.forEach(({ nx, ny }) => {
        const col = Math.floor(nx * cols)
        const row = Math.floor(ny * rows)
        ctx.globalAlpha = 1
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold ${fontRef.current}`
        ctx.fillText('◉', col * gw - gw / 2, (row + 1) * gh)
        ctx.font = fontRef.current
      })

      // Draw arp note markers (vertical lines)
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

  // Shake effect — big wave across the surface
  useEffect(() => {
    if (shaking) {
      for (let i = 0; i < 8; i++) {
        fluid.splash(Math.random(), Math.random(), 0.6, 4)
      }
    }
  }, [shaking, fluid])

  // Pointer interaction
  const normalizePointer = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    return { nx, ny }
  }, [])

  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    const { nx, ny } = normalizePointer(e)
    activePointersRef.current.set(e.pointerId, { nx, ny })

    fluid.splash(nx, ny, 0.9, 3)
    if (onPuddleActivity) onPuddleActivity()

    const engine = getEngine()
    const voiceId = `touch_${e.pointerId}`
    const hz = positionToFrequency(nx, { octaves, stepped, scale })

    if (ribbonInteraction) {
      ribbonInteraction.current.position = nx
      ribbonInteraction.current.velocity = ny
      ribbonInteraction.current.active = true
    }

    if (mode === 'play') {
      if (!poly) engine.allNotesOff()
      engine.voiceOn(voiceId, hz, ny)
    } else if (mode === 'arp') {
      if (hold && poly) {
        onArpNoteToggle?.(hz)
      } else {
        engine.setFrequency(hz)
        arpStart?.()
      }
    }
  }, [getEngine, mode, octaves, stepped, scale, hold, poly, fluid, ribbonInteraction, onArpNoteToggle, arpStart, onPuddleActivity, normalizePointer])

  const handlePointerMove = useCallback((e) => {
    if (!activePointersRef.current.has(e.pointerId)) return
    e.preventDefault()
    const { nx, ny } = normalizePointer(e)
    activePointersRef.current.set(e.pointerId, { nx, ny })

    fluid.splash(nx, ny, 0.3, 1)

    if (ribbonInteraction) {
      ribbonInteraction.current.position = nx
      ribbonInteraction.current.velocity = ny
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
      engine.voiceSetVelocity?.(voiceId, ny)
    }
  }, [getEngine, mode, octaves, stepped, scale, hold, poly, fluid, ribbonInteraction, normalizePointer])

  const handlePointerUp = useCallback((e) => {
    activePointersRef.current.delete(e.pointerId)
    if (ribbonInteraction) ribbonInteraction.current.active = false

    const engine = getEngine()
    const voiceId = `touch_${e.pointerId}`

    if (mode === 'play') {
      if (!hold) {
        engine.voiceOff(voiceId)
      }
    } else if (mode === 'arp' && !(hold && poly)) {
      arpStop?.()
    }
  }, [getEngine, mode, hold, poly, arpStop, ribbonInteraction])

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
      <div className="ascii-ribbon__label">RIBBON v3 · TEXT</div>
    </div>
  )
}
