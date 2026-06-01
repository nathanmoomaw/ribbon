/**
 * Ribbon v4 — dual-mode synthesizer
 * Party mode: v2-style 3D spheres with static-electricity arcs
 * Lo mode: v3 ASCII ribbon + orbs
 *
 * Controls: AsciiControls panel + v4-specific overlays
 *   - Mono/Arp toggle (replaces play/arp + mono/poly)
 *   - TEMPO BipolarKnob (BPM left ↔ glide right)
 *   - ž BipolarKnob (FLUTTER left ↔ PHASE right)
 *   - BPM + VOL become AsciiKnobs
 */
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useKeyboard } from './hooks/useKeyboard'
import { useArpeggiator } from './hooks/useArpeggiator'
import { useShake } from './hooks/useShake'
import { use3DVisualizer, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from './hooks/use3DVisualizer'
import { SCALES } from './utils/scales'
import { AsciiRibbon } from './components/AsciiRibbon'
import { AsciiLogo } from './components/AsciiLogo'
import { AsciiOrbs } from './components/AsciiOrbs'
import { Ribbon } from './components/Ribbon'
import { ConfettiCanvas } from './components/ConfettiCanvas'
import { FloatingStaff } from './components/FloatingStaff'
import { RibbonLogo } from './components/RibbonLogo'
import { PresetQR } from './components/PresetQR'
import { VersionSwitcher } from './components/VersionSwitcher'
import { readPresetFromUrl } from './utils/presets'
import { positionToFrequency } from './utils/pitchMap'
import { useAccount } from 'wagmi'
import './V4App.css'
import './TextRibbonApp.css'
import './components/Ribbon.css'
import './components/VersionSwitcher.css'

import { DualKnob } from './components/DualKnob'
import './components/DualKnob.css'

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle']
const WAVE_GLYPHS = { sine: '∿', square: '⊓', sawtooth: '⧸', triangle: '∧' }
const OSC_COLORS = ['#39FF14', '#FFE840', '#FF9030']
const INACTIVITY_TIMEOUT = 37000

function V4OscSection({ oscParams, setOscParams }) {
  const setOscParam = useCallback((i, p) => {
    setOscParams(prev => prev.map((op, idx) => idx === i ? p : op))
  }, [setOscParams])

  return (
    <div className="v4-osc-section">
      {oscParams.map((p, i) => (
        <div key={i} className="v4-osc-panel" style={{ '--osc-color': OSC_COLORS[i] }}>
          <div className="v4-osc-panel__label">OSC{i + 1}</div>
          <div className="v4-osc-waves">
            {WAVEFORMS.map(wf => (
              <button
                key={wf}
                className={`v4-wave-btn${p.waveform === wf ? ' v4-wave-btn--on' : ''}`}
                onClick={() => setOscParam(i, { ...p, waveform: wf })}
                title={wf}
              >{WAVE_GLYPHS[wf]}</button>
            ))}
          </div>
          <DualKnob
            mixValue={p.mix}
            detuneValue={p.detune}
            onMixChange={v => setOscParam(i, { ...p, mix: v })}
            onDetuneChange={v => setOscParam(i, { ...p, detune: v })}
            color={OSC_COLORS[i]}
            size={52}
            minDetune={-50}
            maxDetune={50}
          />
        </div>
      ))}
    </div>
  )
}

function nudge(current, min, max, intensity) {
  const range = max - min
  const delta = (Math.random() - 0.5) * range * 0.3 * intensity
  return Math.max(min, Math.min(max, current + delta))
}

// Inline BipolarKnob (same as AsciiControls internal, duplicated here for v4 overlay)
function BipolarKnob({ label, subLabel, value, onChange }) {
  const dragging = useRef(false)
  const startY = useRef(0)
  const startVal = useRef(0)

  const MIN_DEG = -135
  const MAX_DEG = 135
  const angleDeg = MIN_DEG + value * (MAX_DEG - MIN_DEG)
  const angleRad = (angleDeg * Math.PI) / 180

  const cx = 14, cy = 14, r = 9
  const tipX = cx + r * Math.sin(angleRad)
  const tipY = cy - r * Math.cos(angleRad)

  const toXY = (deg) => {
    const rad = (deg * Math.PI) / 180
    return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)]
  }
  const [x0, y0] = toXY(MIN_DEG)
  const [x1, y1] = toXY(MAX_DEG)
  const trackPath = `M ${x0} ${y0} A ${r} ${r} 0 1 1 ${x1} ${y1}`

  const sweepSpan = angleDeg - MIN_DEG
  const largeArc = sweepSpan > 180 ? 1 : 0
  const activePath = `M ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${tipX.toFixed(2)} ${tipY.toFixed(2)}`

  const onDown = useCallback((e) => {
    dragging.current = true
    startVal.current = value
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [value])

  const onMove = useCallback((e) => {
    if (!dragging.current) return
    const newVal = Math.max(0, Math.min(1, startVal.current - e.movementY / 100))
    startVal.current = newVal
    onChange(newVal)
  }, [onChange])

  const onUp = useCallback(() => { dragging.current = false }, [])

  const sideLabel = value < 0.45 ? (subLabel?.left ?? 'L') : value > 0.55 ? (subLabel?.right ?? 'R') : '·'

  return (
    <div
      className="ascii-bipolar-knob v4-bipolar-knob"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      title={`${label}: drag up/down. Center=neutral, left=${subLabel?.left}, right=${subLabel?.right}`}
    >
      <div className="ascii-bipolar-knob__label">{label}</div>
      <svg className="ascii-bipolar-knob__svg" viewBox="0 0 28 28" width="52" height="52">
        <path d={trackPath} fill="none" stroke="#1e2240" strokeWidth="2.5" strokeLinecap="round" />
        <path d={activePath} fill="none" stroke="#5577cc" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="#0f1020" stroke="#2a3060" strokeWidth="1" />
        <line
          x1={cx} y1={cy}
          x2={tipX.toFixed(2)} y2={tipY.toFixed(2)}
          stroke="#88aaff" strokeWidth="1.5" strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="1.2" fill="#5577cc" />
      </svg>
      <div className="ascii-bipolar-knob__side">{sideLabel}</div>
    </div>
  )
}

