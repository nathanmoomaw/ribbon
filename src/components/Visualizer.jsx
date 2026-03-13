import { useRef } from 'react'
import { useVisualizer } from '../hooks/useVisualizer'
import { use3DVisualizer } from '../hooks/use3DVisualizer'
import './Visualizer.css'

export function Visualizer({ getEngine, ribbonInteraction, visualMode }) {
  const canvasRef = useRef(null)
  const threeRef = useRef(null)

  useVisualizer(canvasRef, getEngine, ribbonInteraction, visualMode)
  use3DVisualizer(threeRef, getEngine, ribbonInteraction, visualMode)

  return (
    <div className="visualizer">
      <div className="visualizer-3d" ref={threeRef} />
      <canvas ref={canvasRef} />
    </div>
  )
}
