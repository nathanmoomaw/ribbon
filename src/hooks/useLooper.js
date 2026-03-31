import { useState, useRef, useCallback } from 'react'

const MAX_LOOP_MS = 33300 // 33.3 seconds

/**
 * Event-based looper — records user interactions as timestamped events,
 * plays them back in a loop via setTimeout chains.
 *
 * Event format: { t: number, type: string, data: any }
 * Types: 'voice_on', 'voice_off', 'voice_move', 'knob', 'mode', 'shake'
 */
export function useLooper(replayCallbacks) {
  const [recording, setRecording] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [hasLoop, setHasLoop] = useState(false)

  const eventsRef = useRef([])
  const loopDurationRef = useRef(0)
  const recordStartRef = useRef(0)
  const playbackTimersRef = useRef([])
  const replayPassRef = useRef(null)

  // Record a single event
  const recordEvent = useCallback((type, data) => {
    if (!recording) return
    const t = performance.now() - recordStartRef.current
    if (t > MAX_LOOP_MS) return // cap at max duration
    eventsRef.current.push({ t, type, data })
  }, [recording])

  // Start recording — also engages playback immediately
  const startRecording = useCallback(() => {
    if (recording) {
      // Stop recording
      const duration = Math.min(performance.now() - recordStartRef.current, MAX_LOOP_MS)
      loopDurationRef.current = duration
      setRecording(false)
      setHasLoop(eventsRef.current.length > 0)
      // Start playback of what was just recorded
      if (eventsRef.current.length > 0) {
        setPlaying(true)
        // Defer replay to next tick so state is settled
        setTimeout(() => replayPassRef.current?.(), 0)
      }
      return
    }

    // If layering (recording while playing), keep existing events
    if (!playing) {
      eventsRef.current = []
      loopDurationRef.current = 0
    }

    recordStartRef.current = performance.now()
    setRecording(true)
    // Also engage play state so user sees it's active
    setPlaying(true)
  }, [recording, playing])

  // Replay a single pass of events
  const replayPass = useCallback(() => {
    const events = eventsRef.current
    const duration = loopDurationRef.current
    if (events.length === 0 || duration === 0) return

    const timers = []
    const callbacks = replayCallbacks.current

    for (const event of events) {
      const timer = setTimeout(() => {
        const cb = callbacks[event.type]
        if (cb) cb(event.data)
      }, event.t)
      timers.push(timer)
    }

    // Schedule next loop pass
    const loopTimer = setTimeout(() => {
      if (playbackTimersRef.current.length > 0) {
        replayPass()
      }
    }, duration)
    timers.push(loopTimer)

    playbackTimersRef.current = timers
  }, [replayCallbacks])

  replayPassRef.current = replayPass

  // Start playback
  const startPlayback = useCallback(() => {
    if (eventsRef.current.length === 0) return
    setPlaying(true)
    replayPass()
  }, [replayPass])

  // Stop playback
  const stopPlayback = useCallback(() => {
    for (const timer of playbackTimersRef.current) {
      clearTimeout(timer)
    }
    playbackTimersRef.current = []
    setPlaying(false)
  }, [])

  // Toggle recording (mapped to Return key)
  const toggleRecording = useCallback(() => {
    startRecording()
  }, [startRecording])

  // Toggle playback
  const togglePlayback = useCallback(() => {
    if (playing) {
      stopPlayback()
    } else {
      startPlayback()
    }
  }, [playing, stopPlayback, startPlayback])

  // Get events for serialization (QR presets)
  const getLoopData = useCallback(() => {
    if (eventsRef.current.length === 0) return null
    return {
      events: eventsRef.current,
      duration: loopDurationRef.current,
    }
  }, [])

  // Load loop data (from QR preset)
  const loadLoopData = useCallback((data) => {
    if (!data || !data.events) return
    eventsRef.current = data.events
    loopDurationRef.current = data.duration
    setHasLoop(true)
    startPlayback()
  }, [startPlayback])

  return {
    recording,
    playing,
    hasLoop,
    recordEvent,
    toggleRecording,
    togglePlayback,
    getLoopData,
    loadLoopData,
  }
}
