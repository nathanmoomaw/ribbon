import { useState, useCallback } from 'react'
import { useRibbon } from '../hooks/useRibbon'
import { positionToFrequency } from '../utils/pitchMap'
import './Ribbon.css'

export function Ribbon({ getEngine, mode, octaves }) {
  const [position, setPosition] = useState(null)
  const [isActive, setIsActive] = useState(false)

  const onPositionChange = useCallback((pos) => {
    setPosition(pos)
    const engine = getEngine()
    const hz = positionToFrequency(pos, { octaves })
    engine.setFrequency(hz)
  }, [getEngine, octaves])

  const onDown = useCallback((pos) => {
    const engine = getEngine()
    setIsActive(true)

    if (mode === 'play') {
      engine.noteOn()
    } else if (mode === 'latch') {
      if (engine.getIsPlaying()) {
        // Already latched — just update pitch
      } else {
        engine.noteOn()
      }
    }
  }, [getEngine, mode])

  const onUp = useCallback(() => {
    const engine = getEngine()
    setIsActive(false)

    if (mode === 'play') {
      engine.noteOff()
    }
    // latch: stays on
  }, [getEngine, mode])

  const { ribbonRef, handlers } = useRibbon(onPositionChange, onDown, onUp)

  return (
    <div
      className={`ribbon ${isActive ? 'ribbon--active' : ''}`}
      ref={ribbonRef}
      {...handlers}
      style={{ touchAction: 'none' }}
    >
      <div className="ribbon__track">
        {position !== null && (
          <div
            className="ribbon__cursor"
            style={{ left: `${position * 100}%` }}
          />
        )}
        <div className="ribbon__label">
          {isActive && position !== null
            ? `${Math.round(positionToFrequency(position, { octaves }))} Hz`
            : 'touch to play'}
        </div>
      </div>
    </div>
  )
}
