import { useCallback, useRef as useRefHook, useEffect, forwardRef, memo } from 'react'
import { SCALES, SCALE_LABELS } from '../utils/scales'
import { ActivationMode } from './ActivationMode'
import { RotaryKnob } from './RotaryKnob'
import { VCFControl } from './VCFControl'
import './Controls.css'

function DJFader({ value, onChange, ghostValue }) {
  const trackRef = useRefHook(null)
  const thumbRef = useRefHook(null)
  const valueRef = useRefHook(null)
  const dragging = useRefHook(false)
  const cachedRect = useRefHook(null)
  const isHorizontal = useRefHook(false)
  const rafRef = useRefHook(null)

  // Direct DOM update — bypasses React re-render for zero-lag thumb movement
  const applyThumbPosition = useCallback((ratio) => {
    const thumb = thumbRef.current
    const valEl = valueRef.current
    if (thumb) {
      const topPct = (1 - ratio) * 100
      const leftPct = ratio * 100
      thumb.style.setProperty('--thumb-top', `calc(${topPct}% - 5px)`)
      thumb.style.setProperty('--thumb-left', `calc(${leftPct}% - 5px)`)
    }
    if (valEl) valEl.textContent = Math.round(ratio * 100)
  }, [])

  const onPointerDown = useCallback((e) => {
    dragging.current = true
    const track = trackRef.current
    if (!track) return
    e.currentTarget.setPointerCapture(e.pointerId)
    // Cache rect once on pointer down — avoids layout thrash on every move
    cachedRect.current = track.getBoundingClientRect()
    isHorizontal.current = cachedRect.current.width > cachedRect.current.height
    const rect = cachedRect.current
    const ratio = isHorizontal.current
      ? Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      : 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    applyThumbPosition(ratio)
    onChange(ratio)
  }, [onChange, applyThumbPosition])

  const onPointerMove = useCallback((e) => {
    if (!dragging.current || !cachedRect.current) return
    const rect = cachedRect.current
    const ratio = isHorizontal.current
      ? Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      : 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    applyThumbPosition(ratio)
    onChange(ratio)
  }, [onChange, applyThumbPosition])

  const onPointerUp = useCallback(() => {
    dragging.current = false
    cachedRect.current = null
  }, [])

  const pct = Math.round(value * 100)
  const thumbTop = (1 - value) * 100
  const thumbLeft = value * 100

  return (
    <div className="controls__fader">
      <label className="controls__fader-label">Vol</label>
      <div
        className="controls__fader-track"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="controls__fader-groove" />
        {ghostValue != null && (
          <div
            className="controls__fader-ghost"
            style={{
              '--ghost-top': `calc(${(1 - ghostValue) * 100}% - 5px)`,
              '--ghost-left': `calc(${ghostValue * 100}% - 5px)`,
            }}
          />
        )}
        <div
          ref={thumbRef}
          className="controls__fader-thumb"
          style={{
            '--thumb-top': `calc(${thumbTop}% - 5px)`,
            '--thumb-left': `calc(${thumbLeft}% - 5px)`,
          }}
        />
      </div>
      <span ref={valueRef} className="controls__fader-value">{pct}</span>
    </div>
  )
}

/**
 * GoopableSection — wraps a control section, registers it for goop hit-testing,
 * and renders a goop visual overlay when gooped.
 */
