/**
 * ConfettiCanvas — fixed full-screen confetti overlay.
 * Renders particle bursts anywhere on the viewport.
 * Exposed via ref: { spawn(x, y) }
 */
import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'

const CONFETTI_CHARS = ['*', '+', '×', '◇', '△', '○', '◈', '❋', '✦']
const RAINBOW = [
  '#ff0080', '#ff4040', '#ff8000', '#ffcc00',
  '#80ff00', '#00ff80', '#00ccff', '#0080ff',
  '#8000ff', '#cc00ff', '#ff00cc',
]

export const ConfettiCanvas = forwardRef(function ConfettiCanvas(_props, ref) {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const rafRef = useRef(null)

  useImperativeHandle(ref, () => ({
    spawn(x, y, opts = {}) {
      const count = opts.count ?? 32
      const baseSpeed = opts.speed ?? 4.5
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        // Vary speed per particle for organic feel
        const speed = baseSpeed * (0.4 + Math.random() * 1.2)
        particlesRef.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5 - Math.random() * 2,
          life: 0.85 + Math.random() * 0.3,
          decay: 0.005 + Math.random() * 0.012,
          ch: CONFETTI_CHARS[Math.floor(Math.random() * CONFETTI_CHARS.length)],
          color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
          size: opts.size ?? (10 + Math.floor(Math.random() * 6)),
        })
      }
    },
    spawnNote(x, y, noteName) {
      // Large note name particle — fades slowly, rises
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: -3 - Math.random() * 2,
        life: 1.0,
        decay: 0.006 + Math.random() * 0.004,
        ch: noteName,
        color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
        size: 22 + Math.floor(Math.random() * 8),
        isNote: true,
      })
      // A few small sparkles around the note
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 2 + Math.random() * 3
        particlesRef.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 0.8 + Math.random() * 0.2,
          decay: 0.018 + Math.random() * 0.02,
          ch: CONFETTI_CHARS[Math.floor(Math.random() * CONFETTI_CHARS.length)],
          color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
          size: 12,
        })
      }
    }
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const ctx = canvas.getContext('2d')
    let lastFont = ''

    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current = particlesRef.current.filter(p => p.life > 0)
      for (const p of particlesRef.current) {
        const font = `${p.isNote ? 'bold ' : ''}${p.size ?? 14}px "Courier New", monospace`
        if (font !== lastFont) { ctx.font = font; lastFont = font }
        ctx.globalAlpha = p.life * (p.isNote ? 0.95 : 0.88)
        ctx.fillStyle = p.color
        ctx.fillText(p.ch, p.x, p.y)
        p.x  += p.vx
        p.y  += p.vy
        p.vy += p.isNote ? 0.03 : 0.07   // notes float more gently
        p.vx *= p.isNote ? 0.99 : 0.97
        p.life -= p.decay
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
        zIndex: 1000,
      }}
    />
  )
})
