import { useState, useRef, useCallback, useMemo } from 'react'

const MARBLE_COUNT = 9
const BASE_SIZE = 32    // standard marble diameter in px — same for all marbles
const BASE_VELOCITY = 1.0  // standard velocity — same for all marbles; sizeMultiplier scales this

// Each marble has unique visuals; size and velocity are uniform so the SIZE SELECTOR
// (1, ½, ⅓) is the only thing that changes how a marble feels on the puddle.
// pattern: 'solid' (default glass), 'cat-eye' (inner slit), 'swirl' (classic spiral), 'galaxy' (speckled core)
export const MARBLE_CONFIGS = [
  { name: 'Ruby',      color: '#cc2222', highlight: '#ff7766', shadow: '#660011', pattern: 'solid' },
  { name: 'Amber',     color: '#d4830a', highlight: '#ffcc44', shadow: '#7a4400', pattern: 'cat-eye' },
  { name: 'Emerald',   color: '#1a8c3d', highlight: '#4dff88', shadow: '#0a4020', pattern: 'swirl' },
  { name: 'Sapphire',  color: '#1a4dcc', highlight: '#66aaff', shadow: '#0a1f6e', pattern: 'solid' },
  { name: 'Amethyst',  color: '#8833cc', highlight: '#cc88ff', shadow: '#3d1166', pattern: 'galaxy' },
  { name: 'Opal',      color: '#ddeeff', highlight: '#ffffff', shadow: '#8899bb', pattern: 'cat-eye' },
  { name: 'Onyx',      color: '#1a1a2e', highlight: '#4466aa', shadow: '#0a0a14', pattern: 'galaxy' },
  { name: 'TigerEye',  color: '#b8780a', highlight: '#f0c040', shadow: '#5c3c00', pattern: 'swirl' },
  { name: 'Moonstone', color: '#aabbd0', highlight: '#e8f0ff', shadow: '#5577aa', pattern: 'solid' },
].map((cfg) => ({
  ...cfg,
  size: BASE_SIZE,
  velocity: BASE_VELOCITY,
}))

function makeMarble(id) {
  const cfg = MARBLE_CONFIGS[id]
  return {
    id,
    name: cfg.name,
    color: cfg.color,
    highlight: cfg.highlight,
    shadow: cfg.shadow,
    pattern: cfg.pattern,
    size: cfg.size,
    velocity: cfg.velocity,
    status: 'slot',  // 'slot' | 'tray' | 'dragging' | 'puddle' | 'returning'
    x: null,         // puddle-normalized 0–1
    y: null,
    dragX: null,     // screen px during drag
    dragY: null,
    vx: 0,           // physics px/frame
    vy: 0,
    droppedAt: null, // for arp ordering
  }
}

