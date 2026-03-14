import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useKeyboard } from './hooks/useKeyboard'
import { useKeyboardPlay } from './hooks/useKeyboardPlay'
import { useArpeggiator } from './hooks/useArpeggiator'
import { useShake } from './hooks/useShake'
import { Visualizer } from './components/Visualizer'
import { Ribbon } from './components/Ribbon'
import { Controls } from './components/Controls'
import { ActivationMode } from './components/ActivationMode'
import { RibbonLogo } from './components/RibbonLogo'
import { positionToFrequency } from './utils/pitchMap'
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
  const [crushParams, setCrushParams] = useState({ bitDepth: 16, reduction: 1, mix: 0 })
  const [filterParams, setFilterParams] = useState({ cutoff: 20000, resonance: 0 })
  const [glideSpeed, setGlideSpeed] = useState(0.005)
  const [stepped, setStepped] = useState(false)
  const [scale, setScale] = useState(['chromatic'])
  const [keyboardPositions, setKeyboardPositions] = useState(new Map())
  const [visualMode, setVisualMode] = useState('party')
  const [arpBpm, setArpBpm] = useState(120)
  const [hold, setHold] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [undulating, setUndulating] = useState(false)
  const ribbonInteraction = useRef({ position: null, velocity: 0, active: false })
  const controlsRef = useRef(null)
  const ribbonRef = useRef(null)
  const shakeTimerRef = useRef(null)
  const undulateTimerRef = useRef(null)

  const keyHandlers = useMemo(() => ({
    Space: () => {
      getEngine().allNotesOff()
      setHold(false)
      setKeyboardPositions(new Map())
    },
    Digit1: () => setMode('play'),
    Digit2: () => setMode('latch'),
    Digit3: () => setMode('arp'),
    Digit4: () => setHold((h) => !h),
    KeyV: () => setVisualMode((m) => m === 'party' ? 'lo' : 'party'),
  }), [mode, hold, getEngine])

  useKeyboard(keyHandlers)

  const handleKeyboardPositions = useCallback((posMap) => {
    setKeyboardPositions(posMap)
  }, [])

  const { arpStart, arpStop } = useArpeggiator(getEngine, mode, arpBpm)

  useKeyboardPlay(getEngine, inputMode, mode, octaves, stepped, scale, handleKeyboardPositions, arpStart, arpStop, hold)

  // --- Shake/Quake handler ---
  const handleShake = useCallback((intensity) => {
    const engine = getEngine()

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
      const newVol = nudge(volume, 0, 1, intensity)
      setVolume(newVol)
      engine.setVolume(newVol)
    }

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
      const newCrushMix = nudge(crushParams.mix, 0, 1, intensity)
      setCrushParams(prev => ({ ...prev, mix: newCrushMix }))
      engine.setCrush({ mix: newCrushMix })
    }

    if (shouldNudge()) {
      const newBitDepth = Math.round(nudge(crushParams.bitDepth, 1, 16, intensity))
      setCrushParams(prev => ({ ...prev, bitDepth: newBitDepth }))
      engine.setCrush({ bitDepth: newBitDepth })
    }

    if (shouldNudge()) {
      const newReduction = Math.round(nudge(crushParams.reduction, 1, 40, intensity))
      setCrushParams(prev => ({ ...prev, reduction: newReduction }))
      engine.setCrush({ reduction: newReduction })
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
  }, [getEngine, volume, filterParams, glideSpeed, delayParams, reverbMix, crushParams, octaves, stepped, scale, ribbonInteraction])

  useShake(handleShake, controlsRef, ribbonRef)

  // When hold is active and only one voice is playing, global mouse movement controls pitch
  useEffect(() => {
    if (!hold) return
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
  }, [hold, getEngine, octaves, stepped, scale, ribbonInteraction])

  // When hold is toggled off, stop all notes if in play mode
  const holdRef = useRef(hold)
  useEffect(() => {
    const wasHold = holdRef.current
    holdRef.current = hold
    if (wasHold && !hold) {
      const engine = getEngine()
      if (engine.getIsPlaying() && mode === 'play') {
        engine.allNotesOff()
      }
    }
  }, [hold, getEngine, mode])

  return (
    <div className={`app ${visualMode === 'lo' ? 'lo-mode' : ''}`}>
      <Visualizer getEngine={getEngine} ribbonInteraction={ribbonInteraction} visualMode={visualMode} setVisualMode={setVisualMode} reverbMix={reverbMix} delayParams={delayParams} />

      <header className="app-header">
        <RibbonLogo />
        <span className="subtitle">analog ribbon synth</span>
      </header>

      <ActivationMode
        mode={mode}
        setMode={setMode}
        inputMode={inputMode}
        setInputMode={setInputMode}
        getEngine={getEngine}
        arpBpm={arpBpm}
        setArpBpm={setArpBpm}
        hold={hold}
        setHold={setHold}
      />

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
        shaking={shaking}
        undulating={undulating}
      />

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
        crushParams={crushParams}
        setCrushParams={setCrushParams}
        filterParams={filterParams}
        setFilterParams={setFilterParams}
        glideSpeed={glideSpeed}
        setGlideSpeed={setGlideSpeed}
        shaking={shaking}
      />
    </div>
  )
}

export default App
