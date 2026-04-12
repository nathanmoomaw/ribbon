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
    spawn(x, y) {
      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 3 + Math.random() * 6
        particlesRef.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          life: 1.0,
          decay: 0.010 + Math.random() * 0.012,
          ch: CONFETTI_CHARS[Math.floor(Math.random() * CONFETTI_CHARS.length)],
          color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
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
    const FONT = '14px "Courier New", monospace'

    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.font = FONT

      particlesRef.current = particlesRef.current.filter(p => p.life > 0)
      for (const p of particlesRef.current) {
        ctx.globalAlpha = p.life * 0.9
        ctx.fillStyle = p.color
        ctx.fillText(p.ch, p.x, p.y)
        p.x  += p.vx
        p.y  += p.vy
        p.vy += 0.06
        p.vx *= 0.97
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
