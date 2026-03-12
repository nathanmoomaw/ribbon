import { useEffect, useRef } from 'react'

const NEON_COLORS = [
  '#00f0ff', '#ff00aa', '#39ff14', '#ff6ec7',
  '#fff01f', '#8b5cf6', '#00f0ff', '#ff00aa',
]

const CONFETTI_COLORS = [
  '#ff0044', '#00f0ff', '#39ff14', '#ff6ec7',
  '#fff01f', '#8b5cf6', '#ff8800', '#ff00aa',
  '#00ff88', '#4488ff', '#ff4444', '#ffff00',
]

// Pre-compute bar colors once
const BAR_COUNT = 64
const BAR_COLORS = []
for (let i = 0; i < BAR_COUNT; i++) {
  const hue = (i / BAR_COUNT) * 360
  BAR_COLORS.push(`hsl(${hue}, 100%, 60%)`)
}

const MAX_PARTICLES = 500

const SHAPE_CIRCLE = 0
const SHAPE_RECT = 1
const SHAPE_STAR = 2
const SHAPE_DIAMOND = 3

// Pre-compute star path points for a 5-pointed star (unit size)
const STAR_POINTS = []
{
  const spikes = 5
  let rot = (Math.PI / 2) * 3
  const step = Math.PI / spikes
  STAR_POINTS.push(0, -1) // moveTo
  for (let i = 0; i < spikes; i++) {
    STAR_POINTS.push(Math.cos(rot), Math.sin(rot)) // outer
    rot += step
    STAR_POINTS.push(Math.cos(rot) * 0.4, Math.sin(rot) * 0.4) // inner
    rot += step
  }
}