function GoopableSection({ id, registerControl, goopLevel, puddleActivity, children, className }) {
  const elRef = useRefHook(null)

  useEffect(() => {
    if (registerControl && id) {
      registerControl(id, elRef.current)
      return () => registerControl(id, null)
    }
  }, [id, registerControl])

  const hasGoop = goopLevel > 0.01
  const isActive = puddleActivity > 0 && hasGoop

  return (
    <div
      ref={elRef}
      className={`${className || ''} ${hasGoop ? 'gooped' : ''} ${isActive ? 'gooped--active' : ''}`}
      style={hasGoop ? {
        position: 'relative',
        '--goop-level': goopLevel,
        '--goop-opacity': Math.min(0.7, goopLevel * 0.8),
      } : undefined}
    >
      {children}
      {hasGoop && (
        <div className="goop-effect" style={{ '--goop-level': goopLevel }}>
          <svg viewBox="0 0 100 60" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <radialGradient id={`goop-grad-${id}`} cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="rgba(180, 100, 255, 0.4)" />
                <stop offset="50%" stopColor="rgba(100, 200, 255, 0.2)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            <ellipse
              cx="50" cy="30"
              rx={25 + goopLevel * 20}
              ry={12 + goopLevel * 12}
              fill={`url(#goop-grad-${id})`}
              stroke={`rgba(120, 80, 200, ${goopLevel * 0.5})`}
              strokeWidth="1.5"
            />
            {goopLevel > 0.3 && (
              <ellipse
                cx={35 + goopLevel * 15}
                cy={18 + goopLevel * 8}
                rx={10 + goopLevel * 8}
                ry={6 + goopLevel * 6}
                fill={`rgba(180, 100, 255, ${goopLevel * 0.15})`}
                stroke={`rgba(180, 100, 255, ${goopLevel * 0.4})`}
                strokeWidth="1"
              />
            )}
            {goopLevel > 0.6 && (
              <circle
                cx="65" cy="40"
                r={5 + goopLevel * 6}
                fill={`rgba(100, 200, 255, ${goopLevel * 0.1})`}
                stroke={`rgba(100, 200, 255, ${goopLevel * 0.3})`}
                strokeWidth="1"
              />
            )}
          </svg>
        </div>
      )}
    </div>
  )
}

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle']
const OCTAVE_OPTIONS = [1, 2, 3, 4]
const SCALE_NAMES = Object.keys(SCALES)
const OSC_COLORS = ['var(--osc-red)', 'var(--osc-gold)', 'var(--osc-green)']

function MiniShakeBolt({ onClick, title }) {
  const btnRef = useRefHook(null)
  const handleClick = useCallback(() => {
    // Shake the parent panel
    const panel = btnRef.current?.closest('.controls__osc, .controls__shared')
    if (panel) {
      panel.classList.remove('controls__section-shake')
      void panel.offsetWidth // force reflow to restart animation
      panel.classList.add('controls__section-shake')
    }
    onClick()
  }, [onClick])

  return (
    <button
      ref={btnRef}
      className="controls__mini-shake"
      onClick={handleClick}
      title={title || 'Randomize'}
    >
      ⚡
    </button>
  )
}

