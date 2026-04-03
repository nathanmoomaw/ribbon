import { useRef, useCallback, memo } from 'react'
import './RotaryKnob.css'

const MIN_ANGLE = -135
const MAX_ANGLE = 135
const ANGLE_RANGE = MAX_ANGLE - MIN_ANGLE // 270°

/**
 * Rotary knob with ghost slider overlay.
 * Uses vertical drag (up = increase, down = decrease) with pointer capture.
 * Ghost slider fades in while dragging to hint at the interaction model.
 */
export const RotaryKnob = memo(function RotaryKnob({
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  color = 'var(--cyan)',
  label,
  size = 48,
  className = '',
}) {
  const knobRef = useRef(null)
  const notchRef = useRef(null)
  const ghostRef = useRef(null)
  const ghostThumbRef = useRef(null)
  const dragging = useRef(false)
  const hasDragged = useRef(false)
  const startY = useRef(0)
  const startValue = useRef(0)

  const range = max - min

  // Map value to angle
  const ratio = Math.max(0, Math.min(1, (value - min) / range))
  const angle = MIN_ANGLE + ratio * ANGLE_RANGE

  // Direct DOM update for zero-lag response
  const applyVisuals = useCallback((newRatio) => {
    const deg = MIN_ANGLE + newRatio * ANGLE_RANGE
    if (notchRef.current) {
      notchRef.current.style.transform = `rotate(${deg}deg)`
    }
    if (ghostThumbRef.current) {
      const topPct = (1 - newRatio) * 100
      ghostThumbRef.current.style.top = `${topPct}%`
    }
  }, [])

  const onPointerDown = useCallback((e) => {
    dragging.current = true
    startY.current = e.clientY
    startValue.current = value
    e.currentTarget.setPointerCapture(e.pointerId)

    // Show ghost slider
    if (ghostRef.current) ghostRef.current.classList.add('rotary-knob__ghost--visible')
  }, [value])

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return
    hasDragged.current = true

    // Vertical drag: up = increase, down = decrease
    // 200px of drag covers the full range
    const dy = startY.current - e.clientY
    const deltaRatio = dy / 200
    const newValue = Math.max(min, Math.min(max,
      startValue.current + deltaRatio * range
    ))

    // Snap to step
    const stepped = Math.round(newValue / step) * step
    const clampedStepped = Math.max(min, Math.min(max, stepped))

    const newRatio = (clampedStepped - min) / range
    applyVisuals(newRatio)
    onChange(clampedStepped)
  }, [min, max, step, range, onChange, applyVisuals])

  const onPointerUp = useCallback(() => {
    const didDrag = hasDragged.current
    dragging.current = false
    hasDragged.current = false
    // Hide ghost slider
    if (ghostRef.current) ghostRef.current.classList.remove('rotary-knob__ghost--visible')
    if (didDrag) {
      // Swallow the synthetic click that fires after a pointer-capture drag ends
      // outside the knob element — prevents the useShake click handler from firing.
      const suppress = (e) => e.stopImmediatePropagation()
      document.addEventListener('click', suppress, { once: true, capture: true })
      setTimeout(() => document.removeEventListener('click', suppress, true), 300)
    }
  }, [])

  const ghostTopPct = (1 - ratio) * 100

  return (
    <div
      className={`rotary-knob ${className}`}
      style={{ '--knob-size': `${size}px`, '--knob-color': color }}
    >
      {label && <span className="rotary-knob__label">{label}</span>}
      <div
        className="rotary-knob__body"
        ref={knobRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* The rotating notch indicator */}
        <div
          className="rotary-knob__notch-ring"
          ref={notchRef}
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div className="rotary-knob__notch" />
        </div>

        {/* Ghost slider overlay — visible during drag */}
        <div className="rotary-knob__ghost" ref={ghostRef}>
          <div className="rotary-knob__ghost-track" />
          <div
            className="rotary-knob__ghost-thumb"
            ref={ghostThumbRef}
            style={{ top: `${ghostTopPct}%` }}
          />
        </div>
      </div>
    </div>
  )
})
