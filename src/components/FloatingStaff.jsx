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

  // Scatter notes along the strip
  const noteCount = Math.floor(randBetween(4, 12))
  const notes = []
  for (let i = 0; i < noteCount; i++) {
    notes.push({
      xOff: randBetween(0, width),        // x offset within strip
      lineOff: Math.floor(randBetween(-2, 7)), // above/on/below staff lines
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

  return { x: startX, y, speed, direction, lineSpacing, alpha, width, notes, bars }
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

    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const W = canvas.width
      const H = canvas.height

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

        // Draw 5 staff lines
        ctx.strokeStyle = COLORS[0] + s.alpha + ')'
        ctx.lineWidth = 0.7
        for (let l = 0; l < 5; l++) {
          const ly = s.y + l * s.lineSpacing
          ctx.beginPath()
          ctx.moveTo(s.x, ly)
          ctx.lineTo(s.x + s.width, ly)
          ctx.stroke()
        }

        // Draw barlines (vertical)
        for (const b of s.bars) {
          ctx.strokeStyle = b.color
          ctx.lineWidth = 0.8
          const bx = s.x + b.xOff
          ctx.beginPath()
          ctx.moveTo(bx, s.y - s.lineSpacing)
          ctx.lineTo(bx, s.y + 5 * s.lineSpacing)
          ctx.stroke()
        }

        // Draw notes
        for (const n of s.notes) {
          ctx.font = `${n.size}px "Courier New", monospace`
          ctx.fillStyle = n.color
          ctx.globalAlpha = 1
          const nx = s.x + n.xOff
          const ny = s.y + n.lineOff * s.lineSpacing
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
