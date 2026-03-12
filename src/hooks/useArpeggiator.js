import { useRef, useCallback, useEffect } from 'react'

const GATE = 0.5

export function useArpeggiator(getEngine, mode, bpm) {
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)
  const isArpingRef = useRef(false)
  const bpmRef = useRef(bpm)
  bpmRef.current = bpm

  const arpStop = useCallback(() => {
    if (!isArpingRef.current) return
    isArpingRef.current = false
    clearInterval(intervalRef.current)
    clearTimeout(timeoutRef.current)
    intervalRef.current = null
    timeoutRef.current = null
    getEngine().noteOff()
  }, [getEngine])

  const arpStart = useCallback(() => {
    if (isArpingRef.current) arpStop()
    isArpingRef.current = true

    const msPerBeat = 60000 / bpmRef.current
    const gateDuration = msPerBeat * GATE

    // Immediate first note
    getEngine().noteOn()
    timeoutRef.current = setTimeout(() => {
      if (isArpingRef.current) getEngine().noteOff()
    }, gateDuration)

    intervalRef.current = setInterval(() => {
      const ms = 60000 / bpmRef.current
      const gate = ms * GATE
      getEngine().noteOn()
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        if (isArpingRef.current) getEngine().noteOff()
      }, gate)
    }, msPerBeat)
  }, [getEngine, arpStop])

  // Restart interval when BPM changes while arping
  useEffect(() => {
    if (isArpingRef.current) {
      arpStop()
      // Small delay to let noteOff settle before restarting
      const restart = setTimeout(() => {
        isArpingRef.current = true
        const msPerBeat = 60000 / bpm
        const gateDuration = msPerBeat * GATE

        getEngine().noteOn()
        timeoutRef.current = setTimeout(() => {
          if (isArpingRef.current) getEngine().noteOff()
        }, gateDuration)

        intervalRef.current = setInterval(() => {
          const ms = 60000 / bpmRef.current
          const gate = ms * GATE
          getEngine().noteOn()
          clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => {
            if (isArpingRef.current) getEngine().noteOff()
          }, gate)
        }, msPerBeat)
      }, 10)
      return () => clearTimeout(restart)
    }
  }, [bpm]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop arp when mode changes away
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

  return { arpStart, arpStop }
}
