import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRibbon } from '../hooks/useRibbon'
import { positionToFrequency, getStepPositions } from '../utils/pitchMap'
import { KEYS } from '../hooks/useKeyboardPlay'
import './Ribbon.css'

const KEY_LABELS = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']

export function Ribbon({ getEngine, mode, inputMode, octaves, stepped, scale, externalPosition, ribbonInteraction, arpStart, arpStop, hold }) {
  const [position, setPosition] = useState(null)
  const [isActive, setIsActive] = useState(false)

  // Sync external position from keyboard play or hold mode
  useEffect(() => {
    if (externalPosition !== null && (inputMode === 'keys' || hold)) {
      setPosition(externalPosition)
    }
  }, [externalPosition, inputMode, hold])

  const stepPositions = useMemo(() => {
    return stepped ? getStepPositions({ octaves, scale }) : []
  }, [stepped, octaves, scale])

  const onPositionChange = useCallback((pos, velocity) => {
    setPosition(pos)
    if (ribbonInteraction) {
      ribbonInteraction.current.position = pos
      if (velocity !== undefined) ribbonInteraction.current.velocity = velocity
    }
    const engine = getEngine()
    const hz = positionToFrequency(pos, { octaves, stepped, scale })
    engine.setFrequency(hz)
    if (velocity !== undefined) engine.setVelocity(velocity)
  }, [getEngine, octaves, stepped, scale, ribbonInteraction])

  const onDown = useCallback((pos, velocity) => {
    const engine = getEngine()
    setIsActive(true)
    if (ribbonInteraction) ribbonInteraction.current.active = true

    if (mode === 'play') {
      engine.noteOn(velocity)
    } else if (mode === 'latch') {
      if (!engine.getIsPlaying()) {
        engine.noteOn(velocity)
      }
    } else if (mode === 'arp') {
      arpStart()
    }

    // In hold mode, ensure note is on regardless of play mode
    if (hold && !engine.getIsPlaying()) {
      engine.noteOn(velocity)
    }
  }, [getEngine, mode, hold, ribbonInteraction, arpStart])

  const onUp = useCallback(() => {
    const engine = getEngine()
    setIsActive(false)
    if (ribbonInteraction) ribbonInteraction.current.active = false

    if (hold) return // hold keeps the note alive

    if (mode === 'play') {
      engine.noteOff()
    } else if (mode === 'arp') {
      arpStop()
    }
  }, [getEngine, mode, hold, ribbonInteraction, arpStop])

  const { ribbonRef, handlers } = useRibbon(onPositionChange, onDown, onUp)

  const displayPosition = position
  const showFreq = displayPosition !== null

  return (
    <div
      className={`ribbon ${isActive ? 'ribbon--active' : ''}`}
      ref={ribbonRef}
      {...handlers}
      style={{ touchAction: 'none' }}
    >
      <div className="ribbon__track">
        {showFreq && (
          <div
            className="ribbon__cursor"
            style={{ left: `${displayPosition * 100}%` }}
          />
        )}

        {stepped && stepPositions.length > 0 && (
          <div className="ribbon__steps">
            {stepPositions.map((pos, i) => (
              <div
                key={i}
                className="ribbon__step-marker"
                style={{ left: `${pos * 100}%` }}
              />
            ))}
          </div>
        )}

        {inputMode === 'keys' && (
          <div className="ribbon__keys">
            {KEY_LABELS.map((label, i) => {
              const pos = i / (KEY_LABELS.length - 1)
              return (
                <div
                  key={label}
                  className="ribbon__key"
                  style={{ left: `${pos * 100}%` }}
                >
                  <kbd>{label}</kbd>
                </div>
              )
            })}
          </div>
        )}

        <div className="ribbon__label">
          {showFreq
            ? `${Math.round(positionToFrequency(displayPosition, { octaves, stepped, scale }))} Hz`
            : inputMode === 'keys' ? 'press A-L to play' : 'touch to play'}
        </div>
      </div>
    </div>
  )
}
