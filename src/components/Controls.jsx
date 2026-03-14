import { useCallback, forwardRef } from 'react'
import { SCALES } from '../utils/scales'
import './Controls.css'

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle']
const OCTAVE_OPTIONS = [1, 2, 3, 4]
const SCALE_NAMES = Object.keys(SCALES)
const OSC_COLORS = ['var(--cyan)', 'var(--magenta)', 'var(--purple)']

function OscSection({ index, params, getEngine, onUpdate }) {
  const handleWaveform = useCallback((type) => {
    onUpdate(index, { ...params, waveform: type })
    getEngine().setWaveform(type, index)
  }, [index, params, getEngine, onUpdate])

  const handleDetune = useCallback((e) => {
    const detune = parseInt(e.target.value)
    onUpdate(index, { ...params, detune })
    getEngine().setOscDetune(index, detune)
  }, [index, params, getEngine, onUpdate])

  const handleMix = useCallback((e) => {
    const mix = parseFloat(e.target.value)
    onUpdate(index, { ...params, mix })
    getEngine().setOscMix(index, mix)
  }, [index, params, getEngine, onUpdate])

  return (
    <div className="controls__osc" style={{ '--osc-color': OSC_COLORS[index] }}>
      <label className="controls__osc-label">OSC {index + 1}</label>
      <div className="controls__section">
        <label className="controls__label">Wave</label>
        <div className="controls__waveforms">
          {WAVEFORMS.map((w) => (
            <button
              key={w}
              className={params.waveform === w ? 'active' : ''}
              onClick={() => handleWaveform(w)}
            >
              {w.slice(0, 3).toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="controls__section">
        <label className="controls__label">Mix <span className="controls__value">{Math.round(params.mix * 100)}%</span></label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={params.mix}
          onChange={handleMix}
        />
      </div>
      <div className="controls__section">
        <label className="controls__label">Detune <span className="controls__value">{params.detune}¢</span></label>
        <input
          type="range"
          min="-1200"
          max="1200"
          step="1"
          value={params.detune}
          onChange={handleDetune}
        />
      </div>
    </div>
  )
}

export const Controls = forwardRef(function Controls({
  getEngine,
  oscParams,
  setOscParams,
  volume,
  setVolume,
  octaves,
  setOctaves,
  stepped,
  setStepped,
  scale,
  setScale,
  delayParams,
  setDelayParams,
  reverbMix,
  setReverbMix,
  filterParams,
  setFilterParams,
  glideSpeed,
  setGlideSpeed,
  shaking,
}, ref) {
  const handleOscUpdate = useCallback((index, newParams) => {
    setOscParams((prev) => {
      const next = [...prev]
      next[index] = newParams
      return next
    })
  }, [setOscParams])

  const handleVolume = useCallback((e) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    getEngine().setVolume(val)
  }, [getEngine, setVolume])

  const handleDelayTime = useCallback((e) => {
    const time = parseFloat(e.target.value)
    setDelayParams((prev) => ({ ...prev, time }))
    getEngine().setDelay({ time })
  }, [getEngine, setDelayParams])

  const handleDelayFeedback = useCallback((e) => {
    const feedback = parseFloat(e.target.value)
    setDelayParams((prev) => ({ ...prev, feedback }))
    getEngine().setDelay({ feedback })
  }, [getEngine, setDelayParams])

  const handleDelayMix = useCallback((e) => {
    const mix = parseFloat(e.target.value)
    setDelayParams((prev) => ({ ...prev, mix }))
    getEngine().setDelay({ mix })
  }, [getEngine, setDelayParams])

  const handleReverbMix = useCallback((e) => {
    const mix = parseFloat(e.target.value)
    setReverbMix(mix)
    getEngine().setReverb({ mix })
  }, [getEngine, setReverbMix])

  const handleCutoff = useCallback((e) => {
    const cutoff = parseFloat(e.target.value)
    setFilterParams((prev) => ({ ...prev, cutoff }))
    getEngine().setFilter({ cutoff })
  }, [getEngine, setFilterParams])

  const handleResonance = useCallback((e) => {
    const resonance = parseFloat(e.target.value)
    setFilterParams((prev) => ({ ...prev, resonance }))
    getEngine().setFilter({ resonance })
  }, [getEngine, setFilterParams])

  const handleGlideSpeed = useCallback((e) => {
    const value = parseFloat(e.target.value)
    setGlideSpeed(value)
    getEngine().setGlideSpeed(value)
  }, [getEngine, setGlideSpeed])

  return (
    <div ref={ref} className={`controls ${shaking ? 'controls--shaking' : ''}`}>
      <div className="controls__oscillators">
        {oscParams.map((params, i) => (
          <OscSection
            key={i}
            index={i}
            params={params}
            getEngine={getEngine}
            onUpdate={handleOscUpdate}
          />
        ))}
      </div>

      <div className="controls__shared">
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
          <label className="controls__label">Scale</label>
          <div className="controls__waveforms">
            {SCALE_NAMES.map((s) => (
              <button
                key={s}
                className={scale.includes(s) ? 'active' : ''}
                onClick={() => {
                  setScale(prev => {
                    if (s === 'chromatic') {
                      setStepped(false)
                      return ['chromatic']
                    }
                    setStepped(true)
                    const without = prev.filter(x => x !== 'chromatic' && x !== s)
                    if (prev.includes(s)) {
                      const remaining = without.length === 0 ? ['chromatic'] : without
                      if (remaining.length === 1 && remaining[0] === 'chromatic') setStepped(false)
                      return remaining
                    }
                    return [...without, s]
                  })
                }}
              >
                {s.slice(0, 4).toUpperCase()}
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
          <label className="controls__label">Filter</label>
          <div className="controls__knobs">
            <div className="controls__knob">
              <span>Cutoff</span>
              <input type="range" min="20" max="20000" step="1" value={filterParams.cutoff} onChange={handleCutoff} />
            </div>
            <div className="controls__knob">
              <span>Res</span>
              <input type="range" min="0" max="25" step="0.1" value={filterParams.resonance} onChange={handleResonance} />
            </div>
          </div>
        </div>

        <div className="controls__section">
          <label className="controls__label">Speed <span className="controls__value">{glideSpeed < 0.01 ? 'fast' : glideSpeed > 0.15 ? 'slow' : 'med'}</span></label>
          <input
            type="range"
            min="0.001"
            max="0.3"
            step="0.001"
            value={glideSpeed}
            onChange={handleGlideSpeed}
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
              <span>Fdbk</span>
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
    </div>
  )
})
