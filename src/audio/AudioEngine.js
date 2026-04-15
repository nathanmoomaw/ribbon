let ctx = null
let masterGain = null
let analyser = null
let delayNode = null
let delayFeedback = null
let delaySend = null
let reverbNode = null
let reverbSend = null
let dryGain = null
let glideTime = 0.005
let crushNode = null
let crushWetGain = null
let crushDryGain = null
let postCrushGain = null
let crushReady = false
let slapbackNode = null
let slapbackSend = null
let slapbackFeedback = null

const NUM_OSCILLATORS = 3
const MAX_VOICES = 8
const CLEANUP_DELAY = 300 // ms before destroying inactive voice

// Voice map: id -> { oscs, noteGain, filter, active, cleanupTimer }
const voiceMap = new Map()

// Global settings applied to all voices (and new voices on creation)
const globalWaveforms = ['sawtooth', 'sawtooth', 'sawtooth']
const globalDetunes = [0, 0, 0]
const globalMixes = [1.0, 0.0, 0.0]
let globalFilterCutoff = 20000
let globalFilterResonance = 0

// VCF (voltage-controlled filter) — additional filter routable per-oscillator
let globalVcfCutoff = 2000
let globalVcfResonance = 8
const globalVcfRouting = [false, false, false] // which oscs are routed through VCF

function generateImpulseResponse(context, duration = 2, decay = 2) {
  const rate = context.sampleRate
  const length = rate * duration
  const impulse = context.createBuffer(2, length, rate)
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return impulse
}

function createVoice(hz) {
  const noteGain = ctx.createGain()
  noteGain.gain.setValueAtTime(0, ctx.currentTime)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(globalFilterCutoff, ctx.currentTime)
  filter.Q.setValueAtTime(globalFilterResonance, ctx.currentTime)

  const oscs = []
  for (let i = 0; i < NUM_OSCILLATORS; i++) {
    const osc = ctx.createOscillator()
    osc.type = globalWaveforms[i]
    osc.frequency.setValueAtTime(Math.max(hz, 20), ctx.currentTime)
    osc.detune.setValueAtTime(globalDetunes[i], ctx.currentTime)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(globalMixes[i], ctx.currentTime)

    osc.connect(gain)

    // VCF routing: if this osc is routed through VCF, insert a per-osc filter
    if (globalVcfRouting[i]) {
      const vcf = ctx.createBiquadFilter()
      vcf.type = 'lowpass'
      vcf.frequency.setValueAtTime(globalVcfCutoff, ctx.currentTime)
      vcf.Q.setValueAtTime(globalVcfResonance, ctx.currentTime)
      gain.connect(vcf)
      vcf.connect(noteGain)
      osc.start()
      oscs.push({ osc, gain, vcf })
    } else {
      gain.connect(noteGain)
      osc.start()
      oscs.push({ osc, gain, vcf: null })
    }
  }

  noteGain.connect(filter)
  filter.connect(masterGain)

  return { oscs, noteGain, filter, active: false, cleanupTimer: null }
}

function destroyVoice(id) {
  const voice = voiceMap.get(id)
  if (!voice) return
  clearTimeout(voice.cleanupTimer)
  voice.oscs.forEach(({ osc, gain }) => {
    try { osc.stop() } catch (_) { /* already stopped */ }
    try { osc.disconnect() } catch (_) {}
    try { gain.disconnect() } catch (_) {}
  })
  try { voice.noteGain.disconnect() } catch (_) {}
  try { voice.filter.disconnect() } catch (_) {}
  voiceMap.delete(id)
}

// Ensure AudioContext is resumed on user gesture (required by iOS/mobile browsers)
function ensureResumed() {
  if (!ctx || ctx.state !== 'suspended') return
  ctx.resume()
}

let gestureListenerAdded = false
function addGestureListener() {
  if (gestureListenerAdded) return
  gestureListenerAdded = true
  const events = ['touchstart', 'touchend', 'mousedown', 'pointerdown', 'click', 'keydown']
  const handler = () => {
    ensureResumed()
    // Keep listening until context is actually running (Android can be stubborn)
    if (ctx && ctx.state === 'running') {
      events.forEach(e => document.removeEventListener(e, handler, true))
    }
  }
  events.forEach(e => document.addEventListener(e, handler, true))
}

