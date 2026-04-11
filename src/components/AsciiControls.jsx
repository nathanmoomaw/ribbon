import { useCallback, useRef, useEffect } from 'react'
import { SCALES, SCALE_LABELS, HIDDEN_SCALES } from '../utils/scales'
import './AsciiControls.css'

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle']
const WAVE_GLYPHS = { sine: '∿', square: '⊓', sawtooth: '⧸', triangle: '∧' }

function AsciiButton({ label, active, onClick, disabled, glyph }) {
  return (
    <button
      className={`ascii-btn${active ? ' ascii-btn--on' : ''}${disabled ? ' ascii-btn--disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {glyph && <span className="ascii-btn__glyph">{glyph}</span>}
      <span className="ascii-btn__label">{label}</span>
    </button>
  )
}

// ASCII slider — horizontal bar with block chars
function AsciiSlider({ label, value, min = 0, max = 1, onChange, width = 16, unit = '' }) {
  const filled = Math.round((value - min) / (max - min) * width)
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled)
  const trackRef = useRef(null)
  const dragging = useRef(false)

  const getVal = useCallback((e) => {
    const rect = trackRef.current.getBoundingClientRect()
    return min + Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * (max - min)
  }, [min, max])

  const onDown = useCallback((e) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    onChange(getVal(e))
  }, [onChange, getVal])

  const onMove = useCallback((e) => {
    if (!dragging.current) return
    onChange(getVal(e))
  }, [onChange, getVal])

  const onUp = useCallback(() => { dragging.current = false }, [])

  const displayVal = Number.isInteger(value) ? value : value.toFixed(2)

  return (
    <div className="ascii-slider">
      <span className="ascii-slider__label">{label}</span>
      <span
        ref={trackRef}
        className="ascii-slider__track"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {bar}
      </span>
      <span className="ascii-slider__val">{displayVal}{unit}</span>
    </div>
  )
}

// ASCII rotary — just a value display with up/down drag
function AsciiKnob({ label, value, min = 0, max = 1, onChange }) {
  const dragging = useRef(false)
  const startY = useRef(0)
  const startVal = useRef(0)
  const range = max - min
  const norm = (value - min) / range

  // ASCII arc representation
  const arcChars = ['○', '◔', '◑', '◕', '●']
  const arcIdx = Math.min(4, Math.floor(norm * 5))
  const arc = arcChars[arcIdx]

  const onDown = useCallback((e) => {
    dragging.current = true
    startY.current = e.clientY
    startVal.current = value
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [value])

  const onMove = useCallback((e) => {
    if (!dragging.current) return
    const delta = (startY.current - e.clientY) / 100
    const newVal = Math.max(min, Math.min(max, startVal.current + delta * range))
    onChange(newVal)
  }, [onChange, min, max, range])

  const onUp = useCallback(() => { dragging.current = false }, [])

  const displayVal = Number.isInteger(value) ? value : value.toFixed(2)

  return (
    <div
      className="ascii-knob"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="ascii-knob__arc">{arc}</div>
      <div className="ascii-knob__label">{label}</div>
      <div className="ascii-knob__val">{displayVal}</div>
    </div>
  )
}

function OscPanel({ index, params, onChange }) {
  const colors = ['#ff4080', '#40ff80', '#4080ff']
  const color = colors[index]
  const label = `OSC${index + 1}`

  const setWaveform = useCallback((wf) => {
    onChange({ ...params, waveform: wf })
  }, [params, onChange])

  return (
    <div className="ascii-osc" style={{ '--osc-color': color }}>
      <div className="ascii-box-header">{label}</div>
      <div className="ascii-osc__waves">
        {WAVEFORMS.map(wf => (
          <button
            key={wf}
            className={`ascii-wave-btn${params.waveform === wf ? ' ascii-wave-btn--on' : ''}`}
            onClick={() => setWaveform(wf)}
            title={wf}
          >
            {WAVE_GLYPHS[wf]}
          </button>
        ))}
      </div>
      <AsciiKnob
        label="MIX"
        value={params.mix}
        min={0}
        max={1}
        onChange={v => onChange({ ...params, mix: v })}
      />
      <AsciiKnob
        label="DET"
        value={params.detune}
        min={-50}
        max={50}
        onChange={v => onChange({ ...params, detune: v })}
      />
    </div>
  )
}

export function AsciiControls({
  mode, setMode,
  poly, setPoly,
  hold, setHold,
  arpBpm, setArpBpm,
  volume, setVolume,
  octaves, setOctaves,
  scale, setScale,
  glideSpeed, setGlideSpeed,
  stepped, setStepped,
  oscParams, setOscParams,
  delayParams, setDelayParams,
  reverbMix, setReverbMix,
  crunch, setCrunch,
  vcfCutoff, setVcfCutoff,
  vcfResonance, setVcfResonance,
  vcfRouting, setVcfRouting,
  onStop, onShake,
  doubleHarmonicUnlocked,
}) {
  const allScales = { ...SCALES, ...(doubleHarmonicUnlocked ? HIDDEN_SCALES : {}) }

  const toggleScale = useCallback((s) => {
    setScale(prev => {
      if (prev.includes(s)) {
        const next = prev.filter(x => x !== s)
        return next.length === 0 ? ['chromatic'] : next
      }
      return [...prev, s]
    })
  }, [setScale])

  const setOscParam = useCallback((i, p) => {
    setOscParams(prev => prev.map((op, idx) => idx === i ? p : op))
  }, [setOscParams])

  return (
    <div className="ascii-controls">

      {/* ── Transport ── */}
      <div className="ascii-box">
        <div className="ascii-box-header">◈ TRANSPORT</div>
        <div className="ascii-controls__row">
          <AsciiButton
            label="PLAY"
            glyph={mode === 'play' ? '▶' : ' '}
            active={mode === 'play'}
            onClick={() => setMode('play')}
          />
          <AsciiButton
            label="ARP"
            glyph={mode === 'arp' ? '⟳' : ' '}
            active={mode === 'arp'}
            onClick={() => setMode('arp')}
          />
        </div>
        <div className="ascii-controls__row">
          <AsciiButton
            label="MONO"
            active={!poly}
            onClick={() => setPoly(false)}
          />
          <AsciiButton
            label="POLY"
            active={poly}
            onClick={() => setPoly(true)}
          />
        </div>
        <div className="ascii-controls__row">
          <AsciiButton
            label={`HOLD${hold ? ' ●' : ' ○'}`}
            active={hold}
            onClick={() => setHold(h => !h)}
          />
          <AsciiButton label="STOP" onClick={onStop} />
        </div>
        <AsciiSlider
          label="BPM"
          value={arpBpm}
          min={40}
          max={280}
          onChange={setArpBpm}
          width={12}
        />
        <AsciiSlider
          label="VOL"
          value={volume}
          min={0}
          max={1}
          onChange={setVolume}
          width={12}
        />
      </div>

      {/* ── Oscillators ── */}
      <div className="ascii-box">
        <div className="ascii-box-header">≋ OSCILLATORS</div>
        <div className="ascii-controls__oscs">
          {oscParams.map((p, i) => (
            <OscPanel
              key={i}
              index={i}
              params={p}
              onChange={par => setOscParam(i, par)}
            />
          ))}
        </div>
      </div>

      {/* ── Pitch ── */}
      <div className="ascii-box">
        <div className="ascii-box-header">♩ PITCH</div>
        <div className="ascii-controls__row ascii-controls__row--wrap">
          <AsciiButton
            label={`OCT: ${octaves}`}
            onClick={() => setOctaves(o => o === 2 ? 3 : o === 3 ? 4 : 2)}
          />
          <AsciiButton
            label={`STEP: ${stepped ? 'ON' : 'OFF'}`}
            active={stepped}
            onClick={() => setStepped(s => !s)}
          />
        </div>
        <div className="ascii-controls__row ascii-controls__row--wrap">
          <span className="ascii-label">SCALE:</span>
          {Object.keys(allScales).map(s => (
            <AsciiButton
              key={s}
              label={SCALE_LABELS[s] || s}
              active={scale.includes(s)}
              onClick={() => toggleScale(s)}
            />
          ))}
        </div>
        <AsciiSlider
          label="GLIDE"
          value={glideSpeed}
          min={0}
          max={0.1}
          onChange={setGlideSpeed}
          width={10}
        />
      </div>

      {/* ── FX ── */}
      <div className="ascii-box">
        <div className="ascii-box-header">⊛ EFFECTS</div>
        <AsciiSlider label="DLY" value={delayParams.time} min={0} max={1} onChange={v => setDelayParams(d => ({ ...d, time: v }))} width={10} />
        <AsciiSlider label="DFB" value={delayParams.feedback} min={0} max={0.9} onChange={v => setDelayParams(d => ({ ...d, feedback: v }))} width={10} />
        <AsciiSlider label="DMX" value={delayParams.mix} min={0} max={1} onChange={v => setDelayParams(d => ({ ...d, mix: v }))} width={10} />
        <AsciiSlider label="REV" value={reverbMix} min={0} max={1} onChange={setReverbMix} width={10} />
        <AsciiSlider label="CRN" value={crunch} min={0} max={1} onChange={setCrunch} width={10} />
      </div>

      {/* ── VCF ── */}
      <div className="ascii-box">
        <div className="ascii-box-header">⌖ VCF</div>
        <AsciiSlider
          label="CUT"
          value={vcfCutoff}
          min={20}
          max={20000}
          onChange={setVcfCutoff}
          width={10}
        />
        <AsciiSlider
          label="RES"
          value={vcfResonance}
          min={0}
          max={30}
          onChange={setVcfResonance}
          width={10}
        />
        <div className="ascii-controls__row">
          <span className="ascii-label">OSC:</span>
          {[0, 1, 2].map(i => (
            <AsciiButton
              key={i}
              label={`${i + 1}`}
              active={vcfRouting[i]}
              onClick={() => setVcfRouting(r => r.map((v, j) => j === i ? !v : v))}
            />
          ))}
        </div>
      </div>

      {/* ── Shake ── */}
      <div className="ascii-box">
        <div className="ascii-box-header">⚡ ACTIONS</div>
        <AsciiButton label="⟳ SHAKE" onClick={onShake} />
      </div>
    </div>
  )
}
