import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import QRCode from 'qrcode'
import { buildPresetUrl } from '../utils/presets'
import './PresetQR.css'

// Oil-spill iridescent gradient — thin-film interference palette
const GRADIENT_STOPS = [
  { offset: 0, color: [180, 40, 255] },     // deep violet
  { offset: 0.15, color: [0, 200, 255] },    // cyan
  { offset: 0.3, color: [20, 255, 160] },    // teal-green
  { offset: 0.45, color: [255, 200, 0] },    // gold
  { offset: 0.6, color: [255, 60, 180] },    // magenta
  { offset: 0.75, color: [100, 0, 255] },    // violet
  { offset: 0.9, color: [0, 220, 255] },     // cyan again (wrap)
  { offset: 1, color: [180, 40, 255] },      // back to violet
]

function lerpColor(stops, t) {
  t = Math.max(0, Math.min(1, t))
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].offset && t <= stops[i + 1].offset) {
      const local = (t - stops[i].offset) / (stops[i + 1].offset - stops[i].offset)
      return stops[i].color.map((c, j) => Math.round(c + (stops[i + 1].color[j] - c) * local))
    }
  }
  return stops[stops.length - 1].color
}

// Seeded pseudo-random for consistent spill shapes per URL
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return h
}

// Draw organic spill drips extending beyond QR boundary
function drawSpillEdges(ctx, w, h, rng) {
  const spillCount = 8 + Math.floor(rng() * 6)
  for (let i = 0; i < spillCount; i++) {
    const side = Math.floor(rng() * 4) // 0=top, 1=right, 2=bottom, 3=left
    const t = 0.15 + rng() * 0.7 // position along edge (avoid corners)
    const spillLen = 8 + rng() * 18
    const spillWidth = 4 + rng() * 10

    let sx, sy, ex, ey, cp1x, cp1y, cp2x, cp2y
    if (side === 0) { // top
      sx = t * w; sy = 0; ex = sx + (rng() - 0.5) * spillWidth; ey = -spillLen
    } else if (side === 1) { // right
      sx = w; sy = t * h; ex = w + spillLen; ey = sy + (rng() - 0.5) * spillWidth
    } else if (side === 2) { // bottom
      sx = t * w; sy = h; ex = sx + (rng() - 0.5) * spillWidth; ey = h + spillLen
    } else { // left
      sx = 0; sy = t * h; ex = -spillLen; ey = sy + (rng() - 0.5) * spillWidth
    }

    cp1x = sx + (ex - sx) * 0.3 + (rng() - 0.5) * spillWidth
    cp1y = sy + (ey - sy) * 0.3 + (rng() - 0.5) * spillWidth
    cp2x = sx + (ex - sx) * 0.7 + (rng() - 0.5) * spillWidth * 0.5
    cp2y = sy + (ey - sy) * 0.7 + (rng() - 0.5) * spillWidth * 0.5

    const gradT = (sx + sy) / (w + h)
    const [r, g, b] = lerpColor(GRADIENT_STOPS, gradT)

    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey)

    // Draw as a tapered blob
    const bx = ex + (rng() - 0.5) * 4
    const by = ey + (rng() - 0.5) * 4
    ctx.bezierCurveTo(bx + spillWidth * 0.3, by + spillWidth * 0.3, cp1x + spillWidth * 0.2, cp1y + spillWidth * 0.2, sx + (side % 2 === 0 ? spillWidth * 0.4 : 0), sy + (side % 2 === 1 ? spillWidth * 0.4 : 0))
    ctx.closePath()

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.5 + rng() * 0.4})`
    ctx.fill()
  }
}

// Draw warped recaptcha-style text — aggressive per-character distortion with wave baseline
function drawWarpedText(ctx, text, cx, cy, size, rng) {
  const fontSize = Math.min(26, Math.max(13, Math.floor(size / (text.length * 0.6))))
  const chars = text.split('')
  const fonts = ['bold', 'italic bold', 'bold']

  // Measure total width for centering (use a consistent font for measuring)
  ctx.font = `bold ${fontSize}px monospace`
  const charWidths = chars.map(c => ctx.measureText(c).width * (0.9 + rng() * 0.4))
  const spacing = (rng() - 0.5) * 4 // variable per-char spacing offset baked into rng
  const totalW = charWidths.reduce((a, b) => a + b, 0) + chars.length * 2
  const bandH = fontSize + 22

  // Wave parameters for the baseline — low-freq sine makes the whole line wavy
  const waveAmp = 6 + rng() * 8
  const waveFreq = 0.8 + rng() * 1.2
  const wavePhase = rng() * Math.PI * 2

  // Semi-transparent dark band behind text — follows the wave
  ctx.fillStyle = 'rgba(8, 8, 22, 0.78)'
  const rx = cx - totalW / 2 - 10
  const ry = cy - bandH / 2
  const bw = totalW + 20
  const bh = bandH

  // Wobbly band with more aggressive edge wobble
  ctx.beginPath()
  ctx.moveTo(rx + 4, ry + (rng() - 0.5) * 6)
  for (let sx = 0; sx <= bw; sx += bw / 6) {
    const wobbleTop = (rng() - 0.5) * 7
    const wobbleBot = (rng() - 0.5) * 7
    if (sx === 0) continue
    ctx.lineTo(rx + sx, ry + wobbleTop)
  }
  ctx.lineTo(rx + bw, ry + bh + (rng() - 0.5) * 6)
  for (let sx = bw; sx >= 0; sx -= bw / 6) {
    ctx.lineTo(rx + sx, ry + bh + (rng() - 0.5) * 7)
  }
  ctx.closePath()
  ctx.fill()

  // Strikethrough noise line across the band
  if (rng() > 0.3) {
    const lineY = ry + bh * (0.3 + rng() * 0.4)
    ctx.beginPath()
    ctx.moveTo(rx, lineY + (rng() - 0.5) * 4)
    for (let sx = 0; sx <= bw; sx += bw / 8) {
      ctx.lineTo(rx + sx, lineY + (rng() - 0.5) * 6)
    }
    const [lr, lg, lb] = lerpColor(GRADIENT_STOPS, rng())
    ctx.strokeStyle = `rgba(${lr}, ${lg}, ${lb}, 0.25)`
    ctx.lineWidth = 1 + rng()
    ctx.stroke()
  }

  // Draw each character with aggressive per-character distortion
  let xPos = cx - totalW / 2
  for (let i = 0; i < chars.length; i++) {
    const charW = charWidths[i]
    const charCenterX = xPos + charW / 2

    // Wave baseline offset
    const waveY = Math.sin(wavePhase + (charCenterX - cx) / size * Math.PI * 2 * waveFreq) * waveAmp

    const angle = (rng() - 0.5) * 0.65       // rotation: ±~37°
    const scaleX = 0.7 + rng() * 0.7          // horizontal stretch 0.7–1.4
    const scaleY = 0.7 + rng() * 0.65         // vertical stretch 0.7–1.35
    const yOff = (rng() - 0.5) * 10 + waveY   // larger vertical jitter + wave
    const skewX = (rng() - 0.5) * 0.45        // stronger horizontal skew
    const skewY = (rng() - 0.5) * 0.15        // vertical skew too
    const fontStyle = fonts[Math.floor(rng() * fonts.length)]

    // Per-char color from gradient, shifted along x
    const gradT = ((charCenterX - cx + size) / (size * 2) + rng() * 0.15) % 1
    const [r, g, b] = lerpColor(GRADIENT_STOPS, gradT)

    ctx.save()
    ctx.translate(charCenterX, cy + yOff)
    ctx.rotate(angle)
    // Full affine transform: scaleX, skewY, skewX, scaleY
    ctx.transform(scaleX, skewY, skewX, scaleY, 0, 0)
    ctx.font = `${fontStyle} ${fontSize}px monospace`
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(chars[i], 0, 0)

    // Glow on most chars — stronger than before
    if (rng() > 0.35) {
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`
      ctx.shadowBlur = 6 + rng() * 8
      ctx.fillText(chars[i], 0, 0)
      ctx.shadowBlur = 0
    }

    // Ghost echo on some chars (slightly offset, low opacity)
    if (rng() > 0.6) {
      ctx.globalAlpha = 0.18 + rng() * 0.12
      ctx.fillText(chars[i], (rng() - 0.5) * 4, (rng() - 0.5) * 4)
      ctx.globalAlpha = 1
    }

    ctx.restore()

    xPos += charW + 2
  }
}

