import { useState, useCallback, useEffect, useMemo, useRef, forwardRef } from 'react'
import { usePuddle } from '../hooks/usePuddle'
import { usePuddleRenderer } from '../hooks/usePuddleRenderer'
import { positionToFrequency, frequencyToPosition, getStepPositions } from '../utils/pitchMap'
import './Puddle.css'

/**
 * Puddle — 2D kaos pad surface replacing the Ribbon.
 * X axis controls pitch, Y axis controls velocity.
 * Renders an iridescent oil-spill blob via Three.js shaders.
 * Includes confetti particles (Asteroids-style unfilled geometry).
 */
export const Puddle = forwardRef(function Puddle({
  getEngine, mode, octaves, stepped, scale,
  ribbonInteraction, arpStart, arpStop, hold, poly,
  shaking, undulating, onArpNoteToggle, arpNotes,
  recordEvent, onDragEscape, onPuddleActivity,
  puddleMarbles, onMarbleRemove, onMarblePuddlePickUp, onMarbleImpulse, marbleDepressions,
}, ref) {
  const [positions, setPositions] = useState(new Map())
  const [activePointers, setActivePointers] = useState(new Set())
  const [splashes, setSplashes] = useState([])
  const splashIdRef = useRef(0)
  const threeContainerRef = useRef(null)
  const confettiCanvasRef = useRef(null)
  const confettiParticles = useRef([])
  const confettiFrame = useRef(0)

  const arpMarkerPositions = useMemo(() => {
    if (mode !== 'arp' || !poly || !hold || arpNotes.length === 0) return []
    return arpNotes.map(hz => ({
      hz,
      pos: frequencyToPosition(hz, { octaves }),
    }))
  }, [arpNotes, mode, poly, hold, octaves])

  const onPositionChange = useCallback((pointerId, x, y) => {
    if (mode === 'arp' && poly && hold) return

    const voiceId = `touch_${pointerId}`
    if (ribbonInteraction) {
      ribbonInteraction.current.position = x
      ribbonInteraction.current.velocity = y
    }
    const engine = getEngine()
    const hz = positionToFrequency(x, { octaves, stepped, scale })

    if (mode === 'arp') {
      engine.setFrequency(hz)
    } else if (hold && mode === 'play' && !poly) {
      engine.setAllActiveFrequencies(hz)
    } else {
      engine.voiceSetFrequency(voiceId, hz)
    }
    if (y !== undefined) engine.voiceSetVelocity(voiceId, y)
    setPositions(prev => new Map(prev).set(voiceId, { x, y }))
  }, [getEngine, mode, poly, hold, octaves, stepped, scale, ribbonInteraction])

  const onDown = useCallback((pointerId, x, y) => {
    const engine = getEngine()
    const voiceId = `touch_${pointerId}`
    const hz = positionToFrequency(x, { octaves, stepped, scale })
    setActivePointers(prev => new Set(prev).add(voiceId))
    if (ribbonInteraction) ribbonInteraction.current.active = true

    // Apply physics impulse to any marble near this touch
    if (onMarbleImpulse && puddleMarbles?.length > 0) {
      for (const m of puddleMarbles) {
        const dx = x - m.x
        const dy = y - m.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const hitRadius = m.size / 400
        if (dist < hitRadius && dist > 0.00001) {
          const nx = -dx / dist
          const ny = -dy / dist
          onMarbleImpulse(m.id, nx * 0.015, ny * 0.015)
        }
      }
    }

    // Spawn confetti burst + water splash ring
    spawnConfetti(x, y)
    addSplash(x, y)

    // Record for looper
    if (recordEvent) recordEvent('voice_on', { hz, velocity: y })

    if (mode === 'play') {
      if (hold && !poly && engine.getActiveVoiceCount() > 0) {
        engine.setAllActiveFrequencies(hz)
        setPositions(() => new Map([[voiceId, { x, y }]]))
      } else {
        if (!poly) engine.allNotesOff()
        engine.voiceOn(voiceId, hz, y)
      }
    } else if (mode === 'arp') {
      if (hold && poly) {
        onArpNoteToggle(hz)
      } else {
        engine.setFrequency(hz)
        arpStart()
      }
    }

    if (hold && mode !== 'arp' && engine.getActiveVoiceCount() === 0) {
      engine.voiceOn(voiceId, hz, y)
    }
  }, [getEngine, mode, hold, poly, octaves, stepped, scale, ribbonInteraction, arpStart, onArpNoteToggle, recordEvent])

  const onUp = useCallback((pointerId) => {
    const voiceId = `touch_${pointerId}`
    const engine = getEngine()
    setActivePointers(prev => {
      const next = new Set(prev)
      next.delete(voiceId)
      if (next.size === 0 && ribbonInteraction) {
        ribbonInteraction.current.active = false
      }
      return next
    })

    if (hold) return

    if (mode === 'play') {
      engine.voiceOff(voiceId)
    } else if (mode === 'arp') {
      arpStop()
    }

    if (!hold) {
      setPositions(prev => {
        const next = new Map(prev)
        next.delete(voiceId)
        return next
      })
    }
  }, [getEngine, mode, hold, ribbonInteraction, arpStop])

  const handleDragEscape = useCallback((pointerId) => {
    onDragEscape?.(pointerId)
  }, [onDragEscape])

  // Broadcast puddle activity intensity when touching
  const prevActivityRef = useRef(false)
  useEffect(() => {
    const hasActivity = activePointers.size > 0
    if (hasActivity !== prevActivityRef.current) {
      prevActivityRef.current = hasActivity
      onPuddleActivity?.(hasActivity ? 1 : 0)
    }
  }, [activePointers, onPuddleActivity])

  const { puddleRef, ripples, handlers } = usePuddle(onPositionChange, onDown, onUp, handleDragEscape)

  // Three.js renderer
  usePuddleRenderer(threeContainerRef, ripples, getEngine, marbleDepressions)

  // --- Water splash rings ---
  function addSplash(nx, ny) {
    const id = splashIdRef.current++
    setSplashes(prev => [...prev, { id, x: nx, y: ny }])
    setTimeout(() => {
      setSplashes(prev => prev.filter(s => s.id !== id))
    }, 600)
  }

  // --- Asteroids-style confetti system ---
  const SHAPES = ['triangle', 'square', 'pentagon', 'diamond']

  function spawnConfetti(nx, ny) {
    const count = 5 + Math.floor(Math.random() * 5)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 3
      confettiParticles.current.push({
        x: nx, y: 1 - ny, // flip Y for canvas coords
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        size: 4 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        color: `hsl(${Math.random() * 360}, 80%, 65%)`,
        life: 1.0,
        decay: 0.008 + Math.random() * 0.012,
      })
    }
  }

  // Confetti render loop
  useEffect(() => {
    const canvas = confettiCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function drawShape(ctx, shape, size) {
      ctx.beginPath()
      if (shape === 'triangle') {
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2
          const method = i === 0 ? 'moveTo' : 'lineTo'
          ctx[method](Math.cos(a) * size, Math.sin(a) * size)
        }
        ctx.closePath()
      } else if (shape === 'square') {
        ctx.rect(-size, -size, size * 2, size * 2)
      } else if (shape === 'diamond') {
        ctx.moveTo(0, -size)
        ctx.lineTo(size, 0)
        ctx.lineTo(0, size)
        ctx.lineTo(-size, 0)
        ctx.closePath()
      } else if (shape === 'pentagon') {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2
          const method = i === 0 ? 'moveTo' : 'lineTo'
          ctx[method](Math.cos(a) * size, Math.sin(a) * size)
        }
        ctx.closePath()
      }
    }

    function animate() {
      confettiFrame.current = requestAnimationFrame(animate)

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      ctx.clearRect(0, 0, w, h)

      const particles = confettiParticles.current
      if (particles.length === 0) return  // skip draw work when empty

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx / w
        p.y += p.vy / h
        p.vy += 0.03 // gravity
        p.vx *= 0.99
        p.vy *= 0.99
        p.rotation += p.rotSpeed
        p.life -= p.decay

        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.translate(p.x * w, p.y * h)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = p.life
        ctx.strokeStyle = p.color
        ctx.lineWidth = 1.5
        drawShape(ctx, p.shape, p.size)
        ctx.stroke()
        ctx.restore()
      }
    }
    animate()

    return () => cancelAnimationFrame(confettiFrame.current)
  }, [])

  const allPositions = [...positions.entries()]

  return (
    <>
    {/* SVG clip path — objectBoundingBox coords (0–1) make it fully responsive */}
    <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none', overflow: 'hidden' }}>
      <defs>
        {/*
          Puddle silhouette — wide/flat, ~3:1 ratio.
          Two organic lobes on the left with concave notches,
          smooth rounded right cap, gentle top/bottom arcs.
          Coordinates in objectBoundingBox space (0–1 on each axis).
        */}
        {/*
          Puddle silhouette — clean non-self-intersecting smooth oval.
          Slightly wider on the right, asymmetric organic feel.
          No bumps for now: bumps require careful path design to avoid
          the nonzero winding rule creating interior holes.
          objectBoundingBox coords (0–1 on each axis).
        */}
        <clipPath id="puddle-shape-clip" clipPathUnits="objectBoundingBox">
          <path d="
            M 0.20 0.18
            C 0.38 0.09, 0.60 0.09, 0.78 0.18
            C 0.90 0.24, 0.97 0.36, 0.97 0.50
            C 0.97 0.64, 0.90 0.76, 0.78 0.82
            C 0.60 0.91, 0.38 0.91, 0.20 0.82
            C 0.08 0.75, 0.03 0.64, 0.03 0.50
            C 0.03 0.36, 0.08 0.24, 0.20 0.18
            Z
          " />
        </clipPath>
      </defs>
    </svg>
    <div
      className={`puddle ${activePointers.size > 0 ? 'puddle--active' : ''} ${shaking ? 'puddle--shaking' : ''}`}
      ref={(el) => {
        puddleRef.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      }}
      {...handlers}
      style={{ touchAction: 'none' }}
    >
      {/* Three.js iridescent oil surface */}
      <div className="puddle__three" ref={threeContainerRef} />

      {/* Confetti canvas overlay */}
      <canvas className="puddle__confetti" ref={confettiCanvasRef} />

      {/* Water splash rings on touch */}
      {splashes.map(s => (
        <div
          key={s.id}
          className="puddle__splash"
          style={{ left: `${s.x * 100}%`, top: `${(1 - s.y) * 100}%` }}
        />
      ))}

      {/* Touch cursors */}
      {allPositions.map(([id, { x, y }]) => (
        <div
          key={id}
          className="puddle__cursor"
          style={{ left: `${x * 100}%`, top: `${(1 - y) * 100}%` }}
        />
      ))}

      {/* Arp note markers */}
      {arpMarkerPositions.length > 0 && (
        <div className="puddle__arp-markers">
          {arpMarkerPositions.map(({ hz, pos }) => (
            <div
              key={hz}
              className="puddle__arp-marker"
              style={{ left: `${pos * 100}%` }}
              onPointerDown={(e) => {
                e.stopPropagation()
                onArpNoteToggle(hz)
              }}
            />
          ))}
        </div>
      )}

      {/* Puddle marbles — drag to reposition, click (no drag) to remove */}
      {puddleMarbles?.map(m => (
        <div
          key={m.id}
          className={`puddle__marble${m.pattern ? ` puddle__marble--${m.pattern}` : ''}`}
          style={{
            left: `${m.x * 100}%`,
            top: `${(1 - m.y) * 100}%`,
            '--marble-color': m.color,
            '--marble-highlight': m.highlight,
            '--marble-shadow': m.shadow,
            '--marble-size': `${m.size}px`,
          }}
          onPointerDown={(e) => {
            e.stopPropagation()
            const startX = e.clientX
            const startY = e.clientY
            let dragged = false

            const onMove = (me) => {
              if (dragged) return
              if (Math.abs(me.clientX - startX) + Math.abs(me.clientY - startY) > 6) {
                dragged = true
                document.removeEventListener('pointermove', onMove)
                document.removeEventListener('pointerup', onUp)
                onMarblePuddlePickUp?.(m.id, me.clientX, me.clientY)
              }
            }

            const onUp = () => {
              document.removeEventListener('pointermove', onMove)
              document.removeEventListener('pointerup', onUp)
              if (!dragged) {
                // Pure click — remove marble back to tray
                onMarbleRemove?.(m.id)
              }
            }

            document.addEventListener('pointermove', onMove)
            document.addEventListener('pointerup', onUp)
          }}
        />
      ))}

      {/* Hz display */}
      <div className="puddle__label">
        {allPositions.length > 0
          ? `${Math.round(positionToFrequency(allPositions[allPositions.length - 1][1].x, { octaves, stepped, scale }))} Hz`
          : <>touch puddle to play<span className="puddle__hint">no sound? keep tapping!</span></>
        }
      </div>
    </div>
    </>
  )
})
