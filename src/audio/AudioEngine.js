let ctx = null
let oscillator = null
let noteGain = null
let masterGain = null
let delayNode = null
let delayFeedback = null
let delaySend = null
let reverbNode = null
let reverbSend = null
let dryGain = null
let isPlaying = false

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

export function init() {
  if (ctx) return getEngine()

  ctx = new (window.AudioContext || window.webkitAudioContext)()

  // Oscillator → noteGain → masterGain
  oscillator = ctx.createOscillator()
  oscillator.type = 'sawtooth'
  oscillator.frequency.setValueAtTime(220, ctx.currentTime)

  noteGain = ctx.createGain()
  noteGain.gain.setValueAtTime(0, ctx.currentTime)

  masterGain = ctx.createGain()
  masterGain.gain.setValueAtTime(0.5, ctx.currentTime)

  oscillator.connect(noteGain)
  noteGain.connect(masterGain)

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
  delayFeedback.connect(delayNode) // feedback loop
  delayNode.connect(ctx.destination)

  // Reverb send (parallel)
  reverbSend = ctx.createGain()
  reverbSend.gain.setValueAtTime(0, ctx.currentTime)
  reverbNode = ctx.createConvolver()
  reverbNode.buffer = generateImpulseResponse(ctx)

  masterGain.connect(reverbSend)
  reverbSend.connect(reverbNode)
  reverbNode.connect(ctx.destination)

  oscillator.start()

  return getEngine()
}

export function noteOn() {
  if (!ctx || isPlaying) return
  isPlaying = true
  if (ctx.state === 'suspended') ctx.resume()
  noteGain.gain.cancelScheduledValues(ctx.currentTime)
  noteGain.gain.setValueAtTime(noteGain.gain.value, ctx.currentTime)
  noteGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.01)
}

export function noteOff() {
  if (!ctx || !isPlaying) return
  isPlaying = false
  noteGain.gain.cancelScheduledValues(ctx.currentTime)
  noteGain.gain.setValueAtTime(noteGain.gain.value, ctx.currentTime)
  noteGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.01)
}

export function setFrequency(hz) {
  if (!oscillator) return
  oscillator.frequency.cancelScheduledValues(ctx.currentTime)
  oscillator.frequency.setValueAtTime(oscillator.frequency.value, ctx.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(hz, 20),
    ctx.currentTime + 0.008
  )
}

export function setWaveform(type) {
  if (!oscillator) return
  oscillator.type = type
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

export function getIsPlaying() {
  return isPlaying
}

function getEngine() {
  return {
    init,
    noteOn,
    noteOff,
    setFrequency,
    setWaveform,
    setVolume,
    setDelay,
    setReverb,
    getIsPlaying,
  }
}
