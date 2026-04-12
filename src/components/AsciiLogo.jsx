import { useEffect, useRef } from 'react'
import './AsciiLogo.css'

const TAGLINE = 'v3 · ascii ribbon'

/**
 * Moebius strip drawn as a parametric curve on canvas.
 * Two edges traced: solid line (near edge) over dashed (far edge),
 * giving depth cues as the strip rotates around the Y axis.
 */
function drawMoebius(ctx, w, h, t) {
  ctx.clearRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2
  const rx = w * 0.38   // horizontal radius
  const ry = h * 0.28   // vertical radius
  const halfWidth = h * 0.18  // half-width of the strip

  // Sample both edges of the Möbius strip
  const STEPS = 120
  const nearEdge = []
  const farEdge = []

  for (let i = 0; i <= STEPS; i++) {
    const u = (i / STEPS) * Math.PI * 2  // parameter along the centerline
    // Rotate the strip by t (animation angle)
    const phi = u + t

    // Centerline of the Möbius on the figure-8 (lemniscate)
    const cosU = Math.cos(phi)
    const sinU = Math.sin(phi)
    const cx2 = rx * cosU / (1 + sinU * sinU)
    const cy2 = ry * sinU * cosU / (1 + sinU * sinU)

    // Normal direction (perpendicular in 2D) — twisted by u/2 to create the Möbius twist
    const twist = u / 2
    const nx = -Math.sin(twist) * halfWidth * (0.5 + 0.5 * Math.cos(phi))
    const ny = Math.cos(twist) * halfWidth * (0.4 + 0.3 * Math.abs(cosU))

    nearEdge.push({ x: cx + cx2 + nx, y: cy + cy2 + ny, depth: Math.cos(phi + Math.PI / 4) })
    farEdge.push({ x: cx + cx2 - nx, y: cy + cy2 - ny, depth: -Math.cos(phi + Math.PI / 4) })
  }

  // Draw far edge first (dashed, dimmer) then near edge (solid, brighter)
  const drawEdge = (points, alpha, dash) => {
    ctx.beginPath()
    ctx.setLineDash(dash)
    ctx.globalAlpha = alpha
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Far edge — dashed dim line
  ctx.strokeStyle = '#334488'
  ctx.lineWidth = 1
  drawEdge(farEdge, 0.5, [3, 4])

  // Near edge — solid bright rainbow gradient
  const grad = ctx.createLinearGradient(0, 0, w, 0)
  grad.addColorStop(0,    '#ff0080')
  grad.addColorStop(0.25, '#ff8800')
  grad.addColorStop(0.5,  '#00ff80')
  grad.addColorStop(0.75, '#0088ff')
  grad.addColorStop(1,    '#ff0080')

  ctx.strokeStyle = grad
  ctx.lineWidth = 1.5
  drawEdge(nearEdge, 0.9, [])

  // Crossover dots — mark where near crosses far
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < nearEdge.length - 1; i++) {
    const n = nearEdge[i]
    const f = farEdge[i]
    const dist = Math.hypot(n.x - f.x, n.y - f.y)
    if (dist < 2.5 && i % 3 === 0) {
      ctx.beginPath()
      ctx.arc(n.x, n.y, 1, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

export function AsciiLogo({ onClick }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const tRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    function animate() {
      tRef.current += 0.018
      drawMoebius(ctx, W, H, tRef.current)
      rafRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div className="ascii-logo" onClick={onClick} role="button" tabIndex={0}>
      <span className="ascii-logo__ribbon">ribbon</span>
      <canvas
        ref={canvasRef}
        className="ascii-logo__moebius-canvas"
        aria-hidden="true"
      />
      <span className="ascii-logo__tag">{TAGLINE}</span>
    </div>
  )
}
