import { useRef } from 'react'
import { useVisualizer } from '../hooks/useVisualizer'
import './Visualizer.css'

export function Visualizer({ getEngine }) {
  const canvasRef = useRef(null)
  useVisualizer(canvasRef, getEngine)

  return (
    <div className="visualizer">
      <canvas ref={canvasRef} />
    </div>
  )
}
