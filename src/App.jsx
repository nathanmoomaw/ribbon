import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useKeyboard } from './hooks/useKeyboard'
import { useKeyboardPlay } from './hooks/useKeyboardPlay'
import { useArpeggiator } from './hooks/useArpeggiator'
import { useShake, requestMotionPermission } from './hooks/useShake'
import { useMIDI } from './hooks/useMIDI'
import { useLooper } from './hooks/useLooper'
import { useGoop } from './hooks/useGoop'
import { LooperControls } from './components/LooperControls'
import { GoopOverlay } from './components/GoopOverlay'
import { WalletButton } from './components/WalletButton'
import { MilestoneToast, useMilestoneToast } from './components/MilestoneToast'
import { checkMilestone, incrementMilestone } from './crypto/milestones'
import { SCALES } from './utils/scales'
import { Puddle } from './components/Puddle'
import { Controls } from './components/Controls'
import { RibbonLogo } from './components/RibbonLogo'
import { PresetQR } from './components/PresetQR'
import { VCFControl } from './components/VCFControl'
// HelpWizard shelved — partially implemented, targeting future version
// import { HelpWizard, WizardTrigger } from './components/HelpWizard'
import { positionToFrequency } from './utils/pitchMap'
import { HIDDEN_SCALES } from './utils/scales'
import { readPresetFromUrl } from './utils/presets'
import { MobileSplash } from './components/MobileSplash'
import { useAccount } from 'wagmi'
import './App.css'

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle']

// Nudge a numeric value randomly within its range, scaled by intensity
function nudge(current, min, max, intensity) {
  const range = max - min
  const delta = (Math.random() - 0.5) * range * 0.3 * intensity
  return Math.max(min, Math.min(max, current + delta))
}

// Read preset from URL hash on initial load (before first render)
const _urlPresetData = readPresetFromUrl()
const _urlPreset = _urlPresetData?.settings ?? null
const _urlPresetName = _urlPresetData?.name ?? ''
const _urlLoopData = _urlPresetData?.loopData ?? null

