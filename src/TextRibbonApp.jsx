/**
 * Text Ribbon — v3 "text ribbon"
 * Same audio engine as ribbon v2 (puddle), visual layer replaced with
 * ASCII art rendered via canvas + @chenglou/pretext for glyph measurement.
 */
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useKeyboard } from './hooks/useKeyboard'
import { useArpeggiator } from './hooks/useArpeggiator'
import { useShake } from './hooks/useShake'
import { SCALES, HIDDEN_SCALES } from './utils/scales'
import { AsciiRibbon } from './components/AsciiRibbon'
import { AsciiControls } from './components/AsciiControls'
import { AsciiLogo } from './components/AsciiLogo'
import { AsciiOrbs } from './components/AsciiOrbs'
import { ConfettiCanvas } from './components/ConfettiCanvas'
import { FloatingStaff } from './components/FloatingStaff'
import { readPresetFromUrl, buildPresetUrl } from './utils/presets'
import { positionToFrequency } from './utils/pitchMap'
import { PresetQR } from './components/PresetQR'
import { WalletButton } from './components/WalletButton'
import { VersionSwitcher } from './components/VersionSwitcher'
import { useAccount } from 'wagmi'
import './TextRibbonApp.css'
import './components/VersionSwitcher.css'

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle']

function nudge(current, min, max, intensity) {
  const range = max - min
  const delta = (Math.random() - 0.5) * range * 0.3 * intensity
  return Math.max(min, Math.min(max, current + delta))
}

const _urlPresetData = readPresetFromUrl()
const _urlPreset = _urlPresetData?.settings ?? null

