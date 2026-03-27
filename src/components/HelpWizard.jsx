import { useState, useEffect, useRef, useCallback } from 'react'
import './HelpWizard.css'

// Wizard demo steps — each step targets a UI element, shows a tooltip, and optionally runs an action
const STEPS = [
  {
    id: 'welcome',
    target: '.app-header__logo',
    text: 'Welcome to Ribbon! Let me show you around...',
    label: 'Welcome',
    duration: 3500,
  },
  {
    id: 'ribbon-touch',
    target: '.ribbon',
    text: 'This is your ribbon — touch or drag to play notes!',
    label: 'Ribbon',
    duration: 4000,
    action: 'click-ribbon',
  },
  {
    id: 'play-mode',
    target: '.rocker:first-child',
    text: 'Play mode for free play, Arp for arpeggiation',
    label: 'Modes',
    duration: 4000,
    action: 'click-ribbon',
  },
  {
    id: 'hold',
    target: '.activation__hold',
    text: 'Hold sustains your notes — try it with Arp!',
    label: 'Hold',
    duration: 3500,
  },
  {
    id: 'oscillators',
    target: '.controls__oscillators',
    text: 'Three oscillators — mix waveforms and detune for thick sounds',
    label: 'Oscillators',
    duration: 4000,
    action: 'click-ribbon',
  },
  {
    id: 'effects',
    target: '.controls__section--delay',
    text: 'Delay, reverb, and crunch — shape your sound',
    label: 'Effects',
    duration: 3500,
    action: 'click-ribbon',
  },
  {
    id: 'zoom',
    target: '.visualizer__zoom',
    text: 'Zoom in and out of the 3D spheres!',
    label: 'Zoom',
    duration: 3500,
    action: 'click-zoom',
  },
  {
    id: 'shake',
    target: '.app-header__shake-bolt',
    text: 'Shake it up! Randomizes everything',
    label: 'Shake',
    duration: 4000,
    action: 'click-shake',
  },
  {
    id: 'qr',
    target: '.preset-qr-trigger, .app-header__qr-mobile',
    text: 'Save & share your sound as a QR code!',
    label: 'QR',
    duration: 3500,
  },
  {
    id: 'help-hint',
    target: '.wizard-trigger',
    text: 'Click ? again during the demo for written instructions!',
    label: 'Help',
    duration: 3500,
  },
]

// Written help content for the modal
const HELP_SECTIONS = [
  { title: 'Ribbon', body: 'Touch or drag the ribbon to play notes. The position controls pitch — left is low, right is high.' },
  { title: 'Play / Arp', body: 'Play mode: free play. Arp mode: plays notes in a pattern. Use with Poly + Hold to build chord arps.' },
  { title: 'Mono / Poly', body: 'Mono: one note at a time with glide. Poly: multiple notes simultaneously.' },
  { title: 'Hold', body: 'Sustains notes after you release. In Arp+Poly mode, tap the ribbon to add notes to the pattern.' },
  { title: 'Oscillators', body: 'Three oscillators with waveform (sin/squ/saw/tri), mix level, and detune. Layer them for rich sounds.' },
  { title: 'Effects', body: 'Delay (time/feedback/mix), Reverb, and Crunch (bitcrusher + slapback) for shaping your sound.' },
  { title: 'Filter', body: 'Cutoff controls brightness, Resonance adds emphasis at the cutoff point.' },
  { title: 'Scales', body: 'Quantize notes to scales. Select multiple scales to combine. Chromatic = all notes.' },
  { title: 'Shake ⚡', body: 'Randomizes controls and plays a note. Click the bolt, tap the logo, or physically shake your phone!' },
  { title: 'QR Presets', body: 'Save all your current settings as a scannable QR code. Share sounds with friends!' },
  { title: 'Party / Lo', body: 'Party: full 3D sphere visuals. Lo: minimal mode for performance or focus.' },
  { title: 'Zoom +/−', body: 'Zoom in/out of the 3D spheres. See inside them or pull back for the full view.' },
  { title: 'Keys', body: 'Toggle keyboard input — use A through L keys as a keyboard instrument.' },
  { title: 'MIDI', body: 'Connect a USB or Bluetooth MIDI controller. Click the MIDI button to enable.' },
]

