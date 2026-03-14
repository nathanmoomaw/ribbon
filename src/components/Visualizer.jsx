import { useRef, useCallback } from 'react'
import { useVisualizer } from '../hooks/useVisualizer'
import { use3DVisualizer, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '../hooks/use3DVisualizer'
import './Visualizer.css'

const VISUAL_MODES = [
  { id: 'party', label: 'Party' },
  { id: 'lo', label: 'Lo' },
]

export function Visualizer({ getEngine, ribbonInteraction, visualMode, setVisualMode, reverbMix, delayParams }) {
  const canvasRef = useRef(null)
  const threeRef = useRef(null)

  useVisualizer(canvasRef, getEngine, ribbonInteraction, visualMode)
  const { targetZoomRef } = use3DVisualizer(threeRef, getEngine, ribbonInteraction, visualMode, reverbMix, delayParams)

  const handleZoomIn = useCallback(() => {
    targetZoomRef.current = Math.max(MIN_ZOOM, targetZoomRef.current - ZOOM_STEP)
  }, [targetZoomRef])

  const handleZoomOut = useCallback(() => {
    targetZoomRef.current = Math.min(MAX_ZOOM, targetZoomRef.current + ZOOM_STEP)
  }, [targetZoomRef])

  return (
    <div className="visualizer">
      <div className="visualizer-3d" ref={threeRef} />
      <canvas ref={canvasRef} />
      <div className="visualizer__visuals">
        {VISUAL_MODES.map((m) => (
          <button
            key={m.id}
            className={visualMode === m.id ? 'active' : ''}
            onClick={() => setVisualMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="visualizer__zoom">
        <button onClick={handleZoomIn} aria-label="Zoom in">+</button>
        <button onClick={handleZoomOut} aria-label="Zoom out">&minus;</button>
      </div>
    </div>
  )
}
