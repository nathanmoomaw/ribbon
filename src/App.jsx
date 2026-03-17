import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useKeyboard } from './hooks/useKeyboard'
import { useKeyboardPlay } from './hooks/useKeyboardPlay'
import { useArpeggiator } from './hooks/useArpeggiator'
import { useShake, requestMotionPermission } from './hooks/useShake'
import { SCALES } from './utils/scales'
import { Visualizer } from './components/Visualizer'
import { Ribbon } from './components/Ribbon'
import { Controls } from './components/Controls'
import { RibbonLogo } from './components/RibbonLogo'
import { positionToFrequency } from './utils/pitchMap'
import { useAmbientPlay } from './hooks/useAmbientPlay'
import './App.css'

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle']

// Nudge a numeric value randomly within its range, scaled by intensity
function nudge(current, min, max, intensity) {
  const range = max - min
  const delta = (Math.random() - 0.5) * range * 0.3 * intensity
  return Math.max(min, Math.min(max, current + delta))
}

function App() {
  const getEngine = useAudioEngine()

  const [mode, setMode] = useState('play')
  const [inputMode, setInputMode] = useState('touch')
  const [oscParams, setOscParams] = useState([
    { waveform: 'sawtooth', detune: 0, mix: 1.0 },
    { waveform: 'sawtooth', detune: 0, mix: 0.0 },
    { waveform: 'sawtooth', detune: 0, mix: 0.0 },
  ])
  const [volume, setVolume] = useState(0.5)
  const [octaves, setOctaves] = useState(2)
  const [delayParams, setDelayParams] = useState({ time: 0.3, feedback: 0.4, mix: 0 })
  const [reverbMix, setReverbMix] = useState(0)
  const [crunch, setCrunch] = useState(0)
  const [filterParams, setFilterParams] = useState({ cutoff: 20000, resonance: 0 })
  const [glideSpeed, setGlideSpeed] = useState(0.005)
  const [stepped, setStepped] = useState(false)
  const [scale, setScale] = useState(['chromatic'])
  const [keyboardPositions, setKeyboardPositions] = useState(new Map())
  const [visualMode, setVisualMode] = useState('party')
  const [arpBpm, setArpBpm] = useState(120)
  const [hold, setHold] = useState(false)
  const [poly, setPoly] = useState(false)
  const [arpNotes, setArpNotes] = useState([])
  const [shaking, setShaking] = useState(false)
  const [undulating, setUndulating] = useState(false)
  const [ambientPlay, setAmbientPlay] = useState(false)
  const ribbonInteraction = useRef({ position: null, velocity: 0, active: false })
  const controlsRef = useRef(null)
  const ribbonRef = useRef(null)
  const shakeTimerRef = useRef(null)
  const undulateTimerRef = useRef(null)
  const ambientStopRef = useRef(null)
  const arpStopRef = useRef(null)
  const lastSpaceRef = useRef(0)

  const keyHandlers = useMemo(() => ({
    Space: () => {
      const now = Date.now()
      const elapsed = now - lastSpaceRef.current
      lastSpaceRef.current = now

      if (elapsed < 400) {
        // Double-tap: kill ALL sound including delay/reverb tails
        getEngine().killAllSound()
      } else {
        // Single tap: normal stop
        getEngine().allNotesOff()
      }
      setHold(false)
      setKeyboardPositions(new Map())
      setArpNotes([])
      arpStopRef.current?.()
    },
    Digit1: () => setMode('play'),
    Digit2: () => setMode('arp'),
    Digit3: () => setPoly(p => !p),
    Digit4: () => setHold((h) => !h),
    KeyV: () => setVisualMode((m) => m === 'party' ? 'lo' : 'party'),
  }), [mode, hold, getEngine])

  useKeyboard(keyHandlers)

  const handleKeyboardPositions = useCallback((posMap) => {
    setKeyboardPositions(posMap)
  }, [])

  const { arpStart, arpStop } = useArpeggiator(getEngine, mode, arpBpm, arpNotes)
  arpStopRef.current = arpStop

  // Toggle a note in/out of the arp sequence (arp+hold+poly mode)
  const handleArpNoteToggle = useCallback((hz) => {
    setArpNotes(prev => {
      const existing = prev.findIndex(n => Math.abs(n - hz) < 1)
      if (existing !== -1) {
        const next = [...prev]
        next.splice(existing, 1)
        return next
      }
      return [...prev, hz]
    })
  }, [])

  // Add/remove notes for live arp+poly (keys held down)
  const handleArpNoteAdd = useCallback((hz) => {
    setArpNotes(prev => {
      if (prev.some(n => Math.abs(n - hz) < 1)) return prev
      return [...prev, hz]
    })
  }, [])

  const handleArpNoteRemove = useCallback((hz) => {
    setArpNotes(prev => prev.filter(n => Math.abs(n - hz) >= 1))
  }, [])

  // Auto-start/stop arp when notes are added/removed in arp+poly mode
  const prevArpNotesLenRef = useRef(0)
  useEffect(() => {
    if (mode === 'arp' && poly) {
      const prevLen = prevArpNotesLenRef.current
      if (prevLen === 0 && arpNotes.length > 0) {
        arpStart()
      } else if (prevLen > 0 && arpNotes.length === 0) {
        arpStop()
      }
    }
    prevArpNotesLenRef.current = arpNotes.length
  }, [arpNotes, mode, poly, arpStart, arpStop])

  // Clear arp notes when leaving arp+poly mode
  useEffect(() => {
    if (!(mode === 'arp' && poly)) {
      setArpNotes([])
    }
  }, [mode, poly])

  useKeyboardPlay(getEngine, inputMode, mode, octaves, stepped, scale, handleKeyboardPositions, arpStart, arpStop, hold, poly, handleArpNoteToggle, handleArpNoteAdd, handleArpNoteRemove)

  // --- Shake/Quake handler ---
  const handleShake = useCallback((intensity) => {
    const engine = getEngine()

    // Stop ambient play if active
    ambientStopRef.current?.()

    // 1. Visual shake on controls + ribbon — restart timers on rapid triggers
    setShaking(true)
    setUndulating(true)
    clearTimeout(shakeTimerRef.current)
    clearTimeout(undulateTimerRef.current)
    shakeTimerRef.current = setTimeout(() => setShaking(false), 400)
    undulateTimerRef.current = setTimeout(() => setUndulating(false), 500)

    // 2. Randomize parameters — chance scales with intensity (20%-50%)
    const nudgeChance = 0.15 + intensity * 0.35
    const shouldNudge = () => Math.random() < nudgeChance

    // Oscillator params
    setOscParams(prev => prev.map((osc, i) => {
      const next = { ...osc }
      if (shouldNudge()) next.waveform = WAVEFORMS[Math.floor(Math.random() * WAVEFORMS.length)]
      if (shouldNudge()) next.mix = nudge(osc.mix, 0, 1, intensity)
      if (shouldNudge()) next.detune = Math.round(nudge(osc.detune, -1200, 1200, intensity))
      // Apply to engine
      if (next.waveform !== osc.waveform) engine.setWaveform(next.waveform, i)
      if (next.mix !== osc.mix) engine.setOscMix(i, next.mix)
      if (next.detune !== osc.detune) engine.setOscDetune(i, next.detune)
      return next
    }))

    if (shouldNudge()) {
      const newCutoff = nudge(filterParams.cutoff, 20, 20000, intensity)
      setFilterParams(prev => ({ ...prev, cutoff: newCutoff }))
      engine.setFilter({ cutoff: newCutoff })
    }

    if (shouldNudge()) {
      const newRes = nudge(filterParams.resonance, 0, 25, intensity)
      setFilterParams(prev => ({ ...prev, resonance: newRes }))
      engine.setFilter({ resonance: newRes })
    }

    if (shouldNudge()) {
      const newSpeed = nudge(glideSpeed, 0.001, 0.3, intensity)
      setGlideSpeed(newSpeed)
      engine.setGlideSpeed(newSpeed)
    }

    if (shouldNudge()) {
      const newTime = nudge(delayParams.time, 0.05, 1, intensity)
      setDelayParams(prev => ({ ...prev, time: newTime }))
      engine.setDelay({ time: newTime })
    }

    if (shouldNudge()) {
      const newFeedback = nudge(delayParams.feedback, 0, 0.9, intensity)
      setDelayParams(prev => ({ ...prev, feedback: newFeedback }))
      engine.setDelay({ feedback: newFeedback })
    }

    if (shouldNudge()) {
      const newDelayMix = nudge(delayParams.mix, 0, 1, intensity)
      setDelayParams(prev => ({ ...prev, mix: newDelayMix }))
      engine.setDelay({ mix: newDelayMix })
    }

    if (shouldNudge()) {
      const newReverb = nudge(reverbMix, 0, 1, intensity)
      setReverbMix(newReverb)
      engine.setReverb({ mix: newReverb })
    }

    if (shouldNudge()) {
      const newCrunch = nudge(crunch, 0, 1, intensity)
      setCrunch(newCrunch)
      engine.setCrunch(newCrunch)
    }

    if (shouldNudge()) {
      const newBpm = Math.round(nudge(arpBpm, 40, 300, intensity))
      setArpBpm(newBpm)
    }

    if (shouldNudge()) {
      const newOctaves = Math.floor(Math.random() * 5) + 1
      setOctaves(newOctaves)
    }

    if (shouldNudge()) {
      const scaleNames = Object.keys(SCALES)
      const randomScale = scaleNames[Math.floor(Math.random() * scaleNames.length)]
      setScale([randomScale])
    }

    // Switches — lower chance, bigger impact
    const switchChance = 0.08 + intensity * 0.15
    if (Math.random() < switchChance) {
      setMode(m => m === 'play' ? 'arp' : 'play')
    }
    if (Math.random() < switchChance) {
      setPoly(p => !p)
    }
    if (Math.random() < switchChance * 0.6) {
      setHold(h => !h)
    }

    // 3. Trigger a random ribbon press — velocity scales with intensity
    const shakeVoiceId = `shake_${Date.now()}`
    const shakePosition = Math.random()
    const shakeVelocity = Math.random() * 0.3 + intensity * 0.5
    const shakeHz = positionToFrequency(shakePosition, { octaves, stepped, scale })

    // Update ribbon interaction ref for visualizer
    if (ribbonInteraction.current) {
      ribbonInteraction.current.position = shakePosition
      ribbonInteraction.current.velocity = shakeVelocity
      ribbonInteraction.current.active = true
    }

    engine.voiceOn(shakeVoiceId, shakeHz, shakeVelocity)

    // Short note — release after 150-400ms depending on intensity
    const noteDuration = 150 + (1 - intensity) * 250
    setTimeout(() => {
      engine.voiceOff(shakeVoiceId)
      if (ribbonInteraction.current) {
        ribbonInteraction.current.active = false
      }
    }, noteDuration)
  }, [getEngine, filterParams, glideSpeed, delayParams, reverbMix, crunch, arpBpm, octaves, stepped, scale, ribbonInteraction])

  useShake(handleShake, controlsRef, ribbonRef)

  // Subtle control tweaks during ambient play — gently evolve the sound
  const handleAmbientTweak = useCallback(() => {
    const engine = getEngine()
    if (!engine) return
    // Pick a random tweak: reverb, delay mix, filter, or crunch
    const choice = Math.random()
    if (choice < 0.3) {
      // Nudge reverb
      setReverbMix(prev => {
        const next = Math.max(0, Math.min(1, prev + (Math.random() - 0.4) * 0.15))
        engine.setReverb({ mix: next })
        return next
      })
    } else if (choice < 0.55) {
      // Nudge delay mix
      setDelayParams(prev => {
        const next = { ...prev, mix: Math.max(0, Math.min(1, prev.mix + (Math.random() - 0.4) * 0.1)) }
        engine.setDelay(next)
        return next
      })
    } else if (choice < 0.8) {
      // Nudge filter cutoff gently
      setFilterParams(prev => {
        const next = { ...prev, cutoff: Math.max(200, Math.min(18000, prev.cutoff + (Math.random() - 0.5) * 3000)) }
        engine.setFilter(next)
        return next
      })
    } else {
      // Nudge crunch slightly
      setCrunch(prev => {
        const next = Math.max(0, Math.min(0.4, prev + (Math.random() - 0.5) * 0.08))
        engine.setCrunch(next)
        return next
      })
    }
  }, [getEngine, setReverbMix, setDelayParams, setFilterParams, setCrunch])

  // When ambient starts, add random reverb + delay so short taps ring out
  const handleAmbientStart = useCallback(() => {
    const engine = getEngine()
    if (!engine) return
    const newReverb = 0.2 + Math.random() * 0.4 // 0.2–0.6
    const newDelay = { time: 0.2 + Math.random() * 0.3, feedback: 0.2 + Math.random() * 0.3, mix: 0.15 + Math.random() * 0.25 }
    setReverbMix(newReverb)
    engine.setReverb({ mix: newReverb })
    setDelayParams(newDelay)
    engine.setDelay(newDelay)
  }, [getEngine])

  const { isPlaying: ambientIsPlaying, isSleeping: ambientIsSleeping, startNow: ambientStartNow, stopNow: ambientStopNow } = useAmbientPlay(getEngine, ambientPlay, scale, octaves, ribbonInteraction, handleAmbientTweak, handleAmbientStart)
  ambientStopRef.current = ambientStopNow

  // Stop ambient play when user interacts with controls or ribbon
  useEffect(() => {
    if (!ambientIsPlaying) return
    const handler = (e) => {
      // Don't stop if clicking the ambient icon itself
      if (e.target.closest?.('.app-header__ambient')) return
      ambientStopNow()
    }
    const events = ['pointerdown', 'keydown', 'touchstart']
    events.forEach(ev => window.addEventListener(ev, handler, true))
    return () => events.forEach(ev => window.removeEventListener(ev, handler, true))
  }, [ambientIsPlaying, ambientStopNow])

  // When hold is active in play mode, global mouse movement controls pitch
  // Does NOT apply in arp mode — arp+hold builds note sequences instead
  useEffect(() => {
    if (!hold || mode === 'arp') return
    const handleGlobalMove = (e) => {
      const engine = getEngine()
      if (!engine.getIsPlaying()) return
      // Only do global pitch control when a single voice is active
      if (engine.getActiveVoiceCount() !== 1) return
      const pos = Math.max(0, Math.min(1, e.clientX / window.innerWidth))
      const hz = positionToFrequency(pos, { octaves, stepped, scale })
      engine.setAllActiveFrequencies(hz)
      if (ribbonInteraction.current) ribbonInteraction.current.position = pos
    }
    window.addEventListener('pointermove', handleGlobalMove)
    return () => window.removeEventListener('pointermove', handleGlobalMove)
  }, [hold, mode, getEngine, octaves, stepped, scale, ribbonInteraction])

  // When hold is toggled off, stop all notes and arp
  const holdRef = useRef(hold)
  useEffect(() => {
    const wasHold = holdRef.current
    holdRef.current = hold
    if (wasHold && !hold) {
      const engine = getEngine()
      if (mode === 'play') {
        if (engine.getIsPlaying()) engine.allNotesOff()
      } else if (mode === 'arp') {
        setArpNotes([])
        arpStopRef.current?.()
        engine.allNotesOff()
      }
    }
  }, [hold, getEngine, mode])

  const handleStop = useCallback(() => {
    getEngine().allNotesOff()
    setHold(false)
    setKeyboardPositions(new Map())
    setArpNotes([])
    arpStopRef.current?.()
  }, [getEngine])

  const handleKillAll = useCallback(() => {
    getEngine().killAllSound()
    setHold(false)
    setKeyboardPositions(new Map())
    setArpNotes([])
    arpStopRef.current?.()
  }, [getEngine])

  return (
    <div className={`app ${visualMode === 'lo' ? 'lo-mode' : ''}`}>
      <Visualizer getEngine={getEngine} ribbonInteraction={ribbonInteraction} visualMode={visualMode} setVisualMode={setVisualMode} reverbMix={reverbMix} delayParams={delayParams} />

      <header className="app-header">
        <button
          className={`app-header__ambient ${ambientPlay ? 'app-header__ambient--on' : ''} ${ambientIsPlaying ? 'app-header__ambient--playing' : ''} ${ambientIsSleeping ? 'app-header__ambient--sleeping' : ''}`}
          onClick={() => {
            setAmbientPlay(a => {
              if (!a) setTimeout(() => ambientStartNow(), 0)
              return !a
            })
          }}
          aria-label="Toggle ambient play"
          title={ambientPlay ? 'Ambient play on (plays after 30s idle)' : 'Ambient play off'}
        >
          <svg className="app-header__ambient-icon" viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Möbius strip infinity — two crossing loops with depth */}
            <path d="M12,12 C12,5 18,4 24,12 C28,18 33,17 33,12 C33,7 28,6 24,12 C18,20 12,19 12,12 Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
            <path d="M12,12 C12,5 18,4 24,12 C28,18 33,17 33,12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M33,12 C33,7 28,6 24,12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
          </svg>
        </button>
        <div className="app-header__logo" onClick={() => { requestMotionPermission(); handleShake(0.5) }} role="button" tabIndex={0} aria-label="Shake / Randomize">
          <RibbonLogo />
        </div>
        <button
          className="app-header__shake-bolt"
          onClick={() => { requestMotionPermission(); handleShake(0.5) }}
          aria-label="Shake / Randomize"
        >
          ⚡
        </button>
      </header>

      <Controls
        ref={controlsRef}
        getEngine={getEngine}
        oscParams={oscParams}
        setOscParams={setOscParams}
        volume={volume}
        setVolume={setVolume}
        octaves={octaves}
        setOctaves={setOctaves}
        stepped={stepped}
        setStepped={setStepped}
        scale={scale}
        setScale={setScale}
        delayParams={delayParams}
        setDelayParams={setDelayParams}
        reverbMix={reverbMix}
        setReverbMix={setReverbMix}
        crunch={crunch}
        setCrunch={setCrunch}
        filterParams={filterParams}
        setFilterParams={setFilterParams}
        glideSpeed={glideSpeed}
        setGlideSpeed={setGlideSpeed}
        shaking={shaking}
        mode={mode}
        setMode={setMode}
        poly={poly}
        setPoly={setPoly}
        arpBpm={arpBpm}
        setArpBpm={setArpBpm}
        hold={hold}
        setHold={setHold}
        onStop={handleStop}
        onKillAll={handleKillAll}
      />

      <div className="keys-toggle">
        <button
          className={`keys-toggle__btn ${inputMode === 'keys' ? 'active' : ''}`}
          onClick={() => setInputMode(inputMode === 'keys' ? 'touch' : 'keys')}
          title="A-L keys control ribbon"
        >
          Keys
        </button>
      </div>

      <Ribbon
        ref={ribbonRef}
        getEngine={getEngine}
        mode={mode}
        inputMode={inputMode}
        octaves={octaves}
        stepped={stepped}
        scale={scale}
        externalPositions={keyboardPositions}
        ribbonInteraction={ribbonInteraction}
        arpStart={arpStart}
        arpStop={arpStop}
        hold={hold}
        poly={poly}
        shaking={shaking}
        undulating={undulating}
        onArpNoteToggle={handleArpNoteToggle}
        arpNotes={arpNotes}
      />
    </div>
  )
}

export default App