export function init() {
  if (ctx) return getEngine()

  ctx = new (window.AudioContext || window.webkitAudioContext)()

  // Set up gesture-based resume for mobile browsers
  addGestureListener()

  masterGain = ctx.createGain()
  masterGain.gain.setValueAtTime(0.5, ctx.currentTime)

  // Post-crush mixing point — everything downstream connects here
  postCrushGain = ctx.createGain()
  postCrushGain.gain.setValueAtTime(1, ctx.currentTime)

  // Bitcrush dry/wet blend: masterGain → [crushDry, crushNode→crushWet] → postCrushGain
  crushDryGain = ctx.createGain()
  crushDryGain.gain.setValueAtTime(1, ctx.currentTime)
  crushWetGain = ctx.createGain()
  crushWetGain.gain.setValueAtTime(0, ctx.currentTime)

  masterGain.connect(crushDryGain)
  crushDryGain.connect(postCrushGain)
  crushWetGain.connect(postCrushGain)

  // Load AudioWorklet for bitcrush (async, wires in when ready)
  // AudioWorklet requires a secure context (HTTPS) — skip gracefully on HTTP
  function loadCrushWorklet() {
    if (!ctx.audioWorklet || !window.isSecureContext) {
      console.warn('AudioWorklet not available (insecure context?) — crunch disabled')
      return
    }
    ctx.audioWorklet.addModule('/bitcrush-processor.js').then(() => {
      crushNode = new AudioWorkletNode(ctx, 'bitcrush-processor')
      masterGain.connect(crushNode)
      crushNode.connect(crushWetGain)
      crushReady = true
    }).catch(err => {
      console.warn('Bitcrush worklet failed to load:', err)
      // Retry after context resumes (common on mobile)
      if (ctx.state === 'suspended') {
        ctx.addEventListener('statechange', function retry() {
          if (ctx.state === 'running') {
            ctx.removeEventListener('statechange', retry)
            loadCrushWorklet()
          }
        })
      }
    })
  }
  loadCrushWorklet()

  // Analyser (passive tap for visuals)
  analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  postCrushGain.connect(analyser)

  // Dry path
  dryGain = ctx.createGain()
  dryGain.gain.setValueAtTime(1, ctx.currentTime)
  postCrushGain.connect(dryGain)
  dryGain.connect(ctx.destination)

  // Delay send (parallel)
  delaySend = ctx.createGain()
  delaySend.gain.setValueAtTime(0, ctx.currentTime)
  delayNode = ctx.createDelay(2.0)
  delayNode.delayTime.setValueAtTime(0.3, ctx.currentTime)
  delayFeedback = ctx.createGain()
  delayFeedback.gain.setValueAtTime(0.4, ctx.currentTime)

  postCrushGain.connect(delaySend)
  delaySend.connect(delayNode)
  delayNode.connect(delayFeedback)
  delayFeedback.connect(delayNode)
  delayNode.connect(ctx.destination)

  // Reverb send (parallel)
  reverbSend = ctx.createGain()
  reverbSend.gain.setValueAtTime(0, ctx.currentTime)
  reverbNode = ctx.createConvolver()
  reverbNode.buffer = generateImpulseResponse(ctx)

  postCrushGain.connect(reverbSend)
  reverbSend.connect(reverbNode)
  reverbNode.connect(ctx.destination)

  // Slapback delay (paired with crush — very short, tight)
  slapbackSend = ctx.createGain()
  slapbackSend.gain.setValueAtTime(0, ctx.currentTime)
  slapbackNode = ctx.createDelay(0.5)
  slapbackNode.delayTime.setValueAtTime(0.04, ctx.currentTime) // 40ms slapback
  slapbackFeedback = ctx.createGain()
  slapbackFeedback.gain.setValueAtTime(0.2, ctx.currentTime) // subtle repeat

  postCrushGain.connect(slapbackSend)
  slapbackSend.connect(slapbackNode)
  slapbackNode.connect(slapbackFeedback)
  slapbackFeedback.connect(slapbackNode)
  slapbackNode.connect(ctx.destination)

  return getEngine()
}

// --- Voice-based API ---

