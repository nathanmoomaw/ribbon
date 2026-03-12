import { useState, useRef, useMemo, useCallback } from 'react'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useKeyboard } from './hooks/useKeyboard'
import { useKeyboardPlay } from './hooks/useKeyboardPlay'
import { Visualizer } from './components/Visualizer'
import { Ribbon } from './components/Ribbon'
import { Controls } from './components/Controls'
import { ActivationMode } from './components/ActivationMode'
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
  const [stepped, setStepped] = useState(false)
  const [scale, setScale] = useState('chromatic')
  const [ribbonPosition, setRibbonPosition] = useState(null)
  const [visualMode, setVisualMode] = useState('party')
  const ribbonInteraction = useRef({ position: null, active: false })

  const keyHandlers = useMemo(() => ({
    Space: () => {
      if (mode === 'latch') {
        getEngine().noteOff()
      }
    },
    Digit1: () => setMode('play'),
    Digit2: () => setMode('latch'),
    KeyV: () => setVisualMode((m) => m === 'party' ? 'lo' : 'party'),
  }), [mode, getEngine])

  useKeyboard(keyHandlers)

  const handleKeyboardPosition = useCallback((pos) => {
    setRibbonPosition(pos)
  }, [])

  useKeyboardPlay(getEngine, inputMode, mode, octaves, stepped, scale, handleKeyboardPosition)

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
      />

      <Ribbon
        getEngine={getEngine}
        mode={mode}
        inputMode={inputMode}
        octaves={octaves}
        stepped={stepped}
        scale={scale}
        externalPosition={ribbonPosition}
        ribbonInteraction={ribbonInteraction}
      />
    </div>
  )
}

export default App