// SVG cursor — pointer arrow with möbius strip loop at the tail
function WizardCursorSVG() {
  return (
    <svg className="wizard-cursor__svg" width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wizard-grad" x1="0" y1="0" x2="36" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="33%" stopColor="#ff00aa" />
          <stop offset="66%" stopColor="#39ff14" />
          <stop offset="100%" stopColor="#fff01f" />
        </linearGradient>
        <filter id="wizard-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#wizard-glow)">
        {/* Pointer arrow */}
        <path
          d="M4 2 L4 28 L10 22 L16 32 L20 30 L14 20 L22 20 Z"
          fill="url(#wizard-grad)"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="0.8"
        />
        {/* Möbius strip loop at tail — figure-8 flowing from arrow base */}
        <path
          d="M6 28 C6 34, 14 34, 14 32 C14 30, 6 30, 6 36 C6 42, 14 42, 14 38 C14 34, 6 36, 6 28"
          fill="none"
          stroke="url(#wizard-grad)"
          strokeWidth="2"
          strokeLinecap="round"
          className="wizard-cursor__ribbon-path"
        />
      </g>
    </svg>
  )
}

export function HelpWizard({ active, onClose }) {
  const [step, setStep] = useState(0)
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 })
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [bubbleState, setBubbleState] = useState('rising')
  const [showModal, setShowModal] = useState(false)
  const stepTimerRef = useRef(null)
  const cursorAnimRef = useRef(null)
  const cursorPosRef = useRef({ x: -100, y: -100 })
  const actionTimersRef = useRef([])
  // Stabilize onClose so parent re-renders (e.g. from shake randomizing controls)
  // don't cause the step effect to re-run and re-trigger actions
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const stableOnClose = useCallback(() => onCloseRef.current(), [])

  // Find target element for current step
  const getTargetRect = useCallback((selector) => {
    if (!selector) return null
    const selectors = selector.split(',').map(s => s.trim())
    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el && el.offsetParent !== null) return el.getBoundingClientRect()
    }
    const el = document.querySelector(selectors[0])
    return el ? el.getBoundingClientRect() : null
  }, [])

  // Animate cursor to target — uses ref to avoid stale closures
  const animateCursorTo = useCallback((rect) => {
    if (!rect) return
    const targetX = rect.left + rect.width / 2
    const targetY = rect.top + rect.height * 0.3

    // If cursor hasn't been placed yet, jump immediately
    if (cursorPosRef.current.x < 0) {
      cursorPosRef.current = { x: targetX, y: targetY }
      setCursorPos({ x: targetX, y: targetY })
      return
    }

    const startX = cursorPosRef.current.x
    const startY = cursorPosRef.current.y
    const startTime = performance.now()
    const duration = 600

    cancelAnimationFrame(cursorAnimRef.current)

    const animate = (now) => {
      const t = Math.min(1, (now - startTime) / duration)
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const x = startX + (targetX - startX) * ease
      const y = startY + (targetY - startY) * ease
      cursorPosRef.current = { x, y }
      setCursorPos({ x, y })
      if (t < 1) cursorAnimRef.current = requestAnimationFrame(animate)
    }
    cursorAnimRef.current = requestAnimationFrame(animate)
  }, [])

  // Helper to schedule a timeout and track it for cleanup
  const scheduleAction = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay)
    actionTimersRef.current.push(id)
    return id
  }, [])

  // Clear all pending action timers
  const clearActionTimers = useCallback(() => {
    actionTimersRef.current.forEach(id => clearTimeout(id))
    actionTimersRef.current = []
  }, [])

  // Simulate a pointer click on a DOM element (dispatches real events)
  const simulateClick = useCallback((el) => {
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y }
    el.dispatchEvent(new PointerEvent('pointerdown', opts))
    el.dispatchEvent(new PointerEvent('pointerup', opts))
    el.dispatchEvent(new MouseEvent('click', opts))
  }, [])

  // Simulate a pointer down + move + up on the ribbon at a given fraction (0-1) of its width
  const simulateRibbonTap = useCallback((fraction) => {
    const ribbon = document.querySelector('.ribbon__track') || document.querySelector('.ribbon')
    if (!ribbon) return
    const rect = ribbon.getBoundingClientRect()
    const x = rect.left + rect.width * fraction
    const y = rect.top + rect.height / 2
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 9999 }
    try { ribbon.setPointerCapture?.(9999) } catch {}
    ribbon.dispatchEvent(new PointerEvent('pointerdown', opts))
    setTimeout(() => {
      ribbon.dispatchEvent(new PointerEvent('pointerup', { ...opts }))
      try { ribbon.releasePointerCapture?.(9999) } catch {}
    }, 200)
  }, [])

  // Run step actions — clicks real DOM elements so the cursor feels like a real pointer
  const runAction = useCallback((action) => {
    switch (action) {
      case 'click-ribbon': {
        // Tap the ribbon at a few different positions to trigger real notes
        const positions = [0.3, 0.5, 0.7, 0.85]
        positions.forEach((frac, i) => {
          scheduleAction(() => simulateRibbonTap(frac), i * 400)
        })
        break
      }
      case 'click-zoom': {
        const zoomIn = document.querySelector('.visualizer__zoom button:first-child')
        const zoomOut = document.querySelector('.visualizer__zoom button:last-child')
        // Zoom out first to show the spheres (the cool part), then zoom back in
        if (zoomOut) simulateClick(zoomOut)
        scheduleAction(() => { if (zoomOut) simulateClick(zoomOut) }, 400)
        scheduleAction(() => { if (zoomOut) simulateClick(zoomOut) }, 800)
        scheduleAction(() => { if (zoomIn) simulateClick(zoomIn) }, 2200)
        scheduleAction(() => { if (zoomIn) simulateClick(zoomIn) }, 2600)
        break
      }
      case 'click-shake': {
        const bolt = document.querySelector('.app-header__shake-bolt')
        if (bolt) simulateClick(bolt)
        scheduleAction(() => { if (bolt) simulateClick(bolt) }, 2000)
        break
      }
    }
  }, [scheduleAction, simulateClick, simulateRibbonTap])

  // Advance through steps
  useEffect(() => {
    if (!active || showModal) return
    if (step >= STEPS.length) {
      stableOnClose()
      return
    }

    const currentStep = STEPS[step]
    const rect = getTargetRect(currentStep.target)

    if (rect) {
      animateCursorTo(rect)
      setTooltipPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 20,
      })
    }

    setBubbleState('rising')
    const visibleTimer = setTimeout(() => setBubbleState('visible'), 300)
    const popTimer = setTimeout(() => setBubbleState('popping'), currentStep.duration - 400)

    if (currentStep.action) {
      const actionTimer = setTimeout(() => runAction(currentStep.action), 500)
      actionTimersRef.current.push(actionTimer)
    }

    stepTimerRef.current = setTimeout(() => {
      setStep(s => s + 1)
    }, currentStep.duration)

    return () => {
      clearTimeout(stepTimerRef.current)
      clearTimeout(visibleTimer)
      clearTimeout(popTimer)
      clearActionTimers()
    }
  }, [active, step, showModal, getTargetRect, animateCursorTo, runAction, stableOnClose, clearActionTimers])

  // Reset when activated
  useEffect(() => {
    if (active) {
      setStep(0)
      setShowModal(false)
      cursorPosRef.current = { x: -100, y: -100 }
      setCursorPos({ x: -100, y: -100 })
    }
  }, [active])

  // Spacebar cancels the wizard
  useEffect(() => {
    if (!active) return
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        stableOnClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active, stableOnClose])

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(cursorAnimRef.current)
      clearTimeout(stepTimerRef.current)
    }
  }, [])

  if (!active) return null

  if (showModal) {
    return (
      <div className="wizard-modal-overlay" onClick={() => { setShowModal(false); onClose() }}>
        <div className="wizard-modal" onClick={e => e.stopPropagation()}>
          <h2 className="wizard-modal__title">How to Play Ribbon</h2>
          <div className="wizard-modal__content">
            {HELP_SECTIONS.map((s, i) => (
              <div key={i} className="wizard-modal__section">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
          <button className="wizard-modal__close" onClick={() => { setShowModal(false); onClose() }}>
            Got it!
          </button>
        </div>
      </div>
    )
  }

  const currentStep = STEPS[step]
  if (!currentStep) return null

  return (
    <div className="wizard-overlay" onClick={() => setShowModal(true)}>
      {/* Wizard cursor — pointer arrow with möbius strip tail */}
      <div
        className="wizard-cursor"
        style={{ left: cursorPos.x, top: cursorPos.y }}
      >
        <WizardCursorSVG />
      </div>

      {/* Tooltip bubble */}
      <div
        className={`wizard-bubble wizard-bubble--${bubbleState}`}
        style={{ left: tooltipPos.x, top: tooltipPos.y }}
      >
        <span className="wizard-bubble__text">{currentStep.text}</span>
        {/* Pop fragments + confetti — only visible during popping state */}
        {bubbleState === 'popping' && (
          <div className="wizard-bubble__pop-fragments">
            {/* Soap drop fragments */}
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={`frag-${i}`} className="wizard-bubble__fragment" />
            ))}
            {/* Confetti pieces */}
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={`conf-${i}`} className="wizard-bubble__confetti" />
            ))}
          </div>
        )}
      </div>

      {/* Progress bar with label */}
      <div className="wizard-progressbar">
        <div className="wizard-progressbar__track">
          <div
            className="wizard-progressbar__fill"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <span className="wizard-progressbar__label">{currentStep.label}</span>
      </div>
    </div>
  )
}

export function WizardTrigger({ onClick }) {
  return (
    <button className="wizard-trigger" onClick={onClick} title="Help / Demo" aria-label="Help / Demo">
      ?
    </button>
  )
}