export default function TextRibbonApp() {
  const getEngine = useAudioEngine()

  // Core synth state — mirrors ribbon v2
  const [mode, setMode] = useState(_urlPreset?.mode ?? 'play')
  const [poly, setPoly] = useState(_urlPreset?.poly ?? false)
  const [hold, setHold] = useState(_urlPreset?.hold ?? false)
  const [oscParams, setOscParams] = useState(_urlPreset?.oscParams ?? [
    { waveform: 'sawtooth', detune: 0,   mix: 0.8 },
    { waveform: 'square',   detune: 7,   mix: 0.5 },
    { waveform: 'sine',     detune: -5,  mix: 0.35 },
  ])
  const [volume, setVolume] = useState(_urlPreset?.volume ?? 0.5)
  const [octaves, setOctaves] = useState(_urlPreset?.octaves ?? 2)
  const [delayParams, setDelayParams] = useState(_urlPreset?.delayParams ?? { time: 0.3, feedback: 0.4, mix: 0 })
  const [reverbMix, setReverbMix] = useState(_urlPreset?.reverbMix ?? 0)
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

  const { address: walletAddress } = useAccount()

  const ribbonInteraction = useRef({ position: null, velocity: 0, active: false })
  const sidebarRef = useRef(null)
  const canvasAreaRef = useRef(null)
  const confettiRef = useRef(null)
  const arpStopRef = useRef(null)
  const lastSpaceRef = useRef(0)

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

  // AsciiRibbon already converts to viewport coords — just forward to confetti overlay
  const spawnConfetti = useCallback((x, y) => {
    if (!confettiRef.current) return
    confettiRef.current.spawn(x, y, { count: 48, speed: 5.5 })
  }, [])

  const spawnNote = useCallback((x, y, noteName) => {
    if (!confettiRef.current) return
    confettiRef.current.spawnNote(x, y, noteName)
  }, [])

  // Gather current settings for QR preset URL
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

  // TONE: 0=GRIT (warm crunch + low filter), 0.5=CLEAN, 1=GLITTER (sparkle resonance)
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
  }, [setCrunch, setVcfCutoff, setVcfResonance])

  // SPACE: 0=CATHEDRAL (reverb+delay wash), 0.5=DRY, 1=ORBIT (rhythmic delay+tail)
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
  }, [setReverbMix, setDelayParams])

  // Shake noise burst — play a single random note then release
  const shakeNoiseBurst = useCallback((intensity) => {
    const engine = getEngine()
    const nx = Math.random()
    const hz = positionToFrequency(nx, { octaves: 2, scale: ['chromatic'] })
    const id = `shake_${Date.now()}`
    engine.voiceOn(id, hz, 0.3 + Math.random() * 0.5 * intensity)
    const duration = 80 + intensity * 120
    setTimeout(() => engine.voiceOff(id), duration)
  }, [getEngine])

  // Shake
  const handleShake = useCallback((intensity = 1) => {
    setShaking(true)
    setTimeout(() => setShaking(false), 300)
    shakeNoiseBurst(intensity)
    // Confetti: 2-4 clustered bursts at organic positions, varied sizes
    if (confettiRef.current) {
      const burstCount = 2 + Math.floor(Math.random() * 3)
      for (let i = 0; i < burstCount; i++) {
        // Bias toward mid-screen vertically, spread across full width
        const x = 0.1 * window.innerWidth + Math.random() * 0.8 * window.innerWidth
        const y = 0.2 * window.innerHeight + Math.random() * 0.6 * window.innerHeight
        confettiRef.current.spawn(x, y, { count: 8 + Math.floor(Math.random() * 10), speed: 4 + Math.random() * 5 * intensity })
      }
    }

    setOscParams(prev => prev.map(p => ({
      ...p,
      waveform: WAVEFORMS[Math.floor(Math.random() * WAVEFORMS.length)],
      detune: nudge(p.detune, -50, 50, intensity),
      mix: nudge(p.mix, 0, 1, intensity),
    })))
    setOctaves(() => {
      const opts = [2, 3, 4]
      return opts[Math.floor(Math.random() * opts.length)]
    })

    // Randomize space and tone knobs (drives reverb/delay/crunch/vcf)
    handleSpace(Math.random())
    handleTone(Math.random())

    // Randomize scale — pick one random scale from available
    const scaleKeys = Object.keys(SCALES)
    setScale([scaleKeys[Math.floor(Math.random() * scaleKeys.length)]])

    // Randomize vcf routing — random on/off per osc
    setVcfRouting([Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5])

    // Easter egg: unlock double harmonic scale
    if (Math.random() < 0.03) {
      setDoubleHarmonicUnlocked(true)
    }
  }, [shakeNoiseBurst, handleSpace, handleTone])

  // Pass sidebar + canvas refs so clicks inside them don't trigger the "click outside" shake
  useShake(handleShake, sidebarRef, canvasAreaRef)

  // Keyboard shortcuts
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
    Digit1: () => setMode('play'),
    Digit2: () => setMode('arp'),
    Digit3: () => setPoly(p => !p),
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

  return (
    <div className="text-ribbon-app">
      {/* Full-screen confetti overlay */}
      <ConfettiCanvas ref={confettiRef} />

      {/* Background layers matching ribbon aesthetic */}
      <div className="text-ribbon-bg" />
      <div className="text-ribbon-grid-floor" />
      {/* Floating ASCII staff notation */}
      <FloatingStaff />

      <header className="text-ribbon-header">
        <div className="text-ribbon-header__left">
          <button
            className="header-qr-btn"
            onClick={handleOpenQR}
            title="Share preset (QR code)"
            aria-label="QR code"
          >[QR]</button>
          <span className="version-status-sep">·</span>
          <VersionSwitcher current={3} />
          <span className="version-status-sep">·</span>
          <div className="text-ribbon-header__status">
            <span className={`status-dot${shaking ? ' status-dot--shake' : ''}`}>◈</span>
            <span className="status-mode">[{mode.toUpperCase()}]</span>
            {hold && <span className="status-hold">HOLD</span>}
            {poly && <span className="status-poly">POLY</span>}
          </div>
        </div>
        <AsciiLogo onClick={() => handleShake(1.5)} />
        <div className="text-ribbon-header__right">
          <WalletButton flagSet={false} onForget={() => {}} />
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
        />
      )}

      <main className="text-ribbon-main">
        {/* Oscillator sphere visualizers — ribbon v2 style */}
        <section className="text-ribbon-orbs">
          <AsciiOrbs oscParams={oscParams} shaking={shaking} />
        </section>

        {/* Horizontal ribbon strip */}
        <section className="text-ribbon-strip" ref={canvasAreaRef}>
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
        </section>

        {/* Bottom controls panel — v2 layout */}
        <section className="text-ribbon-controls" ref={sidebarRef}>
          <AsciiControls
            mode={mode} setMode={setMode}
            poly={poly} setPoly={setPoly}
            hold={hold} setHold={setHold}
            arpBpm={arpBpm} setArpBpm={setArpBpm}
            volume={volume} setVolume={setVolume}
            octaves={octaves} setOctaves={setOctaves}
            scale={scale} setScale={setScale}
            glideSpeed={glideSpeed} setGlideSpeed={setGlideSpeed}
            stepped={stepped} setStepped={setStepped}
            oscParams={oscParams} setOscParams={setOscParams}
            delayParams={delayParams} setDelayParams={setDelayParams}
            reverbMix={reverbMix} setReverbMix={setReverbMix}
            crunch={crunch} setCrunch={setCrunch}
            vcfCutoff={vcfCutoff} setVcfCutoff={setVcfCutoff}
            vcfResonance={vcfResonance} setVcfResonance={setVcfResonance}
            vcfRouting={vcfRouting} setVcfRouting={setVcfRouting}
            onStop={handleStop}
            onShake={() => handleShake(1)}
            doubleHarmonicUnlocked={doubleHarmonicUnlocked}
            space={space} onSpaceChange={handleSpace}
            tone={tone} onToneChange={handleTone}
          />
        </section>
      </main>
    </div>
  )
}
