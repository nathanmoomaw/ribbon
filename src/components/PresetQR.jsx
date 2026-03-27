import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import QRCode from 'qrcode'
import { buildPresetUrl } from '../utils/presets'
import './PresetQR.css'

// Ribbon gradient colors for the QR code
const GRADIENT_STOPS = [
  { offset: 0, color: [0, 240, 255] },      // cyan
  { offset: 0.25, color: [139, 92, 246] },   // purple
  { offset: 0.5, color: [255, 110, 199] },   // pink
  { offset: 0.75, color: [255, 170, 50] },   // orange
  { offset: 1, color: [57, 255, 20] },       // green
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

function drawColoredQR(canvas, url) {
  const size = 280

  // Generate QR modules
  QRCode.toCanvas(canvas, url, {
    width: size,
    margin: 2,
    color: { dark: '#000000', light: '#00000000' },
    errorCorrectionLevel: 'M',
  }, () => {
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Apply gradient to dark modules
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4
        const alpha = data[idx + 3]
        if (alpha > 128) {
          // This pixel is a dark module — apply diagonal gradient
          const t = (x + y) / (canvas.width + canvas.height)
          const [r, g, b] = lerpColor(GRADIENT_STOPS, t)
          data[idx] = r
          data[idx + 1] = g
          data[idx + 2] = b
          data[idx + 3] = 255
        }
      }
    }
    ctx.putImageData(imageData, 0, 0)
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

  // Redraw QR when URL changes (including name changes)
  useEffect(() => {
    if (canvasRef.current && url) {
      drawColoredQR(canvasRef.current, url)
    }
  }, [url])

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
    link.download = `ribbon-preset${name ? '-' + name.replace(/\s+/g, '-').toLowerCase() : ''}.png`
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