const OscSection = memo(function OscSection({ index, params, getEngine, onUpdate }) {
  const handleWaveform = useCallback((type) => {
    onUpdate(index, { ...params, waveform: type })
    getEngine().setWaveform(type, index)
  }, [index, params, getEngine, onUpdate])

  const handleDetune = useCallback((val) => {
    const detune = Math.round(val)
    onUpdate(index, { ...params, detune })
    getEngine().setOscDetune(index, detune)
  }, [index, params, getEngine, onUpdate])

  const handleMix = useCallback((val) => {
    const mix = val
    onUpdate(index, { ...params, mix })
    getEngine().setOscMix(index, mix)
  }, [index, params, getEngine, onUpdate])

  const handleOscShake = useCallback(() => {
    const engine = getEngine()
    const waveform = WAVEFORMS[Math.floor(Math.random() * WAVEFORMS.length)]
    const mix = Math.random()
    const detune = Math.round((Math.random() - 0.5) * 2400)
    onUpdate(index, { waveform, mix, detune })
    engine.setWaveform(waveform, index)
    engine.setOscMix(index, mix)
    engine.setOscDetune(index, detune)
  }, [index, getEngine, onUpdate])

  return (
    <div className="controls__osc" style={{ '--osc-color': OSC_COLORS[index] }}>
      <label className="controls__osc-label">OSC {index + 1}</label>
      <MiniShakeBolt onClick={handleOscShake} title={`Randomize OSC ${index + 1}`} />
      <div className="controls__section">
        <label className="controls__label">Wave</label>
        <div className="controls__waveforms controls__waveforms--circular">
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
      <div className="controls__osc-knobs">
        <RotaryKnob
          value={params.mix}
          min={0}
          max={1}
          step={0.01}
          onChange={handleMix}
          color={OSC_COLORS[index]}
          label={`Mix ${Math.round(params.mix * 100)}%`}
          size={42}
        />
        <RotaryKnob
          value={params.detune}
          min={-1200}
          max={1200}
          step={1}
          onChange={handleDetune}
          color={OSC_COLORS[index]}
          label={`Det ${params.detune}¢`}
          size={42}
        />
      </div>
    </div>
  )
})

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
  crunch,
  setCrunch,
  filterParams,
  setFilterParams,
  glideSpeed,
  setGlideSpeed,
  shaking,
  mode,
  setMode,
  poly,
  setPoly,
  arpBpm,
  setArpBpm,
  hold,
  setHold,
  onStop,
  onKillAll,
  onQRCreate,
  goopLevels,
  puddleActivity,
  registerControl,
  trayMarble,
  draggingMarble,
  onMarblePickUp,
  nextSlotId,
  vcfCutoff,
  vcfResonance,
  vcfRouting,
  onVcfCutoffChange,
  onVcfResonanceChange,
  onVcfRoutingToggle,
  midiDevice,
  onConnectMIDI,
  utilitySlot,
}, ref) {
  const handleOscUpdate = useCallback((index, newParams) => {
    setOscParams((prev) => {
      const next = [...prev]
      next[index] = newParams
      return next
    })
  }, [setOscParams])

  const volRafRef = useRefHook(null)
  const handleVolume = useCallback((val) => {
    // Update engine immediately; skip React state to avoid re-rendering entire Controls tree
    getEngine().setVolume(val)
    // Debounced state sync so React value stays roughly current
    if (volRafRef.current) cancelAnimationFrame(volRafRef.current)
    volRafRef.current = requestAnimationFrame(() => setVolume(val))
  }, [getEngine, setVolume])

  const handleDelayTime = useCallback((val) => {
    setDelayParams((prev) => ({ ...prev, time: val }))
    getEngine().setDelay({ time: val })
  }, [getEngine, setDelayParams])

  const handleDelayFeedback = useCallback((val) => {
    setDelayParams((prev) => ({ ...prev, feedback: val }))
    getEngine().setDelay({ feedback: val })
  }, [getEngine, setDelayParams])

  const handleDelayMix = useCallback((val) => {
    setDelayParams((prev) => ({ ...prev, mix: val }))
    getEngine().setDelay({ mix: val })
  }, [getEngine, setDelayParams])

  const handleReverbMix = useCallback((val) => {
    setReverbMix(val)
    getEngine().setReverb({ mix: val })
  }, [getEngine, setReverbMix])

  const handleCutoff = useCallback((val) => {
    setFilterParams((prev) => ({ ...prev, cutoff: val }))
    getEngine().setFilter({ cutoff: val })
  }, [getEngine, setFilterParams])

  const handleResonance = useCallback((val) => {
    setFilterParams((prev) => ({ ...prev, resonance: val }))
    getEngine().setFilter({ resonance: val })
  }, [getEngine, setFilterParams])

  const handleCrunch = useCallback((val) => {
    setCrunch(val)
    getEngine().setCrunch(val)
  }, [getEngine, setCrunch])

  const handleGlideSpeed = useCallback((val) => {
    setGlideSpeed(val)
    getEngine().setGlideSpeed(val)
  }, [getEngine, setGlideSpeed])

  return (
    <div ref={ref} className={`controls ${shaking ? 'controls--shaking' : ''}`}>
      <div className="controls__layout">
        <div className="controls__toggles">
          <ActivationMode
            mode={mode}
            setMode={setMode}
            poly={poly}
            setPoly={setPoly}
            arpBpm={arpBpm}
            setArpBpm={setArpBpm}
            hold={hold}
            setHold={setHold}
            onStop={onStop}
            onKillAll={onKillAll}
            trayMarble={trayMarble}
            draggingMarble={draggingMarble}
            onMarblePickUp={onMarblePickUp}
            nextSlotId={nextSlotId}
          />
          <DJFader value={volume} onChange={handleVolume} />

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

          <div className="controls__section controls__section--full">
            <label className="controls__label">Scale</label>
            <div className="controls__waveforms">
              {SCALE_NAMES.map((s) => {
                const isDoubleHarmonicActive = scale.includes('double harmonic')
                const isActive = !isDoubleHarmonicActive && scale.includes(s)
                return (
                  <button
                    key={s}
                    className={isActive ? 'active' : ''}
                    onClick={() => {
                      setScale(prev => {
                        if (s === 'chromatic') {
                          setStepped(false)
                          return ['chromatic']
                        }
                        setStepped(true)
                        const without = prev.filter(x => x !== 'chromatic' && x !== s && x !== 'double harmonic')
                        if (prev.includes(s)) {
                          const remaining = without.length === 0 ? ['chromatic'] : without
                          if (remaining.length === 1 && remaining[0] === 'chromatic') setStepped(false)
                          return remaining
                        }
                        return [...without, s]
                      })
                    }}
                  >
                    {SCALE_LABELS[s] ?? s.slice(0, 4).toUpperCase()}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="controls__section">
            <label className="controls__label">Speed <span className="controls__value">{glideSpeed < 0.01 ? 'fast' : glideSpeed > 0.15 ? 'slow' : 'med'}</span></label>
            <RotaryKnob value={glideSpeed} min={0.001} max={0.3} step={0.001} onChange={handleGlideSpeed} color="#39ff14" size={40} />
          </div>
        </div>

        <div className="controls__main">
          <div className="controls__oscillators">
            {oscParams.map((params, i) => (
              <GoopableSection
                key={i}
                id={`osc-${i}`}
                registerControl={registerControl}
                goopLevel={(goopLevels && goopLevels[`osc-${i}`]) || 0}
                puddleActivity={puddleActivity || 0}
                className="controls__osc-goopable"
              >
                <OscSection
                  index={i}
                  params={params}
                  getEngine={getEngine}
                  onUpdate={handleOscUpdate}
                />
              </GoopableSection>
            ))}
          </div>

          <GoopableSection
            id="filter"
            registerControl={registerControl}
            goopLevel={(goopLevels && goopLevels['filter']) || 0}
            puddleActivity={puddleActivity || 0}
            className="controls__shared"
          >
            <VCFControl
              vcfCutoff={vcfCutoff}
              vcfResonance={vcfResonance}
              vcfRouting={vcfRouting}
              getEngine={getEngine}
              onCutoffChange={onVcfCutoffChange}
              onResonanceChange={onVcfResonanceChange}
              onRoutingToggle={onVcfRoutingToggle}
            />
            <MiniShakeBolt onClick={() => {
              const engine = getEngine()
              const newOctaves = OCTAVE_OPTIONS[Math.floor(Math.random() * OCTAVE_OPTIONS.length)]
              setOctaves(newOctaves)
              const randomScale = SCALE_NAMES[Math.floor(Math.random() * SCALE_NAMES.length)]
              setScale([randomScale])
              if (randomScale !== 'chromatic') setStepped(true)
              else setStepped(false)
              const newCutoff = 20 + Math.random() * 19980
              const newRes = Math.random() * 25
              setFilterParams({ cutoff: newCutoff, resonance: newRes })
              engine.setFilter({ cutoff: newCutoff, resonance: newRes })
              const newSpeed = 0.001 + Math.random() * 0.299
              setGlideSpeed(newSpeed)
              engine.setGlideSpeed(newSpeed)
              const newDelay = { time: 0.05 + Math.random() * 0.95, feedback: Math.random() * 0.9, mix: Math.random() }
              setDelayParams(newDelay)
              engine.setDelay(newDelay)
              const newReverb = Math.random()
              setReverbMix(newReverb)
              engine.setReverb({ mix: newReverb })
              const newCrunch = Math.random()
              setCrunch(newCrunch)
              engine.setCrunch(newCrunch)
            }} title="Randomize general controls" />
            <div className="controls__section">
              <label className="controls__label">Filter</label>
              <div className="controls__rotary-row">
                <RotaryKnob value={filterParams.cutoff} min={20} max={20000} step={1} onChange={handleCutoff} color="#ff8c42" label="Cutoff" size={40} />
                <RotaryKnob value={filterParams.resonance} min={0} max={25} step={0.1} onChange={handleResonance} color="#ffd700" label="Res" size={40} />
              </div>
            </div>

            <div className="controls__section controls__section--reverb">
              <label className="controls__label">Reverb <span className="controls__value">{Math.round(reverbMix * 100)}%</span></label>
              <RotaryKnob value={reverbMix} min={0} max={1} step={0.01} onChange={handleReverbMix} color="#00e5cc" size={40} />
            </div>

            <div className="controls__section controls__section--crunch">
              <label className="controls__label">Crunch <span className="controls__value">{Math.round(crunch * 100)}%</span></label>
              <RotaryKnob value={crunch} min={0} max={1} step={0.01} onChange={handleCrunch} color="#ff3366" size={40} />
            </div>

            <div className="controls__section controls__section--full controls__section--delay">
              <label className="controls__label">Delay</label>
              <div className="controls__rotary-row">
                <RotaryKnob value={delayParams.time} min={0.05} max={1} step={0.01} onChange={handleDelayTime} color="#4d8bff" label="Time" size={40} />
                <RotaryKnob value={delayParams.feedback} min={0} max={0.9} step={0.01} onChange={handleDelayFeedback} color="#9b8bff" label="Fdbk" size={40} />
                <RotaryKnob value={delayParams.mix} min={0} max={1} step={0.01} onChange={handleDelayMix} color="#c8d0e0" label="Mix" size={40} />
              </div>
            </div>
            {/* MIDI + wallet + QR — absolute lower-right of console */}
            {(onQRCreate || onConnectMIDI || utilitySlot) && (
              <div className="controls__console-corner">
                {onConnectMIDI && (
                  <button
                    className={`keys-toggle__btn keys-toggle__midi ${midiDevice && midiDevice !== 'no-device' && midiDevice !== 'unsupported' && midiDevice !== 'denied' ? 'active' : ''} ${midiDevice === 'unsupported' || midiDevice === 'denied' ? 'keys-toggle__midi--err' : ''} ${midiDevice === 'no-device' ? 'keys-toggle__midi--waiting' : ''}`}
                    onClick={onConnectMIDI}
                    title={
                      midiDevice === 'unsupported' ? 'MIDI not supported in this browser'
                      : midiDevice === 'denied' ? 'MIDI access denied'
                      : midiDevice === 'no-device' ? 'MIDI enabled — plug in a controller'
                      : midiDevice ? `MIDI: ${midiDevice}`
                      : 'Connect MIDI controller'
                    }
                  >
                    {midiDevice === 'unsupported' ? 'MIDI ✗'
                     : midiDevice === 'denied' ? 'MIDI ✗'
                     : midiDevice === 'no-device' ? 'MIDI …'
                     : midiDevice ? 'MIDI ✓'
                     : 'MIDI'}
                  </button>
                )}
                {utilitySlot}
                {onQRCreate && (
                  <button className="preset-qr-trigger" onClick={onQRCreate} title="Create preset QR code" aria-label="Create preset QR code">
                    &#x25A3;
                  </button>
                )}
              </div>
            )}
          </GoopableSection>
        </div>
      </div>
    </div>
  )
})
