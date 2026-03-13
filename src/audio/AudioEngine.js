let ctx = null
let oscillators = []
let noteGain = null
let filterNode = null
let masterGain = null
let analyser = null
let delayNode = null
let delayFeedback = null
let delaySend = null
let reverbNode = null
let reverbSend = null
let dryGain = null
let isPlaying = false
let glideTime = 0.005

const NUM_OSCILLATORS = 2

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

function createOscillator(index) {
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(220, ctx.currentTime)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(index === 0 ? 1.0 : 0.0, ctx.currentTime)

  osc.connect(gain)
  gain.connect(noteGain)
  osc.start()

  return { osc, gain }
}

export function init() {
  if (ctx) return getEngine()

  ctx = new (window.AudioContext || window.webkitAudioContext)()

  noteGain = ctx.createGain()
  noteGain.gain.setValueAtTime(0, ctx.currentTime)

  filterNode = ctx.createBiquadFilter()
  filterNode.type = 'lowpass'
  filterNode.frequency.setValueAtTime(20000, ctx.currentTime)
  filterNode.Q.setValueAtTime(0, ctx.currentTime)

  masterGain = ctx.createGain()
  masterGain.gain.setValueAtTime(0.5, ctx.currentTime)

  noteGain.connect(filterNode)
  filterNode.connect(masterGain)

  // Create oscillators
  for (let i = 0; i < NUM_OSCILLATORS; i++) {
    oscillators.push(createOscillator(i))
  }

  // Analyser (passive tap for visuals)
  analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  masterGain.connect(analyser)

  // Dry path
  dryGain = ctx.createGain()
  dryGain.gain.setValueAtTime(1, ctx.currentTime)
  masterGain.connect(dryGain)
  dryGain.connect(ctx.destination)

  // Delay send (parallel)
  delaySend = ctx.createGain()
  delaySend.gain.setValueAtTime(0, ctx.currentTime)
  delayNode = ctx.createDelay(2.0)
  delayNode.delayTime.setValueAtTime(0.3, ctx.currentTime)
  delayFeedback = ctx.createGain()
  delayFeedback.gain.setValueAtTime(0.4, ctx.currentTime)

  masterGain.connect(delaySend)
  delaySend.connect(delayNode)
  delayNode.connect(delayFeedback)
  delayFeedback.connect(delayNode)
  delayNode.connect(ctx.destination)

  // Reverb send (parallel)
  reverbSend = ctx.createGain()
  reverbSend.gain.setValueAtTime(0, ctx.currentTime)
  reverbNode = ctx.createConvolver()
  reverbNode.buffer = generateImpulseResponse(ctx)

  masterGain.connect(reverbSend)
  reverbSend.connect(reverbNode)
  reverbNode.connect(ctx.destination)

  return getEngine()
}

export function noteOn(velocity = 1) {
  if (!ctx || isPlaying) return
  isPlaying = true
  if (ctx.state === 'suspended') ctx.resume()
  const v = Math.max(0, Math.min(1, velocity))
  noteGain.gain.cancelScheduledValues(ctx.currentTime)
  noteGain.gain.setValueAtTime(noteGain.gain.value, ctx.currentTime)
  noteGain.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.01)

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Ribbon Synth',
      artist: 'Live Session',
    })
    navigator.mediaSession.playbackState = 'playing'
  }
}

export function noteOff() {
  if (!ctx || !isPlaying) return
  isPlaying = false
  noteGain.gain.cancelScheduledValues(ctx.currentTime)
  noteGain.gain.setValueAtTime(noteGain.gain.value, ctx.currentTime)
  noteGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.01)

  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'paused'
  }
}

export function setVelocity(value) {
  if (!noteGain || !isPlaying) return
  const v = Math.max(0, Math.min(1, value))
  noteGain.gain.cancelScheduledValues(ctx.currentTime)
  noteGain.gain.setValueAtTime(noteGain.gain.value, ctx.currentTime)
  noteGain.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.01)
}

export function setFrequency(hz) {
  if (!oscillators.length) return
  const safeHz = Math.max(hz, 20)
  for (const { osc } of oscillators) {
    osc.frequency.cancelScheduledValues(ctx.currentTime)
    osc.frequency.setTargetAtTime(safeHz, ctx.currentTime, glideTime)
  }
}

export function setFilter({ cutoff, resonance }) {
  if (!filterNode) return
  if (cutoff !== undefined) {
    filterNode.frequency.cancelScheduledValues(ctx.currentTime)
    filterNode.frequency.setValueAtTime(filterNode.frequency.value, ctx.currentTime)
    filterNode.frequency.linearRampToValueAtTime(cutoff, ctx.currentTime + 0.01)
  }
  if (resonance !== undefined) {
    filterNode.Q.cancelScheduledValues(ctx.currentTime)
    filterNode.Q.setValueAtTime(filterNode.Q.value, ctx.currentTime)
    filterNode.Q.linearRampToValueAtTime(resonance, ctx.currentTime + 0.01)
  }
}

export function setGlideSpeed(value) {
  glideTime = value
}

export function setWaveform(type, oscIndex) {
  if (oscIndex !== undefined) {
    if (oscillators[oscIndex]) oscillators[oscIndex].osc.type = type
  } else {
    for (const { osc } of oscillators) osc.type = type
  }
}

export function setOscDetune(oscIndex, cents) {
  if (!oscillators[oscIndex]) return
  const { osc } = oscillators[oscIndex]
  osc.detune.cancelScheduledValues(ctx.currentTime)
  osc.detune.setValueAtTime(osc.detune.value, ctx.currentTime)
  osc.detune.linearRampToValueAtTime(cents, ctx.currentTime + 0.01)
}

export function setOscMix(oscIndex, value) {
  if (!oscillators[oscIndex]) return
  const { gain } = oscillators[oscIndex]
  gain.gain.cancelScheduledValues(ctx.currentTime)
  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
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

export function getAnalyser() {
  return analyser
}

export function getIsPlaying() {
  return isPlaying
}

function getEngine() {
  return {
    init,
    noteOn,
    noteOff,
    setFrequency,
    setVelocity,
    setFilter,
    setGlideSpeed,
    setWaveform,
    setOscDetune,
    setOscMix,
    setVolume,
    setDelay,
    setReverb,
    getAnalyser,
    getIsPlaying,
  }
}