export function useVisualizer(canvasRef, getEngine, ribbonInteraction) {
  const particlesRef = useRef([])
  const frameRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('2d')
    let analyser = null
    let timeDomain = null
    let freqData = null
    let wasActive = false
    let cachedW = 0
    let cachedH = 0
    let ambientGradient = null

    function resize() {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.setTransform(dpr, 0, 0, dpr, 0, 0)
      cachedW = canvas.clientWidth
      cachedH = canvas.clientHeight
      ambientGradient = null // invalidate cached gradient
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    function tryGetAnalyser() {
      if (analyser) return true
      try {
        const engine = getEngine()
        analyser = engine.getAnalyser()
        if (analyser) {
          timeDomain = new Uint8Array(analyser.fftSize)
          freqData = new Uint8Array(analyser.frequencyBinCount)
          return true
        }
      } catch {
        // Engine not initialized yet
      }
      return false
    }

    function getRibbonScreenX() {
      if (!ribbonInteraction?.current) return null
      const pos = ribbonInteraction.current.position
      if (pos === null) return null
      return pos * cachedW
    }

    function spawnConfettiBurst(x, y, intensity) {
      const particles = particlesRef.current
      const count = Math.floor(8 + intensity * 20)

      for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2
        const speed = 2 + Math.random() * 6 * intensity

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.004 + Math.random() * 0.008,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 2 + Math.random() * 5,
          shape: Math.floor(Math.random() * 4),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          gravity: 0.03 + Math.random() * 0.04,
          shimmer: Math.random(),
        })
      }
    }

    function spawnFireworkBurst(x, y) {
      const particles = particlesRef.current
      const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)]
      const count = 30 + Math.floor(Math.random() * 20)

      for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3
        const speed = 1.5 + Math.random() * 4
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.008 + Math.random() * 0.012,
          color,
          size: 1.5 + Math.random() * 2.5,
          shape: SHAPE_CIRCLE,
          rotation: 0,
          rotationSpeed: 0,
          gravity: 0.02,
          shimmer: 0,
          trail: true,
        })
      }
    }

    function spawnContinuousConfetti(x, y, amplitude) {
      const particles = particlesRef.current
      const count = Math.floor(1 + amplitude * 6)

      for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI
        const speed = 1 + Math.random() * 4 * amplitude

        particles.push({
          x: x + (Math.random() - 0.5) * 30,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.006 + Math.random() * 0.012,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 1.5 + Math.random() * 4,
          shape: Math.floor(Math.random() * 4),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.15,
          gravity: 0.02 + Math.random() * 0.03,
          shimmer: Math.random(),
        })
      }
    }

    function updateParticles() {
      const particles = particlesRef.current
      let writeIdx = 0
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += p.gravity
        p.vx *= 0.99
        p.rotation += p.rotationSpeed
        p.shimmer += 0.05
        p.life -= p.decay
        if (p.life > 0) {
          particles[writeIdx++] = p
        }
      }
      particles.length = writeIdx
    }

    function drawParticles() {
      const particles = particlesRef.current
      if (particles.length === 0) return

      // No shadowBlur — much faster
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const alpha = p.life * 0.9
        const shimmerAlpha = p.shimmer ? alpha * (0.7 + 0.3 * Math.sin(p.shimmer * 10)) : alpha
        gl.globalAlpha = shimmerAlpha
        gl.fillStyle = p.color

        // Manual transform instead of save/restore
        const cos = Math.cos(p.rotation)
        const sin = Math.sin(p.rotation)
        const dpr = window.devicePixelRatio || 1
        gl.setTransform(cos * dpr, sin * dpr, -sin * dpr, cos * dpr, p.x * dpr, p.y * dpr)

        if (p.trail && p.life > 0.3) {
          gl.globalAlpha = alpha * 0.3
          gl.beginPath()
          gl.arc(-p.vx * 2, -p.vy * 2, p.size * 0.6, 0, Math.PI * 2)
          gl.fill()
          gl.globalAlpha = shimmerAlpha
        }

        switch (p.shape) {
          case SHAPE_RECT:
            gl.fillRect(-p.size / 2, -p.size * 0.6, p.size, p.size * 1.2)
            break
          case SHAPE_STAR: {
            const s = p.size
            gl.beginPath()
            gl.moveTo(STAR_POINTS[0] * s, STAR_POINTS[1] * s)
            for (let j = 2; j < STAR_POINTS.length; j += 2) {
              gl.lineTo(STAR_POINTS[j] * s, STAR_POINTS[j + 1] * s)
            }
            gl.closePath()
            gl.fill()
            break
          }
          case SHAPE_DIAMOND: {
            const sz = p.size
            gl.beginPath()
            gl.moveTo(0, -sz)
            gl.lineTo(sz * 0.6, 0)
            gl.lineTo(0, sz)
            gl.lineTo(-sz * 0.6, 0)
            gl.closePath()
            gl.fill()
            break
          }
          default:
            gl.beginPath()
            gl.arc(0, 0, p.size, 0, Math.PI * 2)
            gl.fill()
        }
      }

      // Reset transform
      const dpr = window.devicePixelRatio || 1
      gl.setTransform(dpr, 0, 0, dpr, 0, 0)
      gl.globalAlpha = 1
    }

    function drawWaveform() {
      // timeDomain already populated by render()
      if (!timeDomain) return

      const sliceWidth = cachedW / timeDomain.length

      // Draw twice for glow effect: thick transparent + thin bright (no shadowBlur)
      gl.strokeStyle = '#00f0ff'
      gl.globalAlpha = 0.3
      gl.lineWidth = 6
      gl.beginPath()
      for (let i = 0; i < timeDomain.length; i++) {
        const v = timeDomain[i] / 128.0
        const y = (v * cachedH) / 2
        if (i === 0) gl.moveTo(0, y)
        else gl.lineTo(i * sliceWidth, y)
      }
      gl.stroke()

      gl.globalAlpha = 1
      gl.lineWidth = 2
      gl.stroke() // reuse same path

    }

    function drawFrequencyBars() {
      if (!freqData) return
      analyser.getByteFrequencyData(freqData)

      const barWidth = cachedW / BAR_COUNT
      const step = Math.floor(freqData.length / BAR_COUNT)

      // No shadowBlur — just alpha for glow feel
      for (let i = 0; i < BAR_COUNT; i++) {
        const value = freqData[i * step] / 255
        const barHeight = value * cachedH * 0.4

        gl.fillStyle = BAR_COLORS[i]
        gl.globalAlpha = 0.3 + value * 0.4
        gl.fillRect(
          i * barWidth,
          cachedH - barHeight,
          barWidth - 1,
          barHeight
        )
      }

      gl.globalAlpha = 1
    }

    function drawIdleAmbient(time) {
      const particles = particlesRef.current

      if (particles.length < 30 && Math.random() < 0.1) {
        particles.push({
          x: Math.random() * cachedW,
          y: Math.random() * cachedH,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          life: 1,
          decay: 0.003 + Math.random() * 0.005,
          color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
          size: 0.5 + Math.random() * 1.5,
          shape: SHAPE_CIRCLE,
          rotation: 0,
          rotationSpeed: 0,
          gravity: 0,
          shimmer: 0,
        })
      }

      // Cache the gradient — only recreate on resize
      if (!ambientGradient) {
        ambientGradient = gl.createRadialGradient(
          cachedW / 2, cachedH / 2, 0,
          cachedW / 2, cachedH / 2, cachedW * 0.5
        )
        ambientGradient.addColorStop(0, 'rgba(0, 240, 255, 0.05)')
        ambientGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.025)')
        ambientGradient.addColorStop(1, 'transparent')
      }

      const pulse = 0.6 + Math.sin(time * 0.001) * 0.4
      gl.globalAlpha = pulse
      gl.fillStyle = ambientGradient
      gl.fillRect(0, 0, cachedW, cachedH)
      gl.globalAlpha = 1
    }

    let fireworkTimer = 0

    function render(time) {
      gl.globalCompositeOperation = 'source-over'
      gl.fillStyle = 'rgba(10, 10, 18, 0.15)'
      gl.fillRect(0, 0, cachedW, cachedH)

      gl.globalCompositeOperation = 'lighter'

      const hasAnalyser = tryGetAnalyser()
      const isActive = ribbonInteraction?.current?.active
      const ribbonX = getRibbonScreenX()
      const ribbonY = cachedH * 0.85

      if (hasAnalyser && analyser) {
        // Single read of time domain data for the whole frame
        analyser.getByteTimeDomainData(timeDomain)

        let maxAmplitude = 0
        for (let i = 0; i < timeDomain.length; i++) {
          const amp = Math.abs(timeDomain[i] - 128) / 128
          if (amp > maxAmplitude) maxAmplitude = amp
        }

        if (isActive && ribbonX !== null && maxAmplitude > 0.05) {
          spawnContinuousConfetti(ribbonX, ribbonY, maxAmplitude)
        }

        if (isActive && !wasActive && ribbonX !== null) {
          spawnConfettiBurst(ribbonX, ribbonY, 1)
        }

        if (isActive && ribbonX !== null && maxAmplitude > 0.1) {
          fireworkTimer++
          if (fireworkTimer % 60 === 0) {
            const fwX = ribbonX + (Math.random() - 0.5) * cachedW * 0.3
            const fwY = cachedH * 0.2 + Math.random() * cachedH * 0.3
            spawnFireworkBurst(fwX, fwY)
          }
        } else {
          fireworkTimer = 0
        }

        drawFrequencyBars()
        drawWaveform()
      }

      wasActive = isActive

      drawIdleAmbient(time)
      updateParticles()
      drawParticles()

      gl.globalCompositeOperation = 'source-over'

      frameRef.current = requestAnimationFrame(render)
    }

    frameRef.current = requestAnimationFrame(render)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      observer.disconnect()
    }
  }, [canvasRef, getEngine, ribbonInteraction])
}
