import { useCallback } from 'react'
import './Controls.css'

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle']
const OCTAVE_OPTIONS = [1, 2, 3, 4]

export function Controls({
  getEngine,
  waveform,
  setWaveform,
  volume,
  setVolume,
  octaves,
  setOctaves,
  delayParams,
  setDelayParams,
  reverbMix,
  setReverbMix,
}) {
  const handleWaveform = useCallback((type) => {
    setWaveform(type)
    getEngine().setWaveform(type)
  }, [getEngine, setWaveform])

  const handleVolume = useCallback((e) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    getEngine().setVolume(val)
  }, [getEngine, setVolume])

  const handleDelayTime = useCallback((e) => {
    const time = parseFloat(e.target.value)
    const next = { ...delayParams, time }
    setDelayParams(next)
    getEngine().setDelay({ time })
  }, [getEngine, delayParams, setDelayParams])

  const handleDelayFeedback = useCallback((e) => {
    const feedback = parseFloat(e.target.value)
    const next = { ...delayParams, feedback }
    setDelayParams(next)
    getEngine().setDelay({ feedback })
  }, [getEngine, delayParams, setDelayParams])

  const handleDelayMix = useCallback((e) => {
    const mix = parseFloat(e.target.value)
    const next = { ...delayParams, mix }
    setDelayParams(next)
    getEngine().setDelay({ mix })
  }, [getEngine, delayParams, setDelayParams])

  const handleReverbMix = useCallback((e) => {
    const mix = parseFloat(e.target.value)
    setReverbMix(mix)
    getEngine().setReverb({ mix })
  }, [getEngine, setReverbMix])

  return (
    <div className="controls">
      <div className="controls__section">
        <label className="controls__label">Waveform</label>
        <div className="controls__waveforms">
          {WAVEFORMS.map((w) => (
            <button
              key={w}
              className={waveform === w ? 'active' : ''}
              onClick={() => handleWaveform(w)}
            >
              {w.slice(0, 3).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="controls__section">
        <label className="controls__label">Octaves</label>
        <div className="controls__waveforms">
          {OCTAVE_OPTIONS.map((o) => (
            <button
              key={o}
              className={octaves === o ? 'active' : ''}
              onClick={() => setOctaves(o)}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      <div className="controls__section">
        <label className="controls__label">Volume</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolume}
        />
      </div>

      <div className="controls__section">
        <label className="controls__label">Delay</label>
        <div className="controls__knobs">
          <div className="controls__knob">
            <span>Time</span>
            <input type="range" min="0.05" max="1" step="0.01" value={delayParams.time} onChange={handleDelayTime} />
          </div>
          <div className="controls__knob">
            <span>Feedback</span>
            <input type="range" min="0" max="0.9" step="0.01" value={delayParams.feedback} onChange={handleDelayFeedback} />
          </div>
          <div className="controls__knob">
            <span>Mix</span>
            <input type="range" min="0" max="1" step="0.01" value={delayParams.mix} onChange={handleDelayMix} />
          </div>
        </div>
      </div>

      <div className="controls__section">
        <label className="controls__label">Reverb</label>
        <div className="controls__knobs">
          <div className="controls__knob">
            <span>Mix</span>
            <input type="range" min="0" max="1" step="0.01" value={reverbMix} onChange={handleReverbMix} />
          </div>
        </div>
      </div>
    </div>
  )
}