export function drawColoredQR(canvas, url, name) {
  const qrSize = 280
  const spill = 24 // extra space for spill effects
  const size = qrSize + spill * 2

  canvas.width = size
  canvas.height = size

  // Use higher error correction when embedding text so the QR stays scannable
  const ecLevel = name ? 'H' : 'M'

  // Create a temp canvas for the raw QR
  const tmpCanvas = document.createElement('canvas')

  QRCode.toCanvas(tmpCanvas, url, {
    width: qrSize,
    margin: 2,
    color: { dark: '#000000', light: '#00000000' },
    errorCorrectionLevel: ecLevel,
  }, () => {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, size, size)

    const rng = mulberry32(hashString(url))

    // Draw spill edges first (behind QR)
    ctx.save()
    ctx.translate(spill, spill)
    drawSpillEdges(ctx, qrSize, qrSize, rng)
    ctx.restore()

    // Draw the QR onto main canvas with offset
    ctx.drawImage(tmpCanvas, spill, spill)

    // Apply iridescent oil-spill gradient to QR modules
    const imageData = ctx.getImageData(spill, spill, qrSize, qrSize)
    const data = imageData.data

    for (let y = 0; y < qrSize; y++) {
      for (let x = 0; x < qrSize; x++) {
        const idx = (y * qrSize + x) * 4
        const alpha = data[idx + 3]
        if (alpha > 128) {
          // Swirling iridescence — use radial+angular gradient for oil-spill look
          const cx = x / qrSize - 0.5
          const cy = y / qrSize - 0.5
          const angle = Math.atan2(cy, cx) / (Math.PI * 2) + 0.5
          const dist = Math.sqrt(cx * cx + cy * cy) * 2
          const t = (angle * 0.6 + dist * 0.4 + (x + y) / (qrSize * 3)) % 1
          const [r, g, b] = lerpColor(GRADIENT_STOPS, t)
          data[idx] = r
          data[idx + 1] = g
          data[idx + 2] = b
          data[idx + 3] = 255
        }
      }
    }
    ctx.putImageData(imageData, spill, spill)

    // Add subtle iridescent glow around QR edges
    ctx.save()
    ctx.translate(spill, spill)
    const glowGrad = ctx.createRadialGradient(qrSize / 2, qrSize / 2, qrSize * 0.3, qrSize / 2, qrSize / 2, qrSize * 0.6)
    glowGrad.addColorStop(0, 'rgba(180, 40, 255, 0)')
    glowGrad.addColorStop(0.7, 'rgba(0, 200, 255, 0.04)')
    glowGrad.addColorStop(1, 'rgba(255, 60, 180, 0.08)')
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = glowGrad
    ctx.fillRect(-spill, -spill, size, size)
    ctx.globalCompositeOperation = 'source-over'
    ctx.restore()

    // Draw more spill drips on top (overlapping QR edges)
    ctx.save()
    ctx.translate(spill, spill)
    ctx.globalAlpha = 0.4
    drawSpillEdges(ctx, qrSize, qrSize, rng)
    ctx.globalAlpha = 1
    ctx.restore()

    // Warped recaptcha-style text overlay
    if (name) {
      const trimmed = name.trim()
      if (trimmed) {
        drawWarpedText(ctx, trimmed, size / 2, size / 2, qrSize, rng)
      }
    }
  })
}