export function voiceOn(id, hz, velocity = 1) {
  if (!ctx) return
  ensureResumed()

  let voice = voiceMap.get(id)
  if (voice) {
    // Reuse existing voice — cancel pending cleanup
    clearTimeout(voice.cleanupTimer)
    voice.cleanupTimer = null
  } else {
    // Steal oldest voice if at capacity
    if (voiceMap.size >= MAX_VOICES) {
      const oldestId = voiceMap.keys().next().value
      destroyVoice(oldestId)
    }
    voice = createVoice(hz)
    voiceMap.set(id, voice)
  }

  // Set frequency
  for (const { osc } of voice.oscs) {
    osc.frequency.cancelScheduledValues(ctx.currentTime)
    osc.frequency.setTargetAtTime(Math.max(hz, 20), ctx.currentTime, glideTime)
  }

  // Ramp up gain — force clean attack from zero to avoid stale fade-out values
  const v = Math.max(0, Math.min(1, velocity))
  voice.noteGain.gain.cancelScheduledValues(ctx.currentTime)
  voice.noteGain.gain.setValueAtTime(0, ctx.currentTime)
  voice.noteGain.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.01)
  voice.active = true

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Ribbon Synth',
      artist: 'Live Session',
    })
    navigator.mediaSession.playbackState = 'playing'
  }
}

export function voiceOff(id) {
  const voice = voiceMap.get(id)
  if (!voice) return

  voice.noteGain.gain.cancelScheduledValues(ctx.currentTime)
  voice.noteGain.gain.setValueAtTime(voice.noteGain.gain.value, ctx.currentTime)
  voice.noteGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.01)
  voice.active = false

  // Schedule cleanup after fade out
  clearTimeout(voice.cleanupTimer)
  voice.cleanupTimer = setTimeout(() => destroyVoice(id), CLEANUP_DELAY)

  if (!getIsPlaying() && 'mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'paused'
  }
}

export function voiceSetFrequency(id, hz) {
  const voice = voiceMap.get(id)
  if (!voice) return
  const safeHz = Math.max(hz, 20)
  for (const { osc } of voice.oscs) {
    osc.frequency.cancelScheduledValues(ctx.currentTime)
    osc.frequency.setTargetAtTime(safeHz, ctx.currentTime, glideTime)
  }
}

export function voiceSetVelocity(id, value) {
  const voice = voiceMap.get(id)
  if (!voice || !voice.active) return
  const v = Math.max(0, Math.min(1, value))
  voice.noteGain.gain.cancelScheduledValues(ctx.currentTime)
  voice.noteGain.gain.setValueAtTime(voice.noteGain.gain.value, ctx.currentTime)
  voice.noteGain.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.01)
}

export function voiceIsPlaying(id) {
  const voice = voiceMap.get(id)
  return voice ? voice.active : false
}

// --- Mono convenience API (for arp and simple use) ---

const MONO_ID = '_mono'
let monoFrequency = 220

export function noteOn(velocity = 1) {
  voiceOn(MONO_ID, monoFrequency, velocity)
}

export function noteOff() {
  voiceOff(MONO_ID)
}

export function setFrequency(hz) {
  monoFrequency = hz
  const voice = voiceMap.get(MONO_ID)
  if (voice) {
    voiceSetFrequency(MONO_ID, hz)
  }
}

export function setVelocity(value) {
  voiceSetVelocity(MONO_ID, value)
}

export function setAllActiveFrequencies(hz) {
  for (const [id, voice] of voiceMap) {
    if (voice.active) voiceSetFrequency(id, hz)
  }
}

// --- All notes off ---

export function allNotesOff() {
  for (const id of [...voiceMap.keys()]) {
    voiceOff(id)
  }
}

