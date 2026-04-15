import { useRef, useEffect } from 'react'
import { drawColoredQR } from './PresetQR'
import './PresetSplash.css'

export function PresetSplash({ presetUrl, onEnter }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (canvasRef.current && presetUrl) {
      drawColoredQR(canvasRef.current, presetUrl, null)
    }
  }, [presetUrl])

  return (
    <div className="preset-splash">
      <div className="preset-splash__content">
        <canvas ref={canvasRef} className="preset-splash__canvas" />
        <button className="preset-splash__play" onClick={onEnter}>
          ▶ Play
        </button>
      </div>
    </div>
  )
}
