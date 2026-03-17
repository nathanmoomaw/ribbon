import { useEffect, useRef, useCallback, useState } from 'react'
import { SCALES } from '../utils/scales'

// Ambient play — generative pleasant tones from the current scale
// Toggled on/off by user; stays active even while user interacts with controls

const BASE_NOTE = 48 // C3 MIDI

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function pickNote(scale, octaves, prevMidi) {
  const scaleKey = Array.isArray(scale) ? scale[0] : scale
  const intervals = SCALES[scaleKey] || SCALES.pentatonic
  const oct = Math.floor(Math.random() * octaves)
  const interval = intervals[Math.floor(Math.random() * intervals.length)]
  let midi = BASE_NOTE + oct * 12 + interval

  if (prevMidi > 0) {
    const step = midi - prevMidi
    if (Math.abs(step) > 7) {
      midi += (step > 0 ? -1 : 1) * 12
    }
  }

  const semitoneRange = octaves * 12
  return Math.max(BASE_NOTE, Math.min(BASE_NOTE + semitoneRange, midi))
}

export function useAmbientPlay(getEngine, enabled, scale, octaves, onAmbientTweak, onAmbientStart) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSleeping, setIsSleeping] = useState(false)
  const playingRef = useRef(false)
  const intervalRef = useRef(null)
  const prevMidiRef = useRef(0)
  const noteCountRef = useRef(0)
  const nextNoteTimeRef = useRef(0)
  const sleepTimerRef = useRef(null)

  // Keep all values in refs so the interval callback always reads current state
  const scaleRef = useRef(scale)
  const octavesRef = useRef(octaves)
  const getEngineRef = useRef(getEngine)
  const onAmbientTweakRef = useRef(onAmbientTweak)
  const onAmbientStartRef = useRef(onAmbientStart)

  scaleRef.current = scale
  octavesRef.current = octaves
  getEngineRef.current = getEngine
  onAmbientTweakRef.current = onAmbientTweak
  onAmbientStartRef.current = onAmbientStart

  const stopPlaying = useCallback(() => {
    if (!playingRef.current) return
    playingRef.current = false
    setIsPlaying(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    prevMidiRef.current = 0
    noteCountRef.current = 0
    nextNoteTimeRef.current = 0

    // Trigger sleep shimmer animation
    setIsSleeping(true)
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current)
    sleepTimerRef.current = setTimeout(() => setIsSleeping(false), 1500)
  }, [])

  const startPlaying = useCallback(() => {
    if (playingRef.current) return
    playingRef.current = true
    setIsPlaying(true)
    setIsSleeping(false)
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current)

    // Set up ambient-friendly effects
    onAmbientStartRef.current?.()

    // Schedule the first note soon
    nextNoteTimeRef.current = Date.now() + 400

    // Use a polling interval that checks if it's time to play a note
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      if (!playingRef.current) return

      const now = Date.now()
      if (now < nextNoteTimeRef.current) return // not time yet

      const engine = getEngineRef.current()
      if (!engine) return

      // Play a gentle note
      const midi = pickNote(scaleRef.current, octavesRef.current, prevMidiRef.current)
      prevMidiRef.current = midi
      const hz = midiToFreq(midi)
      const voiceId = `ambient_${now}`
      const velocity = 0.12 + Math.random() * 0.13

      engine.voiceOn(voiceId, hz, velocity)

      // Short tap — release after brief sustain
      const sustain = 300 + Math.random() * 900
      setTimeout(() => {
        engine.voiceOff?.(voiceId)
      }, sustain)

      noteCountRef.current++

      // Every 8-12 notes, subtly tweak a control
      if (noteCountRef.current % (8 + Math.floor(Math.random() * 5)) === 0) {
        onAmbientTweakRef.current?.()
      }

      // Schedule next note 2–5s from now
      nextNoteTimeRef.current = now + 2000 + Math.random() * 3000
    }, 250)
  }, [stopPlaying])

  // Stop when disabled
  useEffect(() => {
    if (!enabled) stopPlaying()
  }, [enabled, stopPlaying])

  // Clean up on unmount only
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current)
      playingRef.current = false
    }
  }, [])

  const startNow = useCallback(() => {
    startPlaying()
  }, [startPlaying])

  const stopNow = useCallback(() => {
    stopPlaying()
  }, [stopPlaying])

  return { isPlaying, isSleeping, startNow, stopNow }
}
