import { useState, useEffect, useRef, useCallback } from 'react'
import './HelpWizard.css'

// Wizard demo steps — each step targets a UI element, shows a tooltip, and optionally runs an action
const STEPS = [
  {
    id: 'welcome',
    target: '.app-header__logo',
    text: 'Welcome to Ribbon! Let me show you around...',
    duration: 2500,
  },
  {
    id: 'ribbon-touch',
    target: '.ribbon',
    text: 'This is your ribbon — touch or drag to play notes!',
    duration: 2000,
    action: 'demo-ribbon',
  },
  {
    id: 'play-mode',
    target: '.rocker:first-child',
    text: 'Play mode for free play, Arp for arpeggiation',
    duration: 2500,
    action: 'demo-arp',
  },
  {
    id: 'hold',
    target: '.activation__hold',
    text: 'Hold sustains your notes — try it with Arp!',
    duration: 2000,
  },
  {
    id: 'oscillators',
    target: '.controls__oscillators',
    text: 'Three oscillators — mix waveforms and detune for thick sounds',
    duration: 2500,
    action: 'demo-osc',
  },
  {
    id: 'effects',
    target: '.controls__section--delay',
    text: 'Delay, reverb, and crunch — shape your sound',
    duration: 2000,
    action: 'demo-effects',
  },
  {
    id: 'party-lo',
    target: '.visualizer__visuals',
    text: 'Party mode for full visuals, Lo for a clean view',
    duration: 2000,
    action: 'demo-visual',
  },
  {
    id: 'zoom',
    target: '.visualizer__zoom',
    text: 'Zoom in and out of the 3D spheres!',
    duration: 2000,
    action: 'demo-zoom',
  },
  {
    id: 'shake',
    target: '.app-header__shake-bolt',
    text: 'Shake it up! Randomizes everything ⚡',
    duration: 2500,
    action: 'demo-shake',
  },
  {
    id: 'qr',
    target: '.preset-qr-trigger, .app-header__qr-mobile',
    text: 'Save & share your sound as a QR code!',
    duration: 2000,
  },
  {
    id: 'help-hint',
    target: '.wizard-trigger',
    text: 'Click ? again during the demo for written instructions!',
    duration: 2500,
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

export function HelpWizard({ active, onClose, getEngine, handleShake, handleQRCreate, setVisualMode }) {
  const [step, setStep] = useState(0)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [bubbleState, setBubbleState] = useState('rising') // rising, visible, popping
  const [showModal, setShowModal] = useState(false)
  const stepTimerRef = useRef(null)
  const cursorAnimRef = useRef(null)

  // Find target element for current step
  const getTargetRect = useCallback((selector) => {
    if (!selector) return null
    // Handle comma-separated selectors (pick first visible)
    const selectors = selector.split(',').map(s => s.trim())
    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el && el.offsetParent !== null) return el.getBoundingClientRect()
    }
    // Fallback: try first selector even if hidden
    const el = document.querySelector(selectors[0])
    return el ? el.getBoundingClientRect() : null
  }, [])

  // Animate cursor to target
  const animateCursorTo = useCallback((rect) => {
    if (!rect) return
    const targetX = rect.left + rect.width / 2
    const targetY = rect.top + rect.height * 0.3
    setCursorPos(prev => {
      // If first position, jump immediately
      if (prev.x === 0 && prev.y === 0) return { x: targetX, y: targetY }
      return prev
    })
    // Smooth animate via RAF
    const startX = cursorPos.x || targetX
    const startY = cursorPos.y || targetY
    const startTime = performance.now()
    const duration = 600

    const animate = (now) => {
      const t = Math.min(1, (now - startTime) / duration)
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      setCursorPos({
        x: startX + (targetX - startX) * ease,
        y: startY + (targetY - startY) * ease,
      })
      if (t < 1) cursorAnimRef.current = requestAnimationFrame(animate)
    }
    cancelAnimationFrame(cursorAnimRef.current)
    cursorAnimRef.current = requestAnimationFrame(animate)
  }, [cursorPos])

  // Run step actions
  const runAction = useCallback((action) => {
    const engine = getEngine()
    switch (action) {
      case 'demo-ribbon': {
        // Play a quick ascending sequence
        const notes = [261.63, 329.63, 392.00, 523.25] // C4 E4 G4 C5
        notes.forEach((hz, i) => {
          setTimeout(() => {
            const id = `wizard_${i}`
            engine.voiceOn(id, hz, 0.4)
            setTimeout(() => engine.voiceOff(id), 300)
          }, i * 350)
        })
        break
      }
      case 'demo-arp': {
        // Quick arp demo — just play a few notes rapidly
        const notes = [261.63, 329.63, 392.00]
        notes.forEach((hz, i) => {
          setTimeout(() => {
            const id = `wizard_arp_${i}`
            engine.voiceOn(id, hz, 0.3)
            setTimeout(() => engine.voiceOff(id), 150)
          }, i * 200)
        })
        break
      }
      case 'demo-osc': {
        // Play a fat chord to show oscillator layering
        const chord = [130.81, 164.81, 196.00] // C3 E3 G3
        chord.forEach((hz, i) => {
          const id = `wizard_osc_${i}`
          engine.voiceOn(id, hz, 0.3)
          setTimeout(() => engine.voiceOff(id), 1500)
        })
        break
      }
      case 'demo-effects': {
        // Play a note with some delay/reverb to show effects
        engine.voiceOn('wizard_fx', 440, 0.4)
        setTimeout(() => engine.voiceOff('wizard_fx'), 400)
        break
      }
      case 'demo-visual': {
        // Flash to Lo mode briefly, then back to Party
        setVisualMode('lo')
        setTimeout(() => setVisualMode('party'), 1200)
        break
      }
      case 'demo-zoom': {
        // Simulate zoom button clicks
        const zoomOut = document.querySelector('.zoom-controls button:last-child')
        const zoomIn = document.querySelector('.zoom-controls button:first-child')
        zoomOut?.click()
        setTimeout(() => zoomOut?.click(), 400)
        setTimeout(() => zoomIn?.click(), 1200)
        setTimeout(() => zoomIn?.click(), 1600)
        break
      }
      case 'demo-shake': {
        handleShake(0.6)
        setTimeout(() => handleShake(0.4), 1500)
        break
      }
    }
  }, [getEngine, handleShake, setVisualMode])

  // Advance through steps
  useEffect(() => {
    if (!active || showModal) return
    if (step >= STEPS.length) {
      onClose()
      return
    }

    const currentStep = STEPS[step]
    const rect = getTargetRect(currentStep.target)

    // Animate cursor
    if (rect) {
      animateCursorTo(rect)
      setTooltipPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 20,
      })
    }

    // Bubble animation
    setBubbleState('rising')
    const visibleTimer = setTimeout(() => setBubbleState('visible'), 300)
    const popTimer = setTimeout(() => setBubbleState('popping'), currentStep.duration - 400)

    // Run action
    if (currentStep.action) {
      setTimeout(() => runAction(currentStep.action), 500)
    }

    // Advance to next step
    stepTimerRef.current = setTimeout(() => {
      setStep(s => s + 1)
    }, currentStep.duration)

    return () => {
      clearTimeout(stepTimerRef.current)
      clearTimeout(visibleTimer)
      clearTimeout(popTimer)
    }
  }, [active, step, showModal, getTargetRect, animateCursorTo, runAction, onClose])

  // Reset when activated
  useEffect(() => {
    if (active) {
      setStep(0)
      setShowModal(false)
      setCursorPos({ x: 0, y: 0 })
    }
  }, [active])

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
      {/* Wizard cursor — möbius strip pointer */}
      <div
        className="wizard-cursor"
        style={{ left: cursorPos.x, top: cursorPos.y }}
      >
        <span className="wizard-cursor__icon">&lt;-∞</span>
      </div>

      {/* Tooltip bubble */}
      <div
        className={`wizard-bubble wizard-bubble--${bubbleState}`}
        style={{ left: tooltipPos.x, top: tooltipPos.y }}
      >
        <span className="wizard-bubble__text">{currentStep.text}</span>
      </div>

      {/* Step indicator */}
      <div className="wizard-progress">
        {STEPS.map((_, i) => (
          <div key={i} className={`wizard-progress__dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
        ))}
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
