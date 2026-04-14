import { useCallback, useRef, useEffect, useState } from 'react'
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

// Circular SVG bipolar knob — 0=full-left (7-o-clock), 0.5=top (12), 1=full-right (5-o-clock)
// Smooth continuous rotation, no discrete steps
function BipolarKnob({ label, subLabel, value, onChange }) {
  const dragging = useRef(false)
  const startY = useRef(0)
  const startVal = useRef(0)

  // 270° sweep: from -135° (7-o-clock) to +135° (5-o-clock), 0=top (12-o-clock)
  const MIN_DEG = -135
  const MAX_DEG = 135
  const angleDeg = MIN_DEG + value * (MAX_DEG - MIN_DEG)
  const angleRad = (angleDeg * Math.PI) / 180

  // Needle tip at radius 9 from center (SVG viewBox 0 0 28 28, center 14,14)
  const cx = 14, cy = 14, r = 9
  const tipX = cx + r * Math.sin(angleRad)
  const tipY = cy - r * Math.cos(angleRad)

  // Arc path: background track
  const toXY = (deg) => {
    const rad = (deg * Math.PI) / 180
    return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)]
  }
  const [x0, y0] = toXY(MIN_DEG)
  const [x1, y1] = toXY(MAX_DEG)
  const trackPath = `M ${x0} ${y0} A ${r} ${r} 0 1 1 ${x1} ${y1}`

  // Active arc from MIN to current angle
  const sweepSpan = angleDeg - MIN_DEG
  const largeArc = sweepSpan > 180 ? 1 : 0
  const activePath = `M ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${tipX.toFixed(2)} ${tipY.toFixed(2)}`

  const onDown = useCallback((e) => {
    dragging.current = true
    startY.current = e.clientY
    startVal.current = value
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [value])

  const onMove = useCallback((e) => {
    if (!dragging.current) return
    const delta = (startY.current - e.clientY) / 100
    onChange(Math.max(0, Math.min(1, startVal.current + delta)))
  }, [onChange])

  const onUp = useCallback(() => { dragging.current = false }, [])

  const sideLabel = value < 0.45 ? (subLabel?.left ?? 'L') : value > 0.55 ? (subLabel?.right ?? 'R') : '·'

  return (
    <div
      className="ascii-bipolar-knob"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      title={`${label}: drag up/down. Center=neutral, left=${subLabel?.left}, right=${subLabel?.right}`}
    >
      <div className="ascii-bipolar-knob__label">{label}</div>
      <svg className="ascii-bipolar-knob__svg" viewBox="0 0 28 28" width="40" height="40">
        {/* Background track */}
        <path d={trackPath} fill="none" stroke="#1e2240" strokeWidth="2.5" strokeLinecap="round" />
        {/* Active arc */}
        <path d={activePath} fill="none" stroke="#5577cc" strokeWidth="2.5" strokeLinecap="round" />
        {/* Knob body */}
        <circle cx={cx} cy={cy} r="6" fill="#0f1020" stroke="#2a3060" strokeWidth="1" />
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={tipX.toFixed(2)} y2={tipY.toFixed(2)}
          stroke="#88aaff" strokeWidth="1.5" strokeLinecap="round"
        />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="1.2" fill="#5577cc" />
      </svg>
      <div className="ascii-bipolar-knob__side">{sideLabel}</div>
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

  // ── Baked knobs ──────────────────────────────────────────────────────────
  // TONE: 0=GRIT (warm crunch + low filter), 0.5=CLEAN, 1=GLITTER (sparkle resonance)
  const [tone, setTone] = useState(0.5)
  const handleTone = useCallback((v) => {
    setTone(v)
    if (v <= 0.5) {
      // Left: warm saturation — crunch + filter closes down, resonance adds warmth
      const t = (0.5 - v) * 2 // 0 at center, 1 at full left
      setCrunch(t * 0.82)
      setVcfCutoff(20000 - t * 19500) // 20000 → 500 Hz
      setVcfResonance(t * 12)
    } else {
      // Right: glittery sparkle — slight bite + resonant presence peak at high freq
      const t = (v - 0.5) * 2 // 0 at center, 1 at full right
      setCrunch(t * 0.08)           // tiny harmonic bite
      setVcfCutoff(20000 - t * 13000) // 20000 → 7000 Hz (resonant presence)
      setVcfResonance(t * 16)         // high resonance = sparkly singing quality
    }
  }, [setCrunch, setVcfCutoff, setVcfResonance])

  // SPACE: 0=CATHEDRAL (reverb+delay wash), 0.5=DRY, 1=ORBIT (rhythmic delay+tail)
  const [space, setSpace] = useState(0.5)
  const handleSpace = useCallback((v) => {
    setSpace(v)
    if (v <= 0.5) {
      // Left: cathedral — lush reverb bloom with supporting delay wash
      const t = (0.5 - v) * 2
      setReverbMix(t * 0.78)
      setDelayParams({ time: 0.25 + t * 0.15, feedback: 0.2 + t * 0.3, mix: t * 0.35 })
    } else {
      // Right: orbital — rhythmic delay with a reverb halo
      const t = (v - 0.5) * 2
      setReverbMix(t * 0.15)
      setDelayParams({ time: 0.28 + t * 0.22, feedback: 0.3 + t * 0.42, mix: t * 0.7 })
    }
  }, [setReverbMix, setDelayParams])

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

      {/* ── LEFT: Toggles (v2 style: play/arp, mono/poly, hold, stop, bpm, vol) ── */}
      <div className="ascii-panel ascii-panel--toggles">
        <div className="ascii-panel__header">◈</div>
        <div className="ascii-toggle-pair">
          <AsciiButton label="▶ PLAY" active={mode === 'play'} onClick={() => setMode('play')} />
          <AsciiButton label="⟳ ARP"  active={mode === 'arp'}  onClick={() => setMode('arp')} />
        </div>
        <div className="ascii-toggle-pair">
          <AsciiButton label="MONO" active={!poly} onClick={() => setPoly(false)} />
          <AsciiButton label="POLY" active={poly}  onClick={() => setPoly(true)} />
        </div>
        <div className="ascii-toggle-pair">
          <AsciiButton label={hold ? '● HOLD' : '○ HOLD'} active={hold} onClick={() => setHold(h => !h)} />
          <AsciiButton label="■ STOP" onClick={onStop} />
        </div>
        <AsciiSlider label="BPM" value={arpBpm} min={40} max={280} onChange={setArpBpm} width={10} />
        <AsciiSlider label="VOL" value={volume} min={0} max={1} onChange={setVolume} width={10} />
        <button className="ascii-shake-btn" onClick={onShake} title="Shake">⚡</button>
      </div>

      {/* ── CENTER: Oscillators (3 panels, v2 style) ── */}
      <div className="ascii-panel ascii-panel--oscs">
        <div className="ascii-panel__header">≋ OSC</div>
        <div className="ascii-controls__oscs">
          {oscParams.map((p, i) => (
            <OscPanel key={i} index={i} params={p} onChange={par => setOscParam(i, par)} />
          ))}
        </div>
      </div>

      {/* ── RIGHT: FX + Pitch ── */}
      <div className="ascii-panel ascii-panel--fx">
        <div className="ascii-panel__header">⊛ FX / PITCH</div>
        <BipolarKnob
          label="SPACE"
          subLabel={{ left: 'CATHEDRAL', right: 'ORBIT' }}
          value={space}
          onChange={handleSpace}
        />
        <BipolarKnob
          label="TONE"
          subLabel={{ left: 'GRIT', right: 'GLITTER' }}
          value={tone}
          onChange={handleTone}
        />
        <div className="ascii-controls__row">
          <span className="ascii-label">VCF→</span>
          {[0, 1, 2].map(i => (
            <AsciiButton key={i} label={`${i + 1}`} active={vcfRouting[i]}
              onClick={() => setVcfRouting(r => r.map((v, j) => j === i ? !v : v))} />
          ))}
        </div>
        <div className="ascii-pitch-row">
          <AsciiButton label={`OCT ${octaves}`} onClick={() => setOctaves(o => o === 2 ? 3 : o === 3 ? 4 : 2)} />
          <AsciiButton label={stepped ? 'STEP' : 'CONT'} active={stepped} onClick={() => setStepped(s => !s)} />
        </div>
        <div className="ascii-scale-row">
          {Object.keys(allScales).map(s => (
            <AsciiButton key={s} label={SCALE_LABELS[s] || s} active={scale.includes(s)} onClick={() => toggleScale(s)} />
          ))}
        </div>
        <AsciiSlider label="GLIDE" value={glideSpeed} min={0} max={0.1} onChange={setGlideSpeed} width={8} />
      </div>

    </div>
  )
}