export function useMarbles(puddleRef) {
  const [marbles, setMarbles] = useState(() =>
    Array.from({ length: MARBLE_COUNT }, (_, i) => makeMarble(i))
  )
  const marblesRef = useRef(marbles)
  marblesRef.current = marbles
  const physicsFrameRef = useRef(null)
  const physicsActiveRef = useRef(false)

  // First marble still in 'slot' (not yet spawned into tray)
  const nextSlotId = useMemo(() =>
    marbles.findIndex(m => m.status === 'slot'),
  [marbles])

  // The marble currently available in the tray (status === 'tray')
  const trayMarble = useMemo(() =>
    marbles.find(m => m.status === 'tray') ?? null,
  [marbles])

  const draggingMarble = useMemo(() =>
    marbles.find(m => m.status === 'dragging') ?? null,
  [marbles])

  const puddleMarbles = useMemo(() =>
    marbles.filter(m => m.status === 'puddle').sort((a, b) => a.droppedAt - b.droppedAt),
  [marbles])

  // --- Physics loop (only runs when marbles are moving) ---
  const startPhysics = useCallback(() => {
    if (physicsActiveRef.current) return
    physicsActiveRef.current = true

    function tick() {
      const current = marblesRef.current
      const moving = current.filter(m => m.status === 'puddle')
      const hasVelocity = moving.some(m => Math.abs(m.vx) > 0.0002 || Math.abs(m.vy) > 0.0002)

      if (moving.length === 0 || !hasVelocity) {
        physicsActiveRef.current = false
        return
      }

      const updates = {}
      moving.forEach(m => {
        updates[m.id] = { x: m.x, y: m.y, vx: m.vx * 0.92, vy: m.vy * 0.92 }
      })

      // Marble-marble elastic collisions
      for (let i = 0; i < moving.length; i++) {
        for (let j = i + 1; j < moving.length; j++) {
          const a = updates[moving[i].id]
          const b = updates[moving[j].id]
          const rA = moving[i].size / 1000
          const rB = moving[j].size / 1000
          const minDist = rA + rB
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < minDist && dist > 0.00001) {
            const nx = dx / dist
            const ny = dy / dist
            const overlap = minDist - dist
            a.x -= nx * overlap * 0.5
            a.y -= ny * overlap * 0.5
            b.x += nx * overlap * 0.5
            b.y += ny * overlap * 0.5
            // Transfer momentum
            const dot = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
            if (dot < 0) {
              a.vx += dot * nx * 0.6
              a.vy += dot * ny * 0.6
              b.vx -= dot * nx * 0.6
              b.vy -= dot * ny * 0.6
            }
          }
        }
      }

      // Apply velocity and boundary clamp
      moving.forEach(m => {
        const u = updates[m.id]
        u.x += u.vx * 0.016
        u.y += u.vy * 0.016
        const r = m.size / 1000
        if (u.x < r) { u.x = r; u.vx = Math.abs(u.vx) * 0.4 }
        if (u.x > 1 - r) { u.x = 1 - r; u.vx = -Math.abs(u.vx) * 0.4 }
        if (u.y < r) { u.y = r; u.vy = Math.abs(u.vy) * 0.4 }
        if (u.y > 1 - r) { u.y = 1 - r; u.vy = -Math.abs(u.vy) * 0.4 }
      })

      setMarbles(prev => prev.map(m => {
        if (m.status !== 'puddle' || !updates[m.id]) return m
        const u = updates[m.id]
        return { ...m, x: u.x, y: u.y, vx: u.vx, vy: u.vy }
      }))

      physicsFrameRef.current = requestAnimationFrame(tick)
    }
    physicsFrameRef.current = requestAnimationFrame(tick)
  }, [])

  // Spawn the next marble into the tray
  const spawnMarble = useCallback(() => {
    setMarbles(prev => {
      const idx = prev.findIndex(m => m.status === 'slot')
      if (idx === -1) return prev
      const next = [...prev]
      next[idx] = { ...next[idx], status: 'tray' }
      return next
    })
  }, [])

  // Pick up a marble (from tray or puddle) — wires up document pointermove/up
  // sizeMultiplier: 1 (full), 0.5 (half), ~0.333 (third) — scales display size and audio velocity
  const handlePickUp = useCallback((id, clientX, clientY, sizeMultiplier = 1) => {
    setMarbles(prev => prev.map(m => {
      if (m.id !== id) return m
      const cfg = MARBLE_CONFIGS[m.id]
      const newSize = sizeMultiplier === 1 ? cfg.size : Math.max(Math.round(cfg.size * sizeMultiplier), 6)
      const newVelocity = sizeMultiplier === 1 ? cfg.velocity : Math.max(cfg.velocity * sizeMultiplier, 0.05)
      return { ...m, status: 'dragging', dragX: clientX, dragY: clientY, x: null, y: null, size: newSize, velocity: newVelocity }
    }))

    const onMove = (e) => {
      setMarbles(prev => prev.map(m =>
        m.id === id ? { ...m, dragX: e.clientX, dragY: e.clientY } : m
      ))
    }

    const onUp = (e) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)

      if (!puddleRef.current) {
        const cfg = MARBLE_CONFIGS[id]
        setMarbles(prev => prev.map(m =>
          m.id === id ? { ...m, status: 'returning', dragX: null, dragY: null, size: cfg.size, velocity: cfg.velocity } : m
        ))
        setTimeout(() => setMarbles(prev => prev.map(m =>
          m.id === id && m.status === 'returning' ? { ...m, status: 'tray', droppedAt: null } : m
        )), 350)
        return
      }

      const rect = puddleRef.current.getBoundingClientRect()
      const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                     e.clientY >= rect.top && e.clientY <= rect.bottom

      if (inside) {
        const x = (e.clientX - rect.left) / rect.width
        const y = 1 - (e.clientY - rect.top) / rect.height
        setMarbles(prev => prev.map(m =>
          m.id === id ? { ...m, status: 'puddle', x, y, dragX: null, dragY: null, droppedAt: Date.now(), vx: 0, vy: 0 } : m
        ))
      } else {
        // Return to tray — reset size/velocity to base config
        const cfg = MARBLE_CONFIGS[id]
        setMarbles(prev => prev.map(m =>
          m.id === id ? { ...m, status: 'returning', dragX: null, dragY: null, size: cfg.size, velocity: cfg.velocity } : m
        ))
        setTimeout(() => setMarbles(prev => prev.map(m =>
          m.id === id && m.status === 'returning' ? { ...m, status: 'tray', droppedAt: null } : m
        )), 350)
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [puddleRef])

  // Remove a marble from the puddle back to tray
  const removeFromPuddle = useCallback((id) => {
    setMarbles(prev => prev.map(m =>
      m.id === id ? { ...m, status: 'tray', x: null, y: null, droppedAt: null, vx: 0, vy: 0 } : m
    ))
  }, [])

  // Apply a physics impulse to a puddle marble (from finger collision)
  const applyImpulse = useCallback((id, vx, vy) => {
    setMarbles(prev => prev.map(m =>
      m.id === id ? { ...m, vx: m.vx + vx, vy: m.vy + vy } : m
    ))
    startPhysics()
  }, [startPhysics])

  // Clear all marbles completely — resets everything back to slot state (for Stop button)
  const clearAllMarbles = useCallback(() => {
    cancelAnimationFrame(physicsFrameRef.current)
    physicsActiveRef.current = false
    setMarbles(() => Array.from({ length: MARBLE_COUNT }, (_, i) => makeMarble(i)))
  }, [])

  // Restore marbles from preset data — array of { id, x, y }
  const restoreMarbles = useCallback((presetMarbles) => {
    if (!presetMarbles || presetMarbles.length === 0) return
    const placedIds = new Set(presetMarbles.map(m => m.id))
    setMarbles(prev => prev.map(m => {
      const preset = presetMarbles.find(pm => pm.id === m.id)
      if (preset) {
        return { ...m, status: 'puddle', x: preset.x, y: preset.y, droppedAt: Date.now() + m.id, vx: 0, vy: 0 }
      }
      // Non-placed marbles: first non-placed one becomes tray, rest stay slot
      return m
    }))
  }, [])

  return {
    marbles,
    nextSlotId,
    trayMarble,
    draggingMarble,
    puddleMarbles,
    spawnMarble,
    handlePickUp,
    removeFromPuddle,
    applyImpulse,
    clearAllMarbles,
    restoreMarbles,
  }
}