// Kill ALL sound immediately — voices, delay tails, reverb tails
let killRestoreTimer = null
export function killAllSound() {
  // Stop all voices immediately (no fade)
  for (const id of [...voiceMap.keys()]) {
    destroyVoice(id)
  }
  if (!ctx) return
  // Save current send/feedback values
  const prevDelaySend = delaySend ? delaySend.gain.value : 0
  const prevDelayFeedback = delayFeedback ? delayFeedback.gain.value : 0
  const prevReverbSend = reverbSend ? reverbSend.gain.value : 0
  const prevSlapbackSend = slapbackSend ? slapbackSend.gain.value : 0
  // Zero everything to kill tails
  if (delayFeedback) {
    delayFeedback.gain.cancelScheduledValues(ctx.currentTime)
    delayFeedback.gain.setValueAtTime(0, ctx.currentTime)
  }
  if (delaySend) {
    delaySend.gain.cancelScheduledValues(ctx.currentTime)
    delaySend.gain.setValueAtTime(0, ctx.currentTime)
  }
  if (reverbSend) {
    reverbSend.gain.cancelScheduledValues(ctx.currentTime)
    reverbSend.gain.setValueAtTime(0, ctx.currentTime)
  }
  if (slapbackSend) {
    slapbackSend.gain.cancelScheduledValues(ctx.currentTime)
    slapbackSend.gain.setValueAtTime(0, ctx.currentTime)
  }
  // Cancel any previous restore timer to prevent leaks
  if (killRestoreTimer) clearTimeout(killRestoreTimer)
  // Restore after tails have died
  killRestoreTimer = setTimeout(() => {
    killRestoreTimer = null
    if (!ctx) return
    if (delaySend) delaySend.gain.setValueAtTime(prevDelaySend, ctx.currentTime)
    if (delayFeedback) delayFeedback.gain.setValueAtTime(prevDelayFeedback, ctx.currentTime)
    if (reverbSend) reverbSend.gain.setValueAtTime(prevReverbSend, ctx.currentTime)
    if (slapbackSend) slapbackSend.gain.setValueAtTime(prevSlapbackSend, ctx.currentTime)
  }, 200)
}

// --- Global settings (apply to all existing + future voices) ---

export function setFilter({ cutoff, resonance }) {
  if (cutoff !== undefined) globalFilterCutoff = cutoff
  if (resonance !== undefined) globalFilterResonance = resonance
  for (const voice of voiceMap.values()) {
    if (cutoff !== undefined) {
      voice.filter.frequency.cancelScheduledValues(ctx.currentTime)
      voice.filter.frequency.setValueAtTime(voice.filter.frequency.value, ctx.currentTime)
      voice.filter.frequency.linearRampToValueAtTime(cutoff, ctx.currentTime + 0.01)
    }
    if (resonance !== undefined) {
      voice.filter.Q.cancelScheduledValues(ctx.currentTime)
      voice.filter.Q.setValueAtTime(voice.filter.Q.value, ctx.currentTime)
      voice.filter.Q.linearRampToValueAtTime(resonance, ctx.currentTime + 0.01)
    }
  }
}

export function setGlideSpeed(value) {
  glideTime = value
}

export function setWaveform(type, oscIndex) {
  if (oscIndex !== undefined) {
    globalWaveforms[oscIndex] = type
    for (const voice of voiceMap.values()) {
      if (voice.oscs[oscIndex]) voice.oscs[oscIndex].osc.type = type
    }
  } else {
    for (let i = 0; i < NUM_OSCILLATORS; i++) globalWaveforms[i] = type
    for (const voice of voiceMap.values()) {
      for (const { osc } of voice.oscs) osc.type = type
    }
  }
}

export function setOscDetune(oscIndex, cents) {
  globalDetunes[oscIndex] = cents
  for (const voice of voiceMap.values()) {
    if (!voice.oscs[oscIndex]) continue
    const { osc } = voice.oscs[oscIndex]
    osc.detune.cancelScheduledValues(ctx.currentTime)
    osc.detune.setValueAtTime(osc.detune.value, ctx.currentTime)
    osc.detune.linearRampToValueAtTime(cents, ctx.currentTime + 0.01)
  }
}

export function setOscMix(oscIndex, value) {
  globalMixes[oscIndex] = value
  for (const voice of voiceMap.values()) {
    if (!voice.oscs[oscIndex]) continue
    const { gain } = voice.oscs[oscIndex]
    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
  }
}

export function setVolume(value) {
  if (!masterGain) return
  masterGain.gain.cancelScheduledValues(ctx.currentTime)
  masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime)
  masterGain.gain.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
}

export function setDelay({ time, feedback, mix }) {
  if (!ctx) return
  if (time !== undefined) {
    delayNode.delayTime.cancelScheduledValues(ctx.currentTime)
    delayNode.delayTime.linearRampToValueAtTime(time, ctx.currentTime + 0.01)
  }
  if (feedback !== undefined) {
    delayFeedback.gain.cancelScheduledValues(ctx.currentTime)
    delayFeedback.gain.linearRampToValueAtTime(feedback, ctx.currentTime + 0.01)
  }
  if (mix !== undefined) {
    delaySend.gain.cancelScheduledValues(ctx.currentTime)
    delaySend.gain.linearRampToValueAtTime(mix, ctx.currentTime + 0.01)
  }
}