// AsciiKnob (vertical drag, same as in AsciiControls)
function AsciiKnob({ label, value, min = 0, max = 1, onChange }) {
  const dragging = useRef(false)
  const startY = useRef(0)
  const startVal = useRef(0)
  const range = max - min
  const norm = (value - min) / range

  const arcChars = ['○', '◔', '◑', '◕', '●']
  const arcIdx = Math.min(4, Math.floor(norm * 5))
  const arc = arcChars[arcIdx]

  const onDown = useCallback((e) => {
    dragging.current = true
    startVal.current = value
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [value])

  const onMove = useCallback((e) => {
    if (!dragging.current) return
    const newVal = Math.max(min, Math.min(max, startVal.current - e.movementY / 100 * range))
    startVal.current = newVal
    onChange(newVal)
  }, [onChange, min, max, range])

  const onUp = useCallback(() => { dragging.current = false }, [])

  const displayVal = Number.isInteger(value) ? value : value.toFixed(2)

  return (
    <div
      className="ascii-knob v4-knob"
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

// Generate a chaotic zigzag arc path — high lateral jitter for electricity feel
function makeArcPoints(cx, cy, angle, len, segments) {
  const pts = []
  const stepLen = len / segments
  let x = cx, y = cy
  const spread = 36  // wider perpendicular jitter (was 18)
  for (let i = 0; i <= segments; i++) {
    const jitter = i === 0 ? 0 : (Math.random() - 0.5) * spread * 2
    const perp = angle + Math.PI / 2
    pts.push(`${(x + Math.cos(perp) * jitter).toFixed(1)},${(y + Math.sin(perp) * jitter).toFixed(1)}`)
    if (i < segments) {
      // Also drift the main direction randomly for extra chaos
      x += Math.cos(angle) * stepLen + (Math.random() - 0.5) * spread * 0.6
      y += Math.sin(angle) * stepLen + (Math.random() - 0.5) * spread * 0.6
    }
  }
  return pts.join(' ')
}

const ARC_COLORS = [
  'rgba(57,255,20,0.75)',     // lime green
  'rgba(255,232,64,0.65)',    // meyer lemon
  'rgba(255,144,48,0.65)',    // orange
  'rgba(255,180,200,0.6)',    // light pink
  'rgba(180,255,100,0.6)',    // yellow-lime
  'rgba(255,255,200,0.55)',   // near-white warm
]

function StaticArcsOverlay() {
  const [arcs, setArcs] = useState(() => generateArcs())

  function generateArcs() {
    const result = []
    // Multiple independent origin points — bolts branch from different locations
    const numOrigins = 2 + Math.floor(Math.random() * 2)  // 2–3 origins
    for (let o = 0; o < numOrigins; o++) {
      // Origins spread across a wider area to match sphere drift
      const cx = 110 + Math.random() * 180  // 110–290
      const cy = 50 + Math.random() * 180   // 50–230
      const arcsFromThis = 2 + Math.floor(Math.random() * 2)  // 2–3 per origin
      for (let i = 0; i < arcsFromThis; i++) {
        const angle = (i / arcsFromThis) * Math.PI * 2 + Math.random() * 1.2
        const len = 130 + Math.random() * 150  // 130–280 (was 80–160)
        const segs = 6 + Math.floor(Math.random() * 5)  // 6–11 segments (was 4–8)
        result.push({
          points: makeArcPoints(cx, cy, angle, len, segs),
          color: ARC_COLORS[result.length % ARC_COLORS.length],
          width: 0.5 + Math.random() * 1.0,
          opacity: Math.random() > 0.18 ? 1 : 0,
        })
      }
    }
    return result
  }

  useEffect(() => {
    let rafId
    let lastUpdate = 0
    function tick(t) {
      rafId = requestAnimationFrame(tick)
      // Regenerate arcs at random intervals 40–120ms — electricity crackle rhythm
      if (t - lastUpdate > 40 + Math.random() * 80) {
        lastUpdate = t
        setArcs(generateArcs())
      }
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div className="v4-static-arcs" aria-hidden="true">
      <svg className="v4-static-arcs__svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
        {arcs.map((arc, i) => (
          <polyline
            key={i}
            points={arc.points}
            fill="none"
            stroke={arc.color}
            strokeWidth={arc.width}
            strokeLinecap="round"
            opacity={arc.opacity}
          />
        ))}
        {arcs.filter((_, i) => i < 3).map((arc, i) => {
          const lastPt = arc.points.split(' ').pop().split(',')
          return (
            <circle
              key={i}
              cx={lastPt[0]}
              cy={lastPt[1]}
              r={1 + Math.random() * 1.5}
              fill={arc.color}
              opacity={arc.opacity * 0.9}
            />
          )
        })}
      </svg>
    </div>
  )
}

const _urlPresetData = readPresetFromUrl()
const _urlPreset = _urlPresetData?.settings ?? null

export default function V4App() {
  const getEngine = useAudioEngine()

  // ── Mode: 'party' (3D spheres) or 'lo' (ASCII) ──
  const [visualMode, setVisualMode] = useState('party')

  // ── Mono/Arp toggle: 'mono' = play+mono, 'arp' = arp+poly ──
  const [monoArp, setMonoArp] = useState('mono')

  // Derived synth mode/poly from monoArp
  const mode = monoArp === 'arp' ? 'arp' : 'play'
  const poly = monoArp === 'arp'

  // Keep setters for AsciiControls compatibility (it expects setMode/setPoly)
  const setMode = useCallback((m) => {
    setMonoArp(m === 'arp' ? 'arp' : 'mono')
  }, [])
  const setPoly = useCallback((p) => {
    setMonoArp(p ? 'arp' : 'mono')
  }, [])

  // ── Core synth state ──
  const [hold, setHold] = useState(_urlPreset?.hold ?? false)
  const [oscParams, setOscParams] = useState(_urlPreset?.oscParams ?? [
    { waveform: 'sawtooth', detune: 0,   mix: 0.8 },
    { waveform: 'square',   detune: 7,   mix: 0.33 },
    { waveform: 'sine',     detune: -5,  mix: 0.66 },
  ])
  const [volume, setVolume] = useState(_urlPreset?.volume ?? 0.5)
  const [octaves, setOctaves] = useState(_urlPreset?.octaves ?? 2)
  const [delayParams, setDelayParams] = useState(_urlPreset?.delayParams ?? { time: 0.45, feedback: 0.65, mix: 0.6 })
  const [reverbMix, setReverbMix] = useState(_urlPreset?.reverbMix ?? 0.7)
  const [crunch, setCrunch] = useState(_urlPreset?.crunch ?? 0)
  const [filterParams, setFilterParams] = useState(_urlPreset?.filterParams ?? { cutoff: 20000, resonance: 0 })
  const [vcfCutoff, setVcfCutoff] = useState(_urlPreset?.vcfCutoff ?? 2000)
  const [vcfResonance, setVcfResonance] = useState(_urlPreset?.vcfResonance ?? 8)
  const [vcfRouting, setVcfRouting] = useState(_urlPreset?.vcfRouting ?? [false, false, false])
  const [glideSpeed, setGlideSpeed] = useState(_urlPreset?.glideSpeed ?? 0.005)
  const [stepped, setStepped] = useState(_urlPreset?.stepped ?? false)
  const [scale, setScale] = useState(_urlPreset?.scale ?? ['chromatic'])
  const [arpBpm, setArpBpm] = useState(_urlPreset?.arpBpm ?? 120)
  const [arpNotes, setArpNotes] = useState(_urlPreset?.arpNotes ?? [])
  const [shaking, setShaking] = useState(false)
  const [doubleHarmonicUnlocked, setDoubleHarmonicUnlocked] = useState(false)
  const [qrSettings, setQrSettings] = useState(null)
  const [space, setSpace] = useState(0.5)
  const [tone, setTone] = useState(0.5)
  const [showInfo, setShowInfo] = useState(false)

  // ── v4-specific: TEMPO bipolar (0=slow BPM+low glide, 0.5=center, 1=fast BPM+high glide) ──
  // Center: BPM=120, glide=0.01
  // Left  → BPM=40,  glide=0.005 (slow)
  // Right → BPM=280, glide=0.08  (fast)
  const [tempo, setTempo] = useState(0.5)

  // ── v4-specific: ž knob (0=flutter, 0.5=neutral, 1=phase) ──
  const [zeta, setZeta] = useState(0.5)
  const zetaRef = useRef(0.5)
  zetaRef.current = zeta

  // ── Inactivity: fade "touch to play" back in after 37s ──
  const [showTouchPrompt, setShowTouchPrompt] = useState(true)
  const lastInteractionRef = useRef(0)
  const inactivityTimerRef = useRef(null)

  const handleInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now()
    setShowTouchPrompt(false)
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    inactivityTimerRef.current = setTimeout(() => {
      setShowTouchPrompt(true)
    }, INACTIVITY_TIMEOUT)
  }, [])

  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    }
  }, [])

  // ── Handle TEMPO knob: drive BPM + glideSpeed ──
  const handleTempo = useCallback((v) => {
    setTempo(v)
    if (v <= 0.5) {
      // Left half: BPM 40–120, glide 0.005–0.01
      const t = v / 0.5  // 0..1
      setArpBpm(Math.round(40 + t * 80))
      setGlideSpeed(0.005 + t * 0.005)
    } else {
      // Right half: BPM 120–280, glide 0.01–0.08
      const t = (v - 0.5) / 0.5  // 0..1
      setArpBpm(Math.round(120 + t * 160))
      setGlideSpeed(0.01 + t * 0.07)
    }
  }, [])

  // ── Handle ž knob: flutter (delay LFO) or phase (reverb tail) ──
  const zetaLfoRef = useRef(null)

  const handleZeta = useCallback((v) => {
    setZeta(v)
    zetaRef.current = v

    // Clear any existing LFO
    if (zetaLfoRef.current) {
      clearInterval(zetaLfoRef.current)
      zetaLfoRef.current = null
    }

    if (v < 0.45) {
      // FLUTTER: modulate delay time at ~8hz between 0.1 and 0.5
      const depth = (0.45 - v) / 0.45  // 0..1 as you go left
      const lfoHz = 8
      const intervalMs = Math.round(1000 / (lfoHz * 4))  // 4 steps per cycle
      let phase = 0
      zetaLfoRef.current = setInterval(() => {
        const swing = Math.sin(phase) * 0.5 * 0.5 + 0.5 * 0.5  // 0.1..0.5 centre on 0.3
        const modTime = 0.1 + swing * depth
        setDelayParams(prev => ({ ...prev, time: parseFloat(modTime.toFixed(3)) }))
        phase += (Math.PI * 2) / 4
      }, intervalMs)
    } else if (v > 0.55) {
      // PHASE: increase reverb mix proportionally
      const depth = (v - 0.55) / 0.45  // 0..1
      setReverbMix(prev => Math.min(1, 0.7 + depth * 0.3))
    } else {
      // Neutral — restore baseline
      setReverbMix(0.7)
    }
  }, [])

  // Cleanup zeta LFO on unmount
  useEffect(() => {
    return () => {
      if (zetaLfoRef.current) clearInterval(zetaLfoRef.current)
    }
  }, [])

  const { address: walletAddress } = useAccount()

  const ribbonInteraction = useRef({ position: null, velocity: 0, active: false })
  const sidebarRef = useRef(null)
  const canvasAreaRef = useRef(null)
  const confettiRef = useRef(null)
  const arpStopRef = useRef(null)
  const lastSpaceRef = useRef(0)
  const visualizerMountRef = useRef(null)

  // Ref mirrors for stable callbacks
  const filterParamsRef = useRef(filterParams)
  const glideSpeedRef = useRef(glideSpeed)
  const delayParamsRef = useRef(delayParams)
  const reverbMixRef = useRef(reverbMix)
  const crunchRef = useRef(crunch)
  const arpBpmRef = useRef(arpBpm)
  const octavesRef = useRef(octaves)
  const steppedRef = useRef(stepped)
  const scaleRef = useRef(scale)
  const modeRef = useRef(mode)
  const polyRef = useRef(poly)
  const holdRef = useRef(hold)

  filterParamsRef.current = filterParams
  glideSpeedRef.current = glideSpeed
  delayParamsRef.current = delayParams
  reverbMixRef.current = reverbMix
  crunchRef.current = crunch
  arpBpmRef.current = arpBpm
  octavesRef.current = octaves
  steppedRef.current = stepped
  scaleRef.current = scale
  modeRef.current = mode
  polyRef.current = poly
  holdRef.current = hold

  // 3D visualizer — party mode spheres
  // Default zoom = 4 ZOOM_STEPs more zoomed out than default
  const { targetZoomRef } = use3DVisualizer(
    visualizerMountRef,
    getEngine,
    ribbonInteraction,
    visualMode,
    reverbMix,
    delayParams,
    oscParams
  )

  // Apply +4 ZOOM_STEP offset on first mount (party mode default)
  const zoomInitialized = useRef(false)
  useEffect(() => {
    if (!zoomInitialized.current && targetZoomRef?.current != null) {
      targetZoomRef.current = Math.min(MAX_ZOOM, targetZoomRef.current + 4 * ZOOM_STEP)
      zoomInitialized.current = true
    }
  }, [targetZoomRef])

  // Apply URL preset on mount
  useEffect(() => {
    if (!_urlPreset) return
    const engine = getEngine()
    _urlPreset.oscParams?.forEach((p, i) => {
      engine.setWaveform(p.waveform, i)
      engine.setOscMix(i, p.mix)
      engine.setOscDetune(i, p.detune)
    })
    engine.setVolume(_urlPreset.volume)
    engine.setDelay(_urlPreset.delayParams)
    engine.setReverb({ mix: _urlPreset.reverbMix })
    engine.setCrunch(_urlPreset.crunch)
    engine.setFilter(_urlPreset.filterParams)
    engine.setGlideSpeed(_urlPreset.glideSpeed)
    if (_urlPreset.vcfCutoff != null) {
      engine.setVcfCutoff(_urlPreset.vcfCutoff)
      engine.setVcfResonance(_urlPreset.vcfResonance)
      _urlPreset.vcfRouting?.forEach((on, i) => engine.setVcfRouting(i, on))
    }
    if (window.location.hash) history.replaceState(null, '', window.location.pathname)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync audio engine when parameters change
  useEffect(() => { getEngine().setVolume(volume) }, [volume, getEngine])
  useEffect(() => { getEngine().setDelay(delayParams) }, [delayParams, getEngine])
  useEffect(() => { getEngine().setReverb({ mix: reverbMix }) }, [reverbMix, getEngine])
  useEffect(() => { getEngine().setCrunch(crunch) }, [crunch, getEngine])
  useEffect(() => { getEngine().setFilter(filterParams) }, [filterParams, getEngine])
  useEffect(() => { getEngine().setGlideSpeed(glideSpeed) }, [glideSpeed, getEngine])
  useEffect(() => { getEngine().setVcfCutoff(vcfCutoff) }, [vcfCutoff, getEngine])
  useEffect(() => { getEngine().setVcfResonance(vcfResonance) }, [vcfResonance, getEngine])
  useEffect(() => {
    vcfRouting.forEach((on, i) => getEngine().setVcfRouting(i, on))
  }, [vcfRouting, getEngine])
  useEffect(() => {
    oscParams.forEach((p, i) => {
      getEngine().setWaveform(p.waveform, i)
      getEngine().setOscMix(i, p.mix)
      getEngine().setOscDetune(i, p.detune)
    })
  }, [oscParams, getEngine])

  const spawnConfetti = useCallback((x, y) => {
    if (!confettiRef.current) return
    confettiRef.current.spawn(x, y, { count: 48, speed: 5.5 })
  }, [])

  const spawnNote = useCallback((x, y, noteName) => {
    if (!confettiRef.current) return
    confettiRef.current.spawnNote(x, y, noteName)
  }, [])

  const handleOpenQR = useCallback(() => {
    setQrSettings({
      mode,
      poly,
      hold,
      oscParams,
      volume,
      octaves,
      delayParams,
      reverbMix,
      crunch,
      filterParams: { cutoff: 20000, resonance: 0 },
      glideSpeed,
      stepped,
      scale,
      arpBpm,
      arpNotes,
      vcfCutoff,
      vcfResonance,
      vcfRouting,
      walletAddress,
    })
  }, [mode, poly, hold, oscParams, volume, octaves, delayParams, reverbMix, crunch,
    glideSpeed, stepped, scale, arpBpm, arpNotes, vcfCutoff, vcfResonance, vcfRouting, walletAddress])

  // TONE
  const handleTone = useCallback((v) => {
    setTone(v)
    if (v <= 0.5) {
      const t = (0.5 - v) * 2
      setCrunch(t * 0.82)
      setVcfCutoff(20000 - t * 19500)
      setVcfResonance(t * 12)
    } else {
      const t = (v - 0.5) * 2
      setCrunch(t * 0.08)
      setVcfCutoff(20000 - t * 13000)
      setVcfResonance(t * 16)
    }
  }, [])

  // SPACE
  const handleSpace = useCallback((v) => {
    setSpace(v)
    if (v <= 0.5) {
      const t = (0.5 - v) * 2
      setReverbMix(t * 0.78)
      setDelayParams({ time: 0.25 + t * 0.15, feedback: 0.2 + t * 0.3, mix: t * 0.35 })
    } else {
      const t = (v - 0.5) * 2
      setReverbMix(t * 0.15)
      setDelayParams({ time: 0.28 + t * 0.22, feedback: 0.3 + t * 0.42, mix: t * 0.7 })
    }
  }, [])

  const shakeNoiseBurst = useCallback((intensity) => {
    const engine = getEngine()
    const nx = Math.random()
    const hz = positionToFrequency(nx, { octaves: 2, scale: ['chromatic'] })
    const id = `shake_${Date.now()}`
    engine.voiceOn(id, hz, 0.3 + Math.random() * 0.5 * intensity)
    const duration = 80 + intensity * 120
    setTimeout(() => engine.voiceOff(id), duration)
  }, [getEngine])

  const handleShake = useCallback((intensity = 1) => {
    setShaking(true)
    setTimeout(() => setShaking(false), 300)
    shakeNoiseBurst(intensity)
    if (confettiRef.current) {
      const burstCount = 2 + Math.floor(Math.random() * 3)
      for (let i = 0; i < burstCount; i++) {
        const x = 0.1 * window.innerWidth + Math.random() * 0.8 * window.innerWidth
        const y = 0.2 * window.innerHeight + Math.random() * 0.6 * window.innerHeight
        confettiRef.current.spawn(x, y, { count: 8 + Math.floor(Math.random() * 10), speed: 4 + Math.random() * 5 * intensity })
      }
    }

    setOscParams(prev => prev.map(p => ({
      ...p,
      waveform: WAVEFORMS[Math.floor(Math.random() * WAVEFORMS.length)],
      detune: Math.round(nudge(p.detune, -50, 50, intensity)),
      mix: Math.round(nudge(p.mix, 0, 1, intensity) * 100) / 100,
    })))
    setOctaves(() => {
      const opts = [2, 3, 4]
      return opts[Math.floor(Math.random() * opts.length)]
    })

    handleSpace(Math.random())
    handleTone(Math.random())

    const scaleKeys = Object.keys(SCALES)
    setScale([scaleKeys[Math.floor(Math.random() * scaleKeys.length)]])
    setVcfRouting([Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5])

    if (Math.random() < 0.03) {
      setDoubleHarmonicUnlocked(true)
    }
  }, [shakeNoiseBurst, handleSpace, handleTone])

  useShake(handleShake, sidebarRef, canvasAreaRef)

  const keyHandlers = useMemo(() => ({
    Space: () => {
      const now = Date.now()
      const elapsed = now - lastSpaceRef.current
      lastSpaceRef.current = now
      if (elapsed < 400) {
        getEngine().killAllSound?.() ?? getEngine().allNotesOff()
      } else {
        getEngine().allNotesOff()
      }
      setHold(false)
      setArpNotes([])
      arpStopRef.current?.()
    },
    Digit1: () => setMonoArp('mono'),
    Digit2: () => setMonoArp('arp'),
    Digit4: () => setHold(h => !h),
  }), [getEngine])

  useKeyboard(keyHandlers)

  const { arpStart, arpStop } = useArpeggiator(getEngine, mode, arpBpm, arpNotes, hold)
  arpStopRef.current = arpStop

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

  const handleStop = useCallback(() => {
    getEngine().allNotesOff()
    setHold(false)
    setArpNotes([])
    arpStop()
  }, [getEngine, arpStop])

  const handleVcfRoutingToggle = useCallback((index, enabled) => {
    setVcfRouting(prev => {
      const next = [...prev]
      next[index] = enabled
      return next
    })
  }, [])

  const isParty = visualMode === 'party'

  return (
    <div className={`v4-app text-ribbon-app v4-mode--${visualMode}`}>
      <ConfettiCanvas ref={confettiRef} />

      {/* Background layers */}
      <div className="text-ribbon-bg" />
      <div className="text-ribbon-grid-floor" />
      {isParty && <FloatingStaff />}

      {/* Header */}
      <header className="text-ribbon-header">
        <div className="text-ribbon-header__left">
          <button
            className="header-qr-btn"
            onClick={handleOpenQR}
            title="Share preset (QR code)"
            aria-label="QR code"
          >[QR]</button>
          <span className="version-status-sep">·</span>
          <VersionSwitcher current={4} />
          <span className="version-status-sep">·</span>
          <div className="text-ribbon-header__status">
            <span className={`status-dot${shaking ? ' status-dot--shake' : ''}`}>◈</span>
            <span className="status-mode">[{mode.toUpperCase()}]</span>
            {hold && <span className="status-hold">HOLD</span>}
            {poly && <span className="status-poly">POLY</span>}
          </div>
          <span className="version-status-sep">·</span>
          <span className="v4-info-anchor">
            <button
              className="header-qr-btn"
              onClick={() => setShowInfo(v => !v)}
              title="Build info"
              aria-label="Info"
            >[i]</button>
            {showInfo && (
              <div className="v4-info-overlay">
                <div className="v4-info-overlay__line">ribbon v4</div>
                <div className="v4-info-overlay__line">commit: {typeof __BUILD_COMMIT__ !== 'undefined' ? __BUILD_COMMIT__ : 'dev'}</div>
                <div className="v4-info-overlay__line">branch: dev/v4</div>
              </div>
            )}
          </span>
        </div>
        {isParty
          ? <div onClick={() => handleShake(1.5)} style={{ cursor: 'pointer' }}><RibbonLogo /></div>
          : <AsciiLogo onClick={() => handleShake(1.5)} />
        }
        <div className="text-ribbon-header__right">
          {/* Party / Lo toggle */}
          <div className="v4-mode-toggle">
            <button
              className={`v4-mode-btn${isParty ? ' v4-mode-btn--on' : ''}`}
              onClick={() => setVisualMode('party')}
            >PARTY</button>
            <button
              className={`v4-mode-btn${!isParty ? ' v4-mode-btn--on' : ''}`}
              onClick={() => setVisualMode('lo')}
            >LO</button>
          </div>
          <button
            className="header-shake-btn"
            onClick={() => handleShake(1)}
            title="Shake (randomize)"
            aria-label="Shake"
          >⚡</button>
        </div>
      </header>

      {/* QR preset modal */}
      {qrSettings && (
        <PresetQR
          settings={qrSettings}
          onClose={() => setQrSettings(null)}
          asciiMode={!isParty}
          citrusPalette={true}
        />
      )}

      <main className="text-ribbon-main">
        {/* Visualizer / orbs area */}
        <section className="text-ribbon-orbs v4-orbs" aria-label="Visualizer">
          {/* Always mounted so Three.js canvas survives party↔lo mode switches */}
          <div
            className="v4-party-vis"
            ref={visualizerMountRef}
            style={{ display: isParty ? undefined : 'none' }}
          >
            {isParty && <StaticArcsOverlay />}
          </div>
          {!isParty && <AsciiOrbs oscParams={oscParams} shaking={shaking} />}
        </section>

        {/* Ribbon strip */}
        <section
          className={`text-ribbon-strip${isParty ? ' v4-ribbon-strip--party' : ''}`}
          ref={canvasAreaRef}
          onPointerDown={handleInteraction}
        >
          {isParty ? (
            <Ribbon
              getEngine={getEngine}
              mode={mode}
              octaves={octaves}
              stepped={stepped}
              scale={scale}
              ribbonInteraction={ribbonInteraction}
              arpStart={arpStart}
              arpStop={arpStop}
              hold={hold}
              poly={poly}
              shaking={shaking}
              onArpNoteToggle={handleArpNoteToggle}
              arpNotes={arpNotes}
            />
          ) : (
            <AsciiRibbon
              getEngine={getEngine}
              mode={mode}
              octaves={octaves}
              stepped={stepped}
              scale={scale}
              ribbonInteraction={ribbonInteraction}
              arpStart={arpStart}
              arpStop={arpStop}
              hold={hold}
              poly={poly}
              shaking={shaking}
              onArpNoteToggle={handleArpNoteToggle}
              arpNotes={arpNotes}
              oscParams={oscParams}
              onSpawnConfetti={spawnConfetti}
              onSpawnNote={spawnNote}
            />
          )}
          {showTouchPrompt && (
            <div className="v4-touch-prompt">touch to play</div>
          )}
        </section>

        {/* Controls — same compact layout for both party and lo mode */}
        <section className="text-ribbon-controls v4-controls" ref={sidebarRef}>
          <div className="v4-party-controls">
            <div className="v4-party-bar">
              <div className="v4-mono-arp">
                <button
                  className={`v4-toggle-btn${monoArp === 'mono' ? ' v4-toggle-btn--on' : ''}`}
                  onClick={() => setMonoArp('mono')}
                >MONO</button>
                <button
                  className={`v4-toggle-btn${monoArp === 'arp' ? ' v4-toggle-btn--on' : ''}`}
                  onClick={() => setMonoArp('arp')}
                >ARP</button>
              </div>
              <button
                className={`v4-toggle-btn${hold ? ' v4-toggle-btn--on' : ''}`}
                onClick={() => setHold(h => !h)}
              >HOLD</button>
              <button className="v4-toggle-btn" onClick={handleStop}>STOP</button>
              <span className="v4-bar-sep">|</span>
              <div className="v4-knob-group">
                <div className="v4-knob-group__label">TEMPO</div>
                <DualKnob
                  mode="single"
                  mixValue={tempo}
                  onMixChange={handleTempo}
                  mixLabel={`${arpBpm}`}
                  color="#FFE840"
                  size={52}
                />
              </div>
              <div className="v4-knob-group">
                <div className="v4-knob-group__label">ž</div>
                <DualKnob
                  mode="single"
                  mixValue={zeta}
                  onMixChange={handleZeta}
                  color="#FFB4C8"
                  size={52}
                />
              </div>
              <span className="v4-bar-sep">|</span>
              <div className="v4-knob-group">
                <div className="v4-knob-group__label">VOL</div>
                <DualKnob
                  mode="single"
                  mixValue={volume}
                  onMixChange={setVolume}
                  mixLabel={`${Math.round(volume * 100)}%`}
                  color="#39FF14"
                  size={52}
                />
              </div>
              <span className="v4-bar-sep">|</span>
              <div className="v4-octave-btns">
                {[1,2,3,4].map(n => (
                  <button
                    key={n}
                    className={`v4-toggle-btn${octaves === n ? ' v4-toggle-btn--on' : ''}`}
                    onClick={() => setOctaves(n)}
                  >{n}</button>
                ))}
              </div>
              <span className="v4-bar-sep">|</span>
              <V4OscSection oscParams={oscParams} setOscParams={setOscParams} />
              <span className="v4-bar-sep">|</span>
              {/* SPACE + TONE + VCF — inline with OSCs */}
              <div className="v4-knob-group">
                <div className="v4-knob-group__label">SPACE</div>
                <DualKnob
                  mode="single"
                  mixValue={space}
                  onMixChange={handleSpace}
                  color="#FFB4C8"
                  size={52}
                />
              </div>
              <div className="v4-knob-group">
                <div className="v4-knob-group__label">TONE</div>
                <DualKnob
                  mode="single"
                  mixValue={tone}
                  onMixChange={handleTone}
                  color="#FF9030"
                  size={52}
                />
              </div>
              <span className="v4-bar-sep">|</span>
              <div className="v4-knob-group">
                <div className="v4-knob-group__label">CUT</div>
                <DualKnob
                  mode="single"
                  mixValue={(vcfCutoff - 20) / 19980}
                  onMixChange={v => setVcfCutoff(Math.round(20 + v * 19980))}
                  mixLabel={vcfCutoff >= 1000 ? `${(vcfCutoff / 1000).toFixed(1)}k` : `${vcfCutoff}`}
                  color="#FFE840"
                  size={52}
                />
              </div>
              <div className="v4-knob-group">
                <div className="v4-knob-group__label">RES</div>
                <DualKnob
                  mode="single"
                  mixValue={vcfResonance / 20}
                  onMixChange={v => setVcfResonance(parseFloat((v * 20).toFixed(1)))}
                  mixLabel={`${vcfResonance.toFixed(1)}`}
                  color="#FF9030"
                  size={52}
                />
              </div>
              <div className="v4-vcf-group">
                <span className="v4-knob-group__label">VCF</span>
                <div className="v4-vcf-btns">
                  {[0,1,2].map(i => (
                    <button
                      key={i}
                      className={`v4-toggle-btn${vcfRouting[i] ? ' v4-toggle-btn--on' : ''}`}
                      onClick={() => handleVcfRoutingToggle(i, !vcfRouting[i])}
                    >{i+1}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
