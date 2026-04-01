import { useRef, useCallback, useEffect } from 'react'

const GATE = 0.5

export function useArpeggiator(getEngine, mode, bpm, notes = [], hold = false) {
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)
  const isArpingRef = useRef(false)
  const bpmRef = useRef(bpm)
  const notesRef = useRef(notes)
  const noteIndexRef = useRef(0)
  bpmRef.current = bpm
  notesRef.current = notes

  const arpStop = useCallback(() => {
    if (!isArpingRef.current) return
    isArpingRef.current = false
    clearTimeout(intervalRef.current)
    clearTimeout(timeoutRef.current)
    intervalRef.current = null
    timeoutRef.current = null
    noteIndexRef.current = 0
    getEngine().noteOff()
  }, [getEngine])

  const playNote = useCallback(() => {
    const engine = getEngine()
    const currentNotes = notesRef.current
    if (currentNotes.length > 0) {
      const idx = noteIndexRef.current % currentNotes.length
      engine.setFrequency(currentNotes[idx])
      noteIndexRef.current = noteIndexRef.current + 1
    }
    engine.noteOn()
  }, [getEngine])

  // Schedule the next arp tick using setTimeout (reads live BPM each tick)
  const scheduleTick = useCallback(() => {
    const ms = 60000 / bpmRef.current
    const gate = ms * GATE

    playNote()
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (isArpingRef.current) getEngine().noteOff()
    }, gate)

    intervalRef.current = setTimeout(() => {
      if (isArpingRef.current) scheduleTick()
    }, ms)
  }, [getEngine, playNote])

  const arpStart = useCallback(() => {
    if (isArpingRef.current) arpStop()
    isArpingRef.current = true
    noteIndexRef.current = 0
    scheduleTick()
  }, [arpStop, scheduleTick])

  // Restart when BPM changes while arping — no delay needed since
  // voiceOn() now forces a clean attack from gain=0
  useEffect(() => {
    if (isArpingRef.current) {
      const savedIndex = noteIndexRef.current
      // Clear timers without calling noteOff (scheduleTick will immediately play)
      clearTimeout(intervalRef.current)
      clearTimeout(timeoutRef.current)
      intervalRef.current = null
      timeoutRef.current = null
      noteIndexRef.current = savedIndex
      scheduleTick()
    }
  }, [bpm]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop arp when mode changes away from arp
  // If hold is on, stop the timer/scheduling but keep notes sounding
  const holdRef = useRef(hold)
  holdRef.current = hold
  useEffect(() => {
    if (mode !== 'arp' && isArpingRef.current) {
      if (holdRef.current) {
        // Hold is on — stop arp scheduling but don't cut the note
        isArpingRef.current = false
        clearTimeout(intervalRef.current)
        clearTimeout(timeoutRef.current)
        intervalRef.current = null
        timeoutRef.current = null
        noteIndexRef.current = 0
      } else {
        arpStop()
      }
    }
  }, [mode, arpStop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(intervalRef.current)
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return { arpStart, arpStop, isArping: () => isArpingRef.current }
}