export function setReverb({ mix }) {
  if (!ctx) return
  if (mix !== undefined) {
    reverbSend.gain.cancelScheduledValues(ctx.currentTime)
    reverbSend.gain.linearRampToValueAtTime(mix, ctx.currentTime + 0.01)
  }
}

export function setCrush({ bitDepth, reduction, mix }) {
  if (!ctx) return
  if (mix !== undefined) {
    crushWetGain.gain.cancelScheduledValues(ctx.currentTime)
    crushWetGain.gain.linearRampToValueAtTime(mix, ctx.currentTime + 0.01)
    crushDryGain.gain.cancelScheduledValues(ctx.currentTime)
    crushDryGain.gain.linearRampToValueAtTime(1 - mix, ctx.currentTime + 0.01)
  }
  if (crushReady && crushNode) {
    if (bitDepth !== undefined) {
      crushNode.parameters.get('bitDepth').setValueAtTime(bitDepth, ctx.currentTime)
    }
    if (reduction !== undefined) {
      crushNode.parameters.get('reduction').setValueAtTime(reduction, ctx.currentTime)
    }
  }
}

// Single-slider crunch: maps 0-1 to bitDepth + reduction + mix + slapback
export function setCrunch(amount) {
  if (!ctx) return
  // Map amount to crush parameters — aggressive curve for crunchy, lo-fi sound
  // Use exponential curve so the first half of the slider has noticeable bite
  const curve = amount * amount * 0.4 + amount * 0.6 // front-loaded curve
  const mix = Math.min(1, amount * 1.3) // reach full wet earlier
  const bitDepth = Math.round(16 - curve * 14)  // 16 → 2
  const reduction = Math.round(1 + curve * 38)   // 1 → 39
  setCrush({ bitDepth, reduction, mix })
  // Slapback delay paired with crunch
  if (slapbackSend) {
    const slapMix = amount * 0.45  // punchier slapback, scales with crunch
    slapbackSend.gain.cancelScheduledValues(ctx.currentTime)
    slapbackSend.gain.linearRampToValueAtTime(slapMix, ctx.currentTime + 0.01)
  }
}

// --- VCF (per-oscillator voltage-controlled filter) ---

export function setVcfCutoff(value) {
  globalVcfCutoff = value
  for (const voice of voiceMap.values()) {
    for (const { vcf } of voice.oscs) {
      if (!vcf) continue
      vcf.frequency.cancelScheduledValues(ctx.currentTime)
      vcf.frequency.setValueAtTime(vcf.frequency.value, ctx.currentTime)
      vcf.frequency.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
    }
  }
}

export function setVcfResonance(value) {
  globalVcfResonance = value
  for (const voice of voiceMap.values()) {
    for (const { vcf } of voice.oscs) {
      if (!vcf) continue
      vcf.Q.cancelScheduledValues(ctx.currentTime)
      vcf.Q.setValueAtTime(vcf.Q.value, ctx.currentTime)
      vcf.Q.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
    }
  }
}

export function setVcfRouting(oscIndex, enabled) {
  globalVcfRouting[oscIndex] = enabled
  // Routing changes take effect on next voice creation
  // For existing voices, we'd need to rewire — for simplicity, just affect new notes
}

export function getVcfRouting() {
  return [...globalVcfRouting]
}

export function getAnalyser() {
  return analyser
}

export function getIsPlaying(id) {
  if (id !== undefined) {
    const voice = voiceMap.get(id)
    return voice ? voice.active : false
  }
  for (const voice of voiceMap.values()) {
    if (voice.active) return true
  }
  return false
}

export function getActiveVoiceCount() {
  let count = 0
  for (const voice of voiceMap.values()) {
    if (voice.active) count++
  }
  return count
}

function getEngine() {
  return {
    init,
    noteOn,
    noteOff,
    setFrequency,
    setVelocity,
    voiceOn,
    voiceOff,
    voiceSetFrequency,
    voiceSetVelocity,
    voiceIsPlaying,
    allNotesOff,
    killAllSound,
    setAllActiveFrequencies,
    getActiveVoiceCount,
    setFilter,
    setGlideSpeed,
    setWaveform,
    setOscDetune,
    setOscMix,
    setVolume,
    setDelay,
    setReverb,
    setCrush,
    setCrunch,
    setVcfCutoff,
    setVcfResonance,
    setVcfRouting,
    getVcfRouting,
    getAnalyser,
    getIsPlaying,
  }
}
