import { useRef, useCallback } from 'react'

const DAMPING = 0.96

/**
 * 2D wave-equation fluid simulation for ASCII rendering.
 * Each cell holds a float 0–1 representing wave height.
 * Pretext measures glyph dimensions so the grid maps pixel-perfectly to canvas.
 */
export function useAsciiFluid(cols, rows) {
  const cur = useRef(new Float32Array(cols * rows))
  const prv = useRef(new Float32Array(cols * rows))
  const vel = useRef(new Float32Array(cols * rows))

  const idx = (c, r) => r * cols + c

  // Advance one simulation step
  const step = useCallback(() => {
    const c = cur.current
    const p = prv.current
    const v = vel.current
    const next = new Float32Array(cols * rows)

    for (let r = 1; r < rows - 1; r++) {
      for (let col = 1; col < cols - 1; col++) {
        const i = idx(col, r)
        const neighbors = c[idx(col - 1, r)] + c[idx(col + 1, r)] +
                         c[idx(col, r - 1)] + c[idx(col, r + 1)]
        next[i] = (neighbors / 2 - p[i]) * DAMPING
        // Add velocity for touch impulses
        next[i] = Math.max(-1, Math.min(1, next[i] + v[i]))
        v[i] *= 0.85 // decay velocity
      }
    }

    prv.current = c
    cur.current = next
  }, [cols, rows])

  // Add a splash at normalized coordinates (0–1)
  const splash = useCallback((nx, ny, strength = 0.8, radius = 2) => {
    const col = Math.floor(nx * cols)
    const row = Math.floor(ny * rows)
    const v = vel.current

    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const c2 = col + dc
        const r2 = row + dr
        if (c2 < 0 || c2 >= cols || r2 < 0 || r2 >= rows) continue
        const dist = Math.sqrt(dc * dc + dr * dr)
        if (dist <= radius) {
          const falloff = 1 - dist / (radius + 1)
          v[idx(c2, r2)] += strength * falloff
        }
      }
    }
  }, [cols, rows])

  // Add ambient noise (keeps the surface alive)
  const ambient = useCallback((intensity = 0.02) => {
    const v = vel.current
    const count = Math.max(1, Math.floor(cols * rows * 0.002))
    for (let i = 0; i < count; i++) {
      const ri = Math.floor(Math.random() * cols * rows)
      v[ri] += (Math.random() - 0.5) * intensity
    }
  }, [cols, rows])

  // Get normalized height for a cell
  const get = useCallback((col, row) => {
    return cur.current[idx(col, row)]
  }, [cols, rows])

  const reset = useCallback(() => {
    cur.current.fill(0)
    prv.current.fill(0)
    vel.current.fill(0)
  }, [cols, rows])

  return { step, splash, ambient, get, reset }
}
