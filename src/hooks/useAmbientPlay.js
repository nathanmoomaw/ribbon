import { useEffect, useRef, useCallback, useState } from 'react'
import { SCALES } from '../utils/scales'

// Ambient play — generative pleasant tones from the current scale
// Starts after INACTIVITY_DELAY ms of no user interaction, stops when user plays

const BASE_NOTE = 48 // C3 MIDI
const INACTIVITY_DELAY = 30000 // 30 seconds before ambient kicks in

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// Pick a pleasant note from the scale, biased toward small melodic steps
function pickNote(scale, octaves, prevMidi) {
  const scaleKey = Array.isArray(scale) ? scale[0] : scale
  // Default to pentatonic for ambient — always sounds nice
  const intervals = SCALES[scaleKey] || SCALES.pentatonic
  const semitoneRange = octaves * 12
  const oct = Math.floor(Math.random() * octaves)
  const interval = intervals[Math.floor(Math.random() * intervals.length)]
  let midi = BASE_NOTE + oct * 12 + interval

  // Bias toward small melodic steps from previous note
  if (prevMidi > 0) {
    const step = midi - prevMidi
    if (Math.abs(step) > 7) {
      midi += (step > 0 ? -1 : 1) * 12
    }
  }

  return Math.max(BASE_NOTE, Math.min(BASE_NOTE + semitoneRange, midi))
}

export function useAmbientPlay(getEngine, enabled, scale, octaves, ribbonInteraction, onAmbientTweak, onAmbientStart) {
  const [isPlaying, setIsPlaying] = useState(false)
  const noteTimerRef = useRef(null)
  const inactivityTimerRef = useRef(null)
  const prevMidiRef = useRef(0)
  const activeVoicesRef = useRef([])
  const noteCountRef = useRef(0)
  const enabledRef = useRef(enabled)
  const onAmbientTweakRef = useRef(onAmbientTweak)
  const onAmbientStartRef = useRef(onAmbientStart)
  enabledRef.current = enabled
  onAmbientTweakRef.current = onAmbientTweak
  onAmbientStartRef.current = onAmbientStart

  const stopAmbient = useCallback(() => {
    setIsPlaying(false)
    if (noteTimerRef.current) {
      clearTimeout(noteTimerRef.current)
      noteTimerRef.current = null
    }
    const engine = getEngine()
    if (engine) {
      activeVoicesRef.current.forEach(id => engine.voiceOff?.(id))
    }
    activeVoicesRef.current = []
    prevMidiRef.current = 0
    noteCountRef.current = 0
  }, [getEngine])

  const scheduleNext = useCallback(() => {
    if (!enabledRef.current) return

    const engine = getEngine()
    if (!engine) return

    // If user started playing, stop ambient
    if (ribbonInteraction?.current?.active) {
      stopAmbient()
      return
    }

    // Pick and play a gentle note
    const midi = pickNote(scale, octaves, prevMidiRef.current)
    prevMidiRef.current = midi
    const hz = midiToFreq(midi)
    const voiceId = `ambient_${Date.now()}`
    const velocity = 0.08 + Math.random() * 0.12 // very gentle

    engine.voiceOn(voiceId, hz, velocity)
    activeVoicesRef.current.push(voiceId)

    // Short taps — brief sustain (0.3–1.2s)
    const sustain = 300 + Math.random() * 900
    setTimeout(() => {
      engine.voiceOff?.(voiceId)
      activeVoicesRef.current = activeVoicesRef.current.filter(v => v !== voiceId)
    }, sustain)

    noteCountRef.current++

    // Every 8-12 notes, subtly tweak a control for evolving ambient texture
    if (noteCountRef.current % (8 + Math.floor(Math.random() * 5)) === 0) {
      onAmbientTweakRef.current?.()
    }

    // Unhurried pace — longer gaps between notes (2–5s)
    const gap = 2000 + Math.random() * 3000
    noteTimerRef.current = setTimeout(scheduleNext, gap)
  }, [getEngine, scale, octaves, ribbonInteraction, stopAmbient])

  const startAmbient = useCallback(() => {
    if (!enabledRef.current) return
    setIsPlaying(true)
    // Set up ambient-friendly effects (random reverb + delay)
    onAmbientStartRef.current?.()
    // Small delay before first note
    noteTimerRef.current = setTimeout(scheduleNext, 500)
  }, [scheduleNext])

  // Reset inactivity timer when user interacts
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)

    // If ambient is playing, stop it
    if (activeVoicesRef.current.length > 0 || noteTimerRef.current) {
      stopAmbient()
    }

    if (!enabledRef.current) return

    // Start countdown to ambient play
    inactivityTimerRef.current = setTimeout(() => {
      if (enabledRef.current) startAmbient()
    }, INACTIVITY_DELAY)
  }, [stopAmbient, startAmbient])

  // Monitor user activity — reset timer on any interaction
  useEffect(() => {
    if (!enabled) {
      stopAmbient()
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      return
    }

    const events = ['pointerdown', 'keydown', 'touchstart']
    const handler = () => resetInactivityTimer()

    events.forEach(e => window.addEventListener(e, handler, true))
    // Start initial inactivity countdown
    resetInactivityTimer()

    return () => {
      events.forEach(e => window.removeEventListener(e, handler, true))
      stopAmbient()
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    }
  }, [enabled, resetInactivityTimer, stopAmbient])

  // Immediately start ambient (called when user clicks the toggle ON)
  const startNow = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    if (!noteTimerRef.current) startAmbient()
  }, [startAmbient])

  return { isPlaying, startNow }
}