function App() {
  const getEngine = useAudioEngine()
  const { address: walletAddress } = useAccount()

  const [mode, setMode] = useState(_urlPreset?.mode ?? 'play')
  const [inputMode, setInputMode] = useState('touch')
  const [oscParams, setOscParams] = useState(_urlPreset?.oscParams ?? [
    { waveform: 'sawtooth', detune: 0, mix: 1.0 },
    { waveform: 'sawtooth', detune: 0, mix: 0.0 },
    { waveform: 'sawtooth', detune: 0, mix: 0.0 },
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
  const [keyboardPositions, setKeyboardPositions] = useState(new Map())
  const [visualMode, setVisualMode] = useState(_urlPreset?.visualMode ?? 'party')
  const [arpBpm, setArpBpm] = useState(_urlPreset?.arpBpm ?? 120)
  const [hold, setHold] = useState(_urlPreset?.hold ?? false)
  const [poly, setPoly] = useState(_urlPreset?.poly ?? false)
  const [arpNotes, setArpNotes] = useState([])
  const [shaking, setShaking] = useState(false)
  const [undulating, setUndulating] = useState(false)
  const [easterEgg, setEasterEgg] = useState(false)
  const [qrSettings, setQrSettings] = useState(null)
  const [wizardActive, setWizardActive] = useState(false)
  const ribbonInteraction = useRef({ position: null, velocity: 0, active: false })
  const controlsRef = useRef(null)
  const ribbonRef = useRef(null)
  const shakeTimerRef = useRef(null)
  const undulateTimerRef = useRef(null)
  const easterEggTimerRef = useRef(null)
  const arpStopRef = useRef(null)
  const lastSpaceRef = useRef(0)

  // Refs for handleShake — avoids recreating callback on every state change
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
  const holdRef2 = useRef(hold)
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
  holdRef2.current = hold

  // Apply URL preset to audio engine on first mount
  useEffect(() => {
    if (!_urlPreset) return
    const engine = getEngine()
    _urlPreset.oscParams.forEach((p, i) => {
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
    // Restore VCF settings if present
    if (_urlPreset.vcfCutoff != null) {
      engine.setVcfCutoff(_urlPreset.vcfCutoff)
      engine.setVcfResonance(_urlPreset.vcfResonance)
      if (_urlPreset.vcfRouting) {
        _urlPreset.vcfRouting.forEach((enabled, i) => engine.setVcfRouting(i, enabled))
      }
    }
    // Load loop data if present (deferred to let looper hooks settle)
    if (_urlLoopData) {
      setTimeout(() => loadLoopData(_urlLoopData), 100)
    }
    // Clear hash after loading so it doesn't persist on refresh with different settings
    if (window.location.hash) history.replaceState(null, '', window.location.pathname)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Looper ---
  const replayCallbacksRef = useRef({})
  const {
    recording, playing, hasLoop,
    recordEvent, toggleRecording, togglePlayback,
    getLoopData, loadLoopData,
  } = useLooper(replayCallbacksRef)

  const keyHandlers = useMemo(() => ({
    Space: () => {
      const now = Date.now()
      const elapsed = now - lastSpaceRef.current
      lastSpaceRef.current = now

      if (elapsed < 400) {
        // Double-tap: kill ALL sound including delay/reverb tails
        getEngine().killAllSound()
      } else {
        // Single tap: normal stop
        getEngine().allNotesOff()
      }
      setHold(false)
      setKeyboardPositions(new Map())
      setArpNotes([])
      arpStopRef.current?.()
      // Stop looper playback
      if (playing) togglePlayback()
    },
    Digit1: () => setMode('play'),
    Digit2: () => setMode('arp'),
    Digit3: () => setPoly(p => !p),
    Digit4: () => setHold((h) => !h),
    KeyV: () => setVisualMode((m) => m === 'party' ? 'lo' : 'party'),
    Enter: () => toggleRecording(),
  }), [mode, hold, getEngine, toggleRecording, playing, togglePlayback])

  useKeyboard(keyHandlers)

  const handleKeyboardPositions = useCallback((posMap) => {
    setKeyboardPositions(posMap)
  }, [])

  const { arpStart, arpStop } = useArpeggiator(getEngine, mode, arpBpm, arpNotes)
  arpStopRef.current = arpStop

  // Toggle a note in/out of the arp sequence (arp+hold+poly mode)
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

  // Add/remove notes for live arp+poly (keys held down)
  const handleArpNoteAdd = useCallback((hz) => {
    setArpNotes(prev => {
      if (prev.some(n => Math.abs(n - hz) < 1)) return prev
      return [...prev, hz]
    })
  }, [])

  const handleArpNoteRemove = useCallback((hz) => {
    setArpNotes(prev => prev.filter(n => Math.abs(n - hz) >= 1))
  }, [])

  // Auto-start/stop arp when notes are added/removed in arp+poly mode
  const prevArpNotesLenRef = useRef(0)
  useEffect(() => {
    if (mode === 'arp' && poly) {
      const prevLen = prevArpNotesLenRef.current
      if (prevLen === 0 && arpNotes.length > 0) {
        arpStart()
      } else if (prevLen > 0 && arpNotes.length === 0) {
        arpStop()
      }
    }
    prevArpNotesLenRef.current = arpNotes.length
  }, [arpNotes, mode, poly, arpStart, arpStop])

  // Clear arp notes when leaving arp+poly mode
  useEffect(() => {
    if (!(mode === 'arp' && poly)) {
      setArpNotes([])
    }
  }, [mode, poly])

  useKeyboardPlay(getEngine, inputMode, mode, octaves, stepped, scale, handleKeyboardPositions, arpStart, arpStop, hold, poly, handleArpNoteToggle, handleArpNoteAdd, handleArpNoteRemove)


  // Wire replay callbacks (called during loop playback)
  useEffect(() => {
    replayCallbacksRef.current = {
      voice_on: ({ hz, velocity }) => {
        const id = `loop_${Date.now()}`
        getEngine().voiceOn(id, hz, velocity)
        setTimeout(() => getEngine().voiceOff(id), 200)
      },
      knob: ({ param, value }) => {
        const engine = getEngine()
        const setters = {
          cutoff: (v) => { setFilterParams(p => ({ ...p, cutoff: v })); engine.setFilter({ cutoff: v }) },
          resonance: (v) => { setFilterParams(p => ({ ...p, resonance: v })); engine.setFilter({ resonance: v }) },
          reverb: (v) => { setReverbMix(v); engine.setReverb({ mix: v }) },
          crunch: (v) => { setCrunch(v); engine.setCrunch(v) },
          glide: (v) => { setGlideSpeed(v); engine.setGlideSpeed(v) },
        }
        if (setters[param]) setters[param](value)
      },
      shake: ({ intensity }) => handleShake(intensity),
    }
  })

  // --- Goop/Liquid ---
  const {
    goopLevels, shakeClean, getGoopData, loadGoopData,
    startDragging, stopDragging, addGoop,
  } = useGoop()

  // --- Milestone tracking ---
  const { current: currentMilestone, show: showMilestone, dismiss: dismissMilestone } = useMilestoneToast()

  // --- Shake/Quake handler (reads state from refs to avoid dependency churn) ---
  const handleShake = useCallback((intensity) => {
    const engine = getEngine()

    // 1. Visual shake on controls + ribbon — restart timers on rapid triggers
    setShaking(true)
    setUndulating(true)
    clearTimeout(shakeTimerRef.current)
    clearTimeout(undulateTimerRef.current)
    shakeTimerRef.current = setTimeout(() => setShaking(false), 400)
    undulateTimerRef.current = setTimeout(() => setUndulating(false), 500)

    // Easter egg — ~5% chance on shake, unlocks hidden double harmonic scale
    if (Math.random() < 0.05) {
      setEasterEgg(true)
      // Register hidden scale into SCALES so pitchMap can find it
      Object.assign(SCALES, HIDDEN_SCALES)
      setScale(['double harmonic'])
      setStepped(true)
      clearTimeout(easterEggTimerRef.current)
      easterEggTimerRef.current = setTimeout(() => setEasterEgg(false), 1800)
    }

    // 2. Randomize parameters — chance scales with intensity (20%-50%)
    const nudgeChance = 0.15 + intensity * 0.35
    const shouldNudge = () => Math.random() < nudgeChance

    // Oscillator params
    setOscParams(prev => prev.map((osc, i) => {
      const next = { ...osc }
      if (shouldNudge()) next.waveform = WAVEFORMS[Math.floor(Math.random() * WAVEFORMS.length)]
      if (shouldNudge()) next.mix = nudge(osc.mix, 0, 1, intensity)
      if (shouldNudge()) next.detune = Math.round(nudge(osc.detune, -1200, 1200, intensity))
      if (next.waveform !== osc.waveform) engine.setWaveform(next.waveform, i)
      if (next.mix !== osc.mix) engine.setOscMix(i, next.mix)
      if (next.detune !== osc.detune) engine.setOscDetune(i, next.detune)
      return next
    }))

    if (shouldNudge()) {
      const newCutoff = nudge(filterParamsRef.current.cutoff, 20, 20000, intensity)
      setFilterParams(prev => ({ ...prev, cutoff: newCutoff }))
      engine.setFilter({ cutoff: newCutoff })
    }

    if (shouldNudge()) {
      const newRes = nudge(filterParamsRef.current.resonance, 0, 25, intensity)
      setFilterParams(prev => ({ ...prev, resonance: newRes }))
      engine.setFilter({ resonance: newRes })
    }

    if (shouldNudge()) {
      const newSpeed = nudge(glideSpeedRef.current, 0.001, 0.3, intensity)
      setGlideSpeed(newSpeed)
      engine.setGlideSpeed(newSpeed)
    }

    if (shouldNudge()) {
      const newTime = nudge(delayParamsRef.current.time, 0.05, 1, intensity)
      setDelayParams(prev => ({ ...prev, time: newTime }))
      engine.setDelay({ time: newTime })
    }

    if (shouldNudge()) {
      const newFeedback = nudge(delayParamsRef.current.feedback, 0, 0.9, intensity)
      setDelayParams(prev => ({ ...prev, feedback: newFeedback }))
      engine.setDelay({ feedback: newFeedback })
    }

    if (shouldNudge()) {
      const newDelayMix = nudge(delayParamsRef.current.mix, 0, 1, intensity)
      setDelayParams(prev => ({ ...prev, mix: newDelayMix }))
      engine.setDelay({ mix: newDelayMix })
    }

    if (shouldNudge()) {
      const newReverb = nudge(reverbMixRef.current, 0, 1, intensity)
      setReverbMix(newReverb)
      engine.setReverb({ mix: newReverb })
    }

    if (shouldNudge()) {
      const newCrunch = nudge(crunchRef.current, 0, 1, intensity)
      setCrunch(newCrunch)
      engine.setCrunch(newCrunch)
    }

    if (shouldNudge()) {
      const newBpm = Math.round(nudge(arpBpmRef.current, 40, 300, intensity))
      setArpBpm(newBpm)
    }

    if (shouldNudge()) {
      const newOctaves = Math.floor(Math.random() * 5) + 1
      setOctaves(newOctaves)
    }

    if (shouldNudge()) {
      const scaleNames = Object.keys(SCALES)
      const randomScale = scaleNames[Math.floor(Math.random() * scaleNames.length)]
      setScale([randomScale])
    }

    // Switches — lower chance, bigger impact
    const switchChance = 0.08 + intensity * 0.15
    if (Math.random() < switchChance) {
      setMode(m => m === 'play' ? 'arp' : 'play')
    }
    if (Math.random() < switchChance) {
      setPoly(p => !p)
    }
    if (Math.random() < switchChance * 0.6) {
      setHold(h => !h)
    }

    // 3. Clean goop from controls
    shakeClean()

    // 3b. Milestone: shake counter
    const shakeMilestone = incrementMilestone('shake_master', 100)
    if (shakeMilestone) showMilestone(shakeMilestone)

    // 4. Trigger a random ribbon press — velocity scales with intensity
    const shakePosition = Math.random()
    const shakeVelocity = Math.random() * 0.3 + intensity * 0.5
    const shakeHz = positionToFrequency(shakePosition, { octaves: octavesRef.current, stepped: steppedRef.current, scale: scaleRef.current })

    // Update ribbon interaction ref for visualizer
    if (ribbonInteraction.current) {
      ribbonInteraction.current.position = shakePosition
      ribbonInteraction.current.velocity = shakeVelocity
      ribbonInteraction.current.active = true
    }

    // In arp+poly+hold mode, add note to arp sequence instead of one-shot
    if (modeRef.current === 'arp' && polyRef.current && holdRef2.current) {
      handleArpNoteToggle(shakeHz)
      setTimeout(() => {
        if (ribbonInteraction.current) ribbonInteraction.current.active = false
      }, 200)
    } else {
      const shakeVoiceId = `shake_${Date.now()}`
      engine.voiceOn(shakeVoiceId, shakeHz, shakeVelocity)

      const noteDuration = 150 + (1 - intensity) * 250
      setTimeout(() => {
        engine.voiceOff(shakeVoiceId)
        if (ribbonInteraction.current) {
          ribbonInteraction.current.active = false
        }
      }, noteDuration)
    }
  }, [getEngine, handleArpNoteToggle, shakeClean, showMilestone])

  useShake(handleShake, controlsRef, ribbonRef)

  const { midiDevice, connectMIDI } = useMIDI(getEngine, {
    setVolume, setFilterParams, setGlideSpeed, setDelayParams,
    setReverbMix, setCrunch, setOscParams, setArpBpm, setHold,
    mode, poly, hold, octaves, stepped, scale,
    handleArpNoteToggle, handleArpNoteAdd, handleArpNoteRemove,
    arpStart, arpStop,
  })

  // Hold in play mode: note sustains at its original pitch until space or hold toggled off
  // No global mouse tracking — "wild mode" (global pitch follow) removed for now

  // When hold is toggled off, stop all notes and arp
  const holdRef = useRef(hold)
  useEffect(() => {
    const wasHold = holdRef.current
    holdRef.current = hold
    if (wasHold && !hold) {
      const engine = getEngine()
      if (mode === 'play') {
        if (engine.getIsPlaying()) engine.allNotesOff()
      } else if (mode === 'arp') {
        setArpNotes([])
        arpStopRef.current?.()
        engine.allNotesOff()
      }
    }
  }, [hold, getEngine, mode])

  const handleStop = useCallback(() => {
    getEngine().allNotesOff()
    setHold(false)
    setKeyboardPositions(new Map())
    setArpNotes([])
    arpStopRef.current?.()
  }, [getEngine])

  const handleVcfRoutingToggle = useCallback((oscIndex, enabled) => {
    setVcfRouting(prev => {
      const next = [...prev]
      next[oscIndex] = enabled
      return next
    })
  }, [])

  const handleQRCreate = useCallback(() => {
    setQrSettings({
      mode, oscParams, volume, octaves, delayParams, reverbMix, crunch,
      filterParams, vcfCutoff, vcfResonance, vcfRouting, glideSpeed, stepped, scale, poly, hold, arpBpm, visualMode,
      loopData: getLoopData(),
      walletAddress,
    })
    // Milestone: shared preset
    const m = checkMilestone('shared_preset')
    if (m) showMilestone(m)
  }, [mode, oscParams, volume, octaves, delayParams, reverbMix, crunch, filterParams, vcfCutoff, vcfResonance, vcfRouting, glideSpeed, stepped, scale, poly, hold, arpBpm, visualMode, showMilestone, getLoopData, walletAddress])

  const handleKillAll = useCallback(() => {
    getEngine().killAllSound()
    setHold(false)
    setKeyboardPositions(new Map())
    setArpNotes([])
    arpStopRef.current?.()
  }, [getEngine])

  return (
    <div className={`app app--puddle ${visualMode === 'lo' ? 'lo-mode' : ''}`}>
      <MobileSplash onEnter={() => getEngine()} />
      {/* Moving grid background */}
      <div className="app__grid-bg" />

      <header className="app-header">
        <div className="app-header__logo" onClick={() => { requestMotionPermission(); handleShake(0.5) }} role="button" tabIndex={0} aria-label="Shake / Randomize">
          <RibbonLogo />
        </div>
        <button
          className="app-header__shake-bolt"
          onClick={() => { requestMotionPermission(); handleShake(0.5) }}
          aria-label="Shake / Randomize"
        >
          ⚡
        </button>
        <WalletButton />
        <LooperControls
          recording={recording}
          playing={playing}
          hasLoop={hasLoop}
          onToggleRecord={toggleRecording}
          onTogglePlay={togglePlayback}
        />
        <button
          className="app-header__qr-mobile"
          onClick={handleQRCreate}
          title="Create preset QR code"
          aria-label="Create preset QR code"
        >
          &#x25A3;
        </button>
        <button
          className={`keys-toggle__btn keys-toggle__midi ${midiDevice && midiDevice !== 'no-device' && midiDevice !== 'unsupported' && midiDevice !== 'denied' ? 'active' : ''} ${midiDevice === 'unsupported' || midiDevice === 'denied' ? 'keys-toggle__midi--err' : ''} ${midiDevice === 'no-device' ? 'keys-toggle__midi--waiting' : ''}`}
          onClick={connectMIDI}
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
      </header>

      <div className="app__stage" style={{ position: 'relative' }}>
        <GoopOverlay goopLevels={goopLevels} />
        <Puddle
          ref={ribbonRef}
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
          undulating={undulating}
          onArpNoteToggle={handleArpNoteToggle}
          arpNotes={arpNotes}
          recordEvent={recordEvent}
        />

        <VCFControl
          vcfCutoff={vcfCutoff}
          vcfResonance={vcfResonance}
          vcfRouting={vcfRouting}
          getEngine={getEngine}
          onCutoffChange={setVcfCutoff}
          onResonanceChange={setVcfResonance}
          onRoutingToggle={handleVcfRoutingToggle}
        />

        <Controls
          ref={controlsRef}
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
          crunch={crunch}
          setCrunch={setCrunch}
          filterParams={filterParams}
          setFilterParams={setFilterParams}
          glideSpeed={glideSpeed}
          setGlideSpeed={setGlideSpeed}
          shaking={shaking}
          mode={mode}
          setMode={setMode}
          poly={poly}
          setPoly={setPoly}
          arpBpm={arpBpm}
          setArpBpm={setArpBpm}
          hold={hold}
          setHold={setHold}
          onStop={handleStop}
          onKillAll={handleKillAll}
          onQRCreate={handleQRCreate}
        />
      </div>

      {easterEgg && (
        <div className="easter-egg" aria-hidden="true">
          <div className="easter-egg__glitch">DOUBLE HARMONIC UNLOCKED</div>
        </div>
      )}

      {qrSettings && (
        <PresetQR settings={qrSettings} initialName={_urlPresetName} onClose={() => setQrSettings(null)} />
      )}

      <MilestoneToast milestone={currentMilestone} onDismiss={dismissMilestone} />
    </div>
  )
}

export default App
