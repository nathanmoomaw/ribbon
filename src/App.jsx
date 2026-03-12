import { useState, useMemo } from 'react'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useKeyboard } from './hooks/useKeyboard'
import { Ribbon } from './components/Ribbon'
import { Controls } from './components/Controls'
import { ActivationMode } from './components/ActivationMode'
import './App.css'

function App() {
  const getEngine = useAudioEngine()

  const [mode, setMode] = useState('play')
  const [waveform, setWaveform] = useState('sawtooth')
  const [volume, setVolume] = useState(0.5)
  const [octaves, setOctaves] = useState(2)
  const [delayParams, setDelayParams] = useState({ time: 0.3, feedback: 0.4, mix: 0 })
  const [reverbMix, setReverbMix] = useState(0)

  const keyHandlers = useMemo(() => ({
    Space: () => {
      if (mode === 'latch') {
        getEngine().noteOff()
      }
    },
    Digit1: () => setMode('play'),
    Digit2: () => setMode('latch'),
    KeyQ: () => { setWaveform('sine'); getEngine().setWaveform('sine') },
    KeyW: () => { setWaveform('square'); getEngine().setWaveform('square') },
    KeyE: () => { setWaveform('sawtooth'); getEngine().setWaveform('sawtooth') },
    KeyR: () => { setWaveform('triangle'); getEngine().setWaveform('triangle') },
  }), [mode, getEngine])

  useKeyboard(keyHandlers)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Ribbon</h1>
        <span className="subtitle">analog ribbon synth</span>
      </header>

      <Ribbon getEngine={getEngine} mode={mode} octaves={octaves} />

      <ActivationMode mode={mode} setMode={setMode} getEngine={getEngine} />

      <Controls
        getEngine={getEngine}
        waveform={waveform}
        setWaveform={setWaveform}
        volume={volume}
        setVolume={setVolume}
        octaves={octaves}
        setOctaves={setOctaves}
        delayParams={delayParams}
        setDelayParams={setDelayParams}
        reverbMix={reverbMix}
        setReverbMix={setReverbMix}
      />
    </div>
  )
}

export default App
