import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useKeyboard } from './hooks/useKeyboard'
import { useKeyboardPlay } from './hooks/useKeyboardPlay'
import { useArpeggiator } from './hooks/useArpeggiator'
import { Visualizer } from './components/Visualizer'
import { Ribbon } from './components/Ribbon'
import { Controls } from './components/Controls'
import { ActivationMode } from './components/ActivationMode'
import { positionToFrequency } from './utils/pitchMap'
import './App.css'

function App() {
  const getEngine = useAudioEngine()

  const [mode, setMode] = useState('play')
  const [inputMode, setInputMode] = useState('touch')
  const [oscParams, setOscParams] = useState([
    { waveform: 'sawtooth', detune: 0, mix: 1.0 },
    { waveform: 'sawtooth', detune: 0, mix: 0.0 },
  ])
  const [volume, setVolume] = useState(0.5)
  const [octaves, setOctaves] = useState(2)
  const [delayParams, setDelayParams] = useState({ time: 0.3, feedback: 0.4, mix: 0 })
  const [reverbMix, setReverbMix] = useState(0)
  const [filterParams, setFilterParams] = useState({ cutoff: 20000, resonance: 0 })
  const [glideSpeed, setGlideSpeed] = useState(0.005)
  const [stepped, setStepped] = useState(false)
  const [scale, setScale] = useState('chromatic')
  const [keyboardPositions, setKeyboardPositions] = useState(new Map())
  const [visualMode, setVisualMode] = useState('party')
  const [arpBpm, setArpBpm] = useState(120)
  const [hold, setHold] = useState(false)
  const ribbonInteraction = useRef({ position: null, velocity: 0, active: false })

  const keyHandlers = useMemo(() => ({
    Space: () => {
      if (mode === 'latch' || hold) {
        getEngine().allNotesOff()
        setHold(false)
        setKeyboardPositions(new Map())
      }
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
      <Visualizer getEngine={getEngine} ribbonInteraction={ribbonInteraction} visualMode={visualMode} />

      <header className="app-header">
        <h1>Ribbon</h1>
        <span className="subtitle">analog ribbon synth</span>
      </header>

      <ActivationMode
        mode={mode}
        setMode={setMode}
        inputMode={inputMode}
        setInputMode={setInputMode}
        getEngine={getEngine}
        visualMode={visualMode}
        setVisualMode={setVisualMode}
        arpBpm={arpBpm}
        setArpBpm={setArpBpm}
        hold={hold}
        setHold={setHold}
      />

      <Controls
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
        filterParams={filterParams}
        setFilterParams={setFilterParams}
        glideSpeed={glideSpeed}
        setGlideSpeed={setGlideSpeed}
      />

      <Ribbon
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
      />
    </div>
  )
}

export default App