export function PresetQR({ settings, initialName, onClose }) {
  const canvasRef = useRef(null)
  const [name, setName] = useState(initialName || '')
  const [copied, setCopied] = useState(false)

  // Build URL with current name
  const url = useMemo(
    () => buildPresetUrl(settings, name.trim() || undefined),
    [settings, name]
  )

  // Redraw QR when URL or name changes
  useEffect(() => {
    if (canvasRef.current && url) {
      drawColoredQR(canvasRef.current, url, name)
    }
  }, [url, name])

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Create a new canvas with dark background + padding for download
    const pad = 32
    const dlCanvas = document.createElement('canvas')
    dlCanvas.width = canvas.width + pad * 2
    dlCanvas.height = canvas.height + pad * 2 + (name ? 40 : 0)
    const ctx = dlCanvas.getContext('2d')

    // Dark background
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, dlCanvas.width, dlCanvas.height)

    // Draw QR
    ctx.drawImage(canvas, pad, pad)

    // Draw name if provided
    if (name) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(name, dlCanvas.width / 2, canvas.height + pad + 28)
    }

    const link = document.createElement('a')
    link.download = `ribbon${name ? '-' + name.trim().replace(/\s+/g, '-').toLowerCase() : '-preset'}.png`
    link.href = dlCanvas.toDataURL('image/png')
    link.click()
  }, [name])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [url])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="preset-qr-overlay" onClick={onClose}>
      <div className="preset-qr-modal" onClick={e => e.stopPropagation()}>
        <button className="preset-qr-modal__close" onClick={onClose} aria-label="Close">&times;</button>

        <canvas ref={canvasRef} className="preset-qr-modal__canvas" />

        <input
          className="preset-qr-modal__name"
          type="text"
          placeholder="name this preset (optional)"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={40}
          autoFocus
        />

        {(settings.walletAddress || settings.loopData) && (
          <div className="preset-qr-modal__meta">
            {settings.walletAddress && (
              <span className="preset-qr-modal__wallet">
                {settings.walletAddress.slice(0, 6)}...{settings.walletAddress.slice(-4)}
              </span>
            )}
            {settings.loopData && settings.loopData.events && settings.loopData.events.length > 0 && (
              <span className="preset-qr-modal__loop-badge">loop included</span>
            )}
          </div>
        )}

        <div className="preset-qr-modal__actions">
          <button className="preset-qr-modal__btn" onClick={handleDownload}>
            Save
          </button>
          <button className="preset-qr-modal__btn" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  )
}
