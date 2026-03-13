import { useState, useCallback, useEffect, useMemo, forwardRef } from 'react'
import { useRibbon } from '../hooks/useRibbon'
import { positionToFrequency, getStepPositions } from '../utils/pitchMap'
import { KEYS } from '../hooks/useKeyboardPlay'
import './Ribbon.css'

const KEY_LABELS = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']

export const Ribbon = forwardRef(function Ribbon({ getEngine, mode, inputMode, octaves, stepped, scale, externalPositions, ribbonInteraction, arpStart, arpStop, hold, shaking, undulating }, ref) {
  // Map of voice id -> position (for both touch and keyboard cursors)
  const [positions, setPositions] = useState(new Map())
  const [activePointers, setActivePointers] = useState(new Set())

  // Sync external positions from keyboard play or hold mode
  useEffect(() => {
    if (externalPositions && externalPositions.size > 0) {
      setPositions(prev => {
        const next = new Map(prev)
        for (const [id, pos] of externalPositions) {
          next.set(id, pos)
        }
        return next
      })
    }
  }, [externalPositions])

  const stepPositions = useMemo(() => {
    return stepped ? getStepPositions({ octaves, scale }) : []
  }, [stepped, octaves, scale])

  const onPositionChange = useCallback((pointerId, pos, velocity) => {
    const voiceId = `touch_${pointerId}`
    setPositions(prev => new Map(prev).set(voiceId, pos))
    if (ribbonInteraction) {
      ribbonInteraction.current.position = pos
      if (velocity !== undefined) ribbonInteraction.current.velocity = velocity
    }
    const engine = getEngine()
    const hz = positionToFrequency(pos, { octaves, stepped, scale })
    engine.voiceSetFrequency(voiceId, hz)
    if (velocity !== undefined) engine.voiceSetVelocity(voiceId, velocity)
  }, [getEngine, octaves, stepped, scale, ribbonInteraction])

  const onDown = useCallback((pointerId, pos, velocity) => {
    const engine = getEngine()
    const voiceId = `touch_${pointerId}`
    const hz = positionToFrequency(pos, { octaves, stepped, scale })
    setActivePointers(prev => new Set(prev).add(voiceId))
    if (ribbonInteraction) ribbonInteraction.current.active = true

    if (mode === 'play') {
      engine.voiceOn(voiceId, hz, velocity)
    } else if (mode === 'latch') {
      if (!engine.voiceIsPlaying(voiceId)) {
        engine.voiceOn(voiceId, hz, velocity)
      }
    } else if (mode === 'arp') {
      // Arp stays mono — set frequency and start arp
      engine.setFrequency(hz)
      arpStart()
    }

    // In hold mode, ensure voice is on
    if (hold && !engine.voiceIsPlaying(voiceId) && mode !== 'arp') {
      engine.voiceOn(voiceId, hz, velocity)
    }
  }, [getEngine, mode, hold, octaves, stepped, scale, ribbonInteraction, arpStart])

  const onUp = useCallback((pointerId) => {
    const voiceId = `touch_${pointerId}`
    const engine = getEngine()
    setActivePointers(prev => {
      const next = new Set(prev)
      next.delete(voiceId)
      // Only mark interaction inactive when all pointers are up
      if (next.size === 0 && ribbonInteraction) {
        ribbonInteraction.current.active = false
      }
      return next
    })

    if (hold) return // hold keeps voices alive

    if (mode === 'play') {
      engine.voiceOff(voiceId)
    } else if (mode === 'arp') {
      arpStop()
    }

    // Clean up position for released touch (unless hold or latch)
    if (!hold && mode !== 'latch') {
      setPositions(prev => {
        const next = new Map(prev)
        next.delete(voiceId)
        return next
      })
    }
  }, [getEngine, mode, hold, ribbonInteraction, arpStop])

  const { ribbonRef, handlers } = useRibbon(onPositionChange, onDown, onUp)

  const allPositions = [...positions.entries()]
  const showAnyFreq = allPositions.length > 0
  // Use the most recent position for the Hz display
  const displayPosition = allPositions.length > 0 ? allPositions[allPositions.length - 1][1] : null

  return (
    <div
      className={`ribbon ${activePointers.size > 0 ? 'ribbon--active' : ''} ${shaking ? 'ribbon--shaking' : ''}`}
      ref={(el) => {
        ribbonRef.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      }}
      {...handlers}
      style={{ touchAction: 'none' }}
    >
      <div className={`ribbon__track ${undulating ? 'ribbon__track--undulating' : ''}`}>
        {allPositions.map(([id, pos]) => (
          <div
            key={id}
            className="ribbon__cursor"
            style={{ left: `${pos * 100}%` }}
          />
        ))}

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
          {showAnyFreq
            ? `${Math.round(positionToFrequency(displayPosition, { octaves, stepped, scale }))} Hz`
            : inputMode === 'keys' ? 'press A-L to play' : 'touch to play'}
        </div>
      </div>
    </div>
  )
})
