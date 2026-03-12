import { useEffect, useRef } from 'react'

const NEON_COLORS = [
  '#00f0ff', '#ff00aa', '#39ff14', '#ff6ec7',
  '#fff01f', '#8b5cf6', '#00f0ff', '#ff00aa',
]

const MAX_PARTICLES = 200

export function useVisualizer(canvasRef, getEngine) {
  const particlesRef = useRef([])
  const frameRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('2d')
    let analyser = null
    let timeDomain = null
    let freqData = null

    function resize() {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.scale(dpr, dpr)
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

    function spawnParticles(amplitude) {
      const count = Math.floor(amplitude * 5)
      const particles = particlesRef.current
      const w = canvas.clientWidth
      const h = canvas.clientHeight

      for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 3 * amplitude
        particles.push({
          x: w / 2,
          y: h / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.005 + Math.random() * 0.015,
          color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
          size: 1 + Math.random() * 3,
        })
      }
    }

    function updateParticles() {
      const particles = particlesRef.current
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        p.vy *= 0.99
        p.life -= p.decay
        if (p.life <= 0) particles.splice(i, 1)
      }
    }

    function drawParticles() {
      const particles = particlesRef.current
      for (const p of particles) {
        gl.globalAlpha = p.life * 0.8
        gl.fillStyle = p.color
        gl.shadowColor = p.color
        gl.shadowBlur = 8
        gl.beginPath()
        gl.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        gl.fill()
      }
      gl.shadowBlur = 0
      gl.globalAlpha = 1
    }

    function drawWaveform() {
      if (!analyser || !timeDomain) return
      analyser.getByteTimeDomainData(timeDomain)

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const sliceWidth = w / timeDomain.length

      gl.lineWidth = 2
      gl.shadowBlur = 12

      // Draw with cyan
      gl.strokeStyle = '#00f0ff'
      gl.shadowColor = '#00f0ff'
      gl.beginPath()
      for (let i = 0; i < timeDomain.length; i++) {
        const v = timeDomain[i] / 128.0
        const y = (v * h) / 2
        if (i === 0) gl.moveTo(0, y)
        else gl.lineTo(i * sliceWidth, y)
      }
      gl.stroke()

      gl.shadowBlur = 0
    }

    function drawFrequencyBars() {
      if (!analyser || !freqData) return
      analyser.getByteFrequencyData(freqData)

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const barCount = 64
      const barWidth = w / barCount
      const step = Math.floor(freqData.length / barCount)

      for (let i = 0; i < barCount; i++) {
        const value = freqData[i * step] / 255
        const barHeight = value * h * 0.4
        const hue = (i / barCount) * 360
        const color = `hsl(${hue}, 100%, 60%)`

        gl.fillStyle = color
        gl.globalAlpha = 0.3 + value * 0.4
        gl.shadowColor = color
        gl.shadowBlur = 6
        gl.fillRect(
          i * barWidth,
          h - barHeight,
          barWidth - 1,
          barHeight
        )
      }

      gl.shadowBlur = 0
      gl.globalAlpha = 1
    }

    function drawIdleAmbient(time) {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const particles = particlesRef.current

      // Gentle ambient particles when idle
      if (particles.length < 30 && Math.random() < 0.1) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          life: 1,
          decay: 0.003 + Math.random() * 0.005,
          color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
          size: 0.5 + Math.random() * 1.5,
        })
      }

      // Subtle center glow pulse
      const pulse = 0.03 + Math.sin(time * 0.001) * 0.02
      const gradient = gl.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5)
      gradient.addColorStop(0, `rgba(0, 240, 255, ${pulse})`)
      gradient.addColorStop(0.5, `rgba(139, 92, 246, ${pulse * 0.5})`)
      gradient.addColorStop(1, 'transparent')
      gl.fillStyle = gradient
      gl.fillRect(0, 0, w, h)
    }

    function render(time) {
      const w = canvas.clientWidth
      const h = canvas.clientHeight

      // Clear with slight trail
      gl.globalCompositeOperation = 'source-over'
      gl.fillStyle = 'rgba(10, 10, 18, 0.15)'
      gl.fillRect(0, 0, w, h)

      gl.globalCompositeOperation = 'lighter'

      const hasAnalyser = tryGetAnalyser()

      if (hasAnalyser && analyser) {
        // Check amplitude for particle spawning
        analyser.getByteTimeDomainData(timeDomain)
        let maxAmplitude = 0
        for (let i = 0; i < timeDomain.length; i++) {
          const amp = Math.abs(timeDomain[i] - 128) / 128
          if (amp > maxAmplitude) maxAmplitude = amp
        }

        if (maxAmplitude > 0.05) {
          spawnParticles(maxAmplitude)
        }

        drawFrequencyBars()
        drawWaveform()
      }

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
  }, [canvasRef, getEngine])
}
