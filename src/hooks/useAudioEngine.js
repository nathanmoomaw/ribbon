import { useRef, useCallback, useEffect, useMemo } from 'react'
import { init } from '../audio/AudioEngine'

export function useAudioEngine() {
  const engineRef = useRef(null)

  const ensureInit = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = init()
    }
    return engineRef.current
  }, [])

  // Pre-initialize on first user gesture so AudioContext is created in gesture context
  // (required by iOS Safari — AudioContext created outside gestures stays suspended)
  useEffect(() => {
    const events = ['touchstart', 'touchend', 'mousedown', 'click', 'keydown', 'pointerdown']
    const handler = () => {
      ensureInit()
      events.forEach(e => document.removeEventListener(e, handler, true))
    }
    events.forEach(e => document.addEventListener(e, handler, true))
    return () => events.forEach(e => document.removeEventListener(e, handler, true))
  }, [ensureInit])

  // getEngine() — always returns an engine (initializes if needed)
  // getEngine.peek() — returns engine or null without triggering init (safe for animation loops)
  const getEngine = useMemo(() => {
    const fn = () => ensureInit()
    fn.peek = () => engineRef.current
    return fn
  }, [ensureInit])

  return getEngine
}
