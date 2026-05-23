import { useRef, useCallback, memo } from 'react'
import './DualKnob.css'

const MIN_ANGLE = -135
const MAX_ANGLE = 135
const ANGLE_RANGE = 270

export const DualKnob = memo(function DualKnob({
  mixValue,
  detuneValue,
  onMixChange,
  onDetuneChange,
  color = 'var(--cyan)',
  size = 52,
  minDetune = -1200,
  maxDetune = 1200,
  mixLabel,
  detuneLabel,
}) {
  const knobRef = useRef(null)
  const innerNotchRef = useRef(null)
  const arcFillRef = useRef(null)
  const ghostRef = useRef(null)
  const ghostThumbRef = useRef(null)

  const draggingZone = useRef(null)
  const startY = useRef(0)
  const startMix = useRef(0)
  const startDetune = useRef(0)

  const INNER_RATIO = 0.55 // inner circle = 55% of total radius

  // Track hover zone for visual feedback (no state — direct DOM)
  const applyHoverZone = useCallback((zone) => {
    const body = knobRef.current
    if (!body) return
    body.dataset.zone = zone ?? ''
  }, [])

  // Map detune to rotation angle
  const detuneRange = maxDetune - minDetune
  const detuneRatio = Math.max(0, Math.min(1, (detuneValue - minDetune) / detuneRange))
  const detuneAngle = MIN_ANGLE + detuneRatio * ANGLE_RANGE

  // Mix arc: start at 225° in conic terms, fill mix * 270°
  const mixAngle = mixValue * ANGLE_RANGE // 0–270

  // SVG arc parameters for the outer ring fill
  const strokeWidth = size * 0.115
  const ringRadius = (size / 2) - strokeWidth / 2 - 1
  const circumference = 2 * Math.PI * ringRadius
  const trackArcLength = (ANGLE_RANGE / 360) * circumference
  const fillArcLength = (mixAngle / 360) * circumference
  // Offset to start at 7 o'clock (225° from top = 225-90 = 135° from SVG 0°/3-o'clock)
  const startOffset = (135 / 360) * circumference

  // Direct DOM update — zero-lag response
  const applyMixVisuals = useCallback((newMix) => {
    const newAngle = newMix * ANGLE_RANGE
    const newFillLen = (newAngle / 360) * circumference
    if (arcFillRef.current) {
      arcFillRef.current.style.strokeDasharray = `${newFillLen} ${circumference}`
    }
    if (ghostThumbRef.current && draggingZone.current === 'outer') {
      ghostThumbRef.current.style.top = `${(1 - newMix) * 100}%`
    }
  }, [circumference])

  const applyDetuneVisuals = useCallback((newDetune) => {
    const ratio = (newDetune - minDetune) / detuneRange
    const deg = MIN_ANGLE + ratio * ANGLE_RANGE
    if (innerNotchRef.current) {
      innerNotchRef.current.style.transform = `rotate(${deg}deg)`
    }
    if (ghostThumbRef.current && draggingZone.current === 'inner') {
      ghostThumbRef.current.style.top = `${(1 - ratio) * 100}%`
    }
  }, [minDetune, detuneRange])

  const getZone = useCallback((e) => {
    const knob = knobRef.current
    if (!knob) return 'outer'
    const rect = knob.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    return dist < (rect.width / 2) * INNER_RATIO ? 'inner' : 'outer'
  }, [])

  const onPointerEnter = useCallback((e) => {
    if (!draggingZone.current) applyHoverZone(getZone(e))
  }, [applyHoverZone, getZone])

  const onPointerLeave = useCallback(() => {
    if (!draggingZone.current) applyHoverZone(null)
  }, [applyHoverZone])

  const onPointerDown = useCallback((e) => {
    const zone = getZone(e)
    draggingZone.current = zone
    applyHoverZone(zone)
    startY.current = e.clientY
    startMix.current = mixValue
    startDetune.current = detuneValue
    e.currentTarget.setPointerCapture(e.pointerId)
    if (ghostRef.current) ghostRef.current.classList.add('dual-knob__ghost--visible')
  }, [mixValue, detuneValue, getZone, applyHoverZone])

  const onPointerMove = useCallback((e) => {
    if (!draggingZone.current) {
      applyHoverZone(getZone(e))
      return
    }
    const dy = startY.current - e.clientY
    const deltaRatio = dy / 200

    if (draggingZone.current === 'inner') {
      const newDetune = Math.max(minDetune, Math.min(maxDetune,
        startDetune.current + deltaRatio * detuneRange
      ))
      const stepped = Math.round(newDetune)
      applyDetuneVisuals(stepped)
      onDetuneChange(stepped)
    } else {
      const newMix = Math.max(0, Math.min(1, startMix.current + deltaRatio))
      const stepped = Math.round(newMix * 100) / 100
      applyMixVisuals(stepped)
      onMixChange(stepped)
    }
  }, [minDetune, maxDetune, detuneRange, onMixChange, onDetuneChange, applyMixVisuals, applyDetuneVisuals])

  const onPointerUp = useCallback(() => {
    draggingZone.current = null
    if (ghostRef.current) ghostRef.current.classList.remove('dual-knob__ghost--visible')
    applyHoverZone(null)
  }, [applyHoverZone])

  const innerSize = size * INNER_RATIO * 2

  return (
    <div
      className="dual-knob"
      style={{ '--knob-size': `${size}px`, '--knob-color': color, '--inner-size': `${innerSize}px` }}
    >
      {/* Labels */}
      <div className="dual-knob__labels">
        <span className="dual-knob__label dual-knob__label--mix">{mixLabel ?? `${Math.round(mixValue * 100)}%`}</span>
        <span className="dual-knob__label dual-knob__label--det">{detuneLabel ?? `${detuneValue}¢`}</span>
      </div>

      {/* Main hit area — outer ring + inner circle both handled here */}
      <div
        ref={knobRef}
        className="dual-knob__body"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        style={{ touchAction: 'none' }}
      >
        {/* Outer ring — SVG arc showing mix level */}
        <svg
          className="dual-knob__ring-svg"
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
        >
          {/* Track (full 270° background) */}
          <circle
            className="dual-knob__ring-track"
            cx={size / 2}
            cy={size / 2}
            r={ringRadius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={`${trackArcLength} ${circumference}`}
            strokeDashoffset={-startOffset}
          />
          {/* Fill (mix value arc) */}
          <circle
            ref={arcFillRef}
            className="dual-knob__ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={ringRadius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={`${fillArcLength} ${circumference}`}
            strokeDashoffset={-startOffset}
          />
          {/* Outer boundary ring — frames the full knob */}
          <circle
            className="dual-knob__outer-ring"
            cx={size / 2}
            cy={size / 2}
            r={(size / 2) - 1.5}
            fill="none"
          />
          {/* Zone separator ring — visible boundary between outer (mix) and inner (detune) zones */}
          <circle
            className="dual-knob__zone-sep"
            cx={size / 2}
            cy={size / 2}
            r={(size / 2) * INNER_RATIO}
            fill="none"
          />
        </svg>

        {/* Inner circle — detune notch */}
        <div className="dual-knob__inner">
          <div
            className="dual-knob__notch-ring"
            ref={innerNotchRef}
            style={{ transform: `rotate(${detuneAngle}deg)` }}
          >
            <div className="dual-knob__notch" />
          </div>
          {/* Zone label inside inner circle */}
          <span className="dual-knob__zone-label dual-knob__zone-label--det">DET</span>
        </div>

        {/* Mix zone label — top of outer ring */}
        <span className="dual-knob__zone-label dual-knob__zone-label--mix">MIX</span>

        {/* Ghost slider overlay — shows during drag */}
        <div className="dual-knob__ghost" ref={ghostRef}>
          <div className="dual-knob__ghost-track" />
          <div
            className="dual-knob__ghost-thumb"
            ref={ghostThumbRef}
            style={{ top: `${(1 - (draggingZone.current === 'inner' ? detuneRatio : mixValue)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
})
