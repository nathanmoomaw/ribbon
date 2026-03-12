import { useRef } from 'react'
import { useVisualizer } from '../hooks/useVisualizer'
import './Visualizer.css'

export function Visualizer({ getEngine, ribbonInteraction, visualMode }) {
  const canvasRef = useRef(null)
  useVisualizer(canvasRef, getEngine, ribbonInteraction, visualMode)

  return (
    <div className="visualizer">
      <canvas ref={canvasRef} />
    </div>
  )
}
