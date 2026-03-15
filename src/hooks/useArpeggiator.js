import { useRef, useCallback, useEffect } from 'react'

const GATE = 0.5

export function useArpeggiator(getEngine, mode, bpm, notes = []) {
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
    clearInterval(intervalRef.current)
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

  const arpStart = useCallback(() => {
    if (isArpingRef.current) arpStop()
    isArpingRef.current = true
    noteIndexRef.current = 0

    const msPerBeat = 60000 / bpmRef.current
    const gateDuration = msPerBeat * GATE

    // Immediate first note
    playNote()
    timeoutRef.current = setTimeout(() => {
      if (isArpingRef.current) getEngine().noteOff()
    }, gateDuration)

    intervalRef.current = setInterval(() => {
      const ms = 60000 / bpmRef.current
      const gate = ms * GATE
      playNote()
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        if (isArpingRef.current) getEngine().noteOff()
      }, gate)
    }, msPerBeat)
  }, [getEngine, arpStop, playNote])

  // Restart interval when BPM changes while arping
  useEffect(() => {
    if (isArpingRef.current) {
      // Preserve note index across BPM changes
      const savedIndex = noteIndexRef.current
      arpStop()
      // Small delay to let noteOff settle before restarting
      const restart = setTimeout(() => {
        isArpingRef.current = true
        noteIndexRef.current = savedIndex
        const msPerBeat = 60000 / bpm
        const gateDuration = msPerBeat * GATE

        playNote()
        timeoutRef.current = setTimeout(() => {
          if (isArpingRef.current) getEngine().noteOff()
        }, gateDuration)

        intervalRef.current = setInterval(() => {
          const ms = 60000 / bpmRef.current
          const gate = ms * GATE
          playNote()
          clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => {
            if (isArpingRef.current) getEngine().noteOff()
          }, gate)
        }, msPerBeat)
      }, 10)
      return () => clearTimeout(restart)
    }
  }, [bpm]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop arp when mode changes away from arp
  useEffect(() => {
    if (mode !== 'arp') {
      arpStop()
    }
  }, [mode, arpStop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return { arpStart, arpStop, isArping: () => isArpingRef.current }
}
