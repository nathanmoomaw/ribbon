/**
 * FloatingStaff — animated ASCII music notation that drifts across the screen.
 * Inspired by the Rock & Rumble v2 ribbon staff animation.
 * Renders on a fixed full-screen canvas behind everything.
 */
import { useRef, useEffect } from 'react'

// Music symbols to scatter as floating notes
const NOTE_SYMS = ['♩', '♪', '♫', '♬', '𝄞', '𝄢', '𝅘𝅥𝅮', '♭', '♯', '𝄽']
const STAFF_CHAR = '─'
const BAR_CHAR   = '│'

// Palette: muted steel blues from the Rock & Rule design
const COLORS = [
  'rgba(153,136,204,', // steel purple
  'rgba(119,153,187,', // steel blue
  'rgba(102,136,153,', // steel teal
  'rgba(80,100,180,',  // accent blue
  'rgba(170,160,220,', // light purple
]

function randColor(alpha = 0.25) {
  return COLORS[Math.floor(Math.random() * COLORS.length)] + alpha + ')'
}

function randBetween(a, b) {
  return a + Math.random() * (b - a)
}

// A single "staff strip": 5 lines + scattered notes that drifts across the screen
function makeStrip(canvasW, canvasH) {
  const y = randBetween(0.08, 0.92) * canvasH
  const speed = randBetween(0.18, 0.55) // px/frame
  const direction = Math.random() < 0.5 ? 1 : -1
  const lineSpacing = randBetween(5, 9)
  const alpha = randBetween(0.12, 0.28)
  const width = randBetween(canvasW * 0.4, canvasW * 1.1)
  const startX = direction > 0
    ? -width - randBetween(0, canvasW * 0.5)
    : canvasW + randBetween(0, canvasW * 0.5)

  // Wave parameters — flag-like undulation
  const waveAmp   = randBetween(4, 14)     // vertical wave height
  const waveFreq  = randBetween(0.008, 0.018) // wave frequency along x
  const waveSpeed = randBetween(0.8, 2.2)  // how fast the wave flows
  const wavePhase = Math.random() * Math.PI * 2

  // Scatter notes along the strip
  const noteCount = Math.floor(randBetween(4, 12))
  const notes = []
  for (let i = 0; i < noteCount; i++) {
    notes.push({
      xOff: randBetween(0, width),
      lineOff: Math.floor(randBetween(-2, 7)),
      sym: NOTE_SYMS[Math.floor(Math.random() * NOTE_SYMS.length)],
      color: randColor(alpha * 1.8),
      size: randBetween(10, 16),
    })
  }

  // Occasional barlines
  const barCount = Math.floor(randBetween(1, 4))
  const bars = []
  for (let i = 0; i < barCount; i++) {
    bars.push({
      xOff: randBetween(0, width),
      color: randColor(alpha * 1.2),
    })
  }

  return { x: startX, y, speed, direction, lineSpacing, alpha, width, notes, bars,
           waveAmp, waveFreq, waveSpeed, wavePhase }
}

export function FloatingStaff() {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const stripsRef = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      // Re-seed strips on resize
      stripsRef.current = Array.from({ length: 5 }, () => makeStrip(canvas.width, canvas.height))
    }
    resize()
    window.addEventListener('resize', resize)

    const ctx = canvas.getContext('2d')
    let timeMs = 0

    function draw(ts) {
      rafRef.current = requestAnimationFrame(draw)
      timeMs = ts
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const W = canvas.width
      const H = canvas.height
      const t = ts * 0.001  // seconds

      for (const s of stripsRef.current) {
        s.x += s.speed * s.direction

        // Recycle when fully off-screen
        const gone = s.direction > 0
          ? s.x > W + 20
          : s.x + s.width < -20
        if (gone) {
          Object.assign(s, makeStrip(W, H))
          continue
        }

        // Helper: y offset at a given x for this strip's wave
        const waveY = (wx) =>
          Math.sin(wx * s.waveFreq + t * s.waveSpeed + s.wavePhase) * s.waveAmp

        // Draw 5 staff lines as sine curves (wavy flag effect)
        ctx.strokeStyle = COLORS[0] + s.alpha + ')'
        ctx.lineWidth = 0.7
        for (let l = 0; l < 5; l++) {
          const baseY = s.y + l * s.lineSpacing
          ctx.beginPath()
          // Sample the wave at small intervals for smooth curve
          const steps = Math.ceil(s.width / 4)
          for (let si = 0; si <= steps; si++) {
            const wx = s.x + (si / steps) * s.width
            const wy = baseY + waveY(wx)
            if (si === 0) ctx.moveTo(wx, wy)
            else ctx.lineTo(wx, wy)
          }
          ctx.stroke()
        }

        // Draw barlines (vertical, tilted with the wave)
        for (const b of s.bars) {
          ctx.strokeStyle = b.color
          ctx.lineWidth = 0.8
          const bx = s.x + b.xOff
          const wOffset = waveY(bx)
          ctx.beginPath()
          ctx.moveTo(bx, s.y - s.lineSpacing + wOffset)
          ctx.lineTo(bx, s.y + 5 * s.lineSpacing + wOffset)
          ctx.stroke()
        }

        // Draw notes — float on the wave
        for (const n of s.notes) {
          ctx.font = `${n.size}px "Courier New", monospace`
          ctx.fillStyle = n.color
          ctx.globalAlpha = 1
          const nx = s.x + n.xOff
          const wy = waveY(nx)
          const ny = s.y + n.lineOff * s.lineSpacing + wy
          ctx.fillText(n.sym, nx, ny)
        }
      }

      ctx.globalAlpha = 1
    }

    draw()
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none',
        zIndex: 4,
      }}
    />
  )
}
