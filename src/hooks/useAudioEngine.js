import { useRef, useCallback } from 'react'
import { init } from '../audio/AudioEngine'

export function useAudioEngine() {
  const engineRef = useRef(null)

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = init()
    }
    return engineRef.current
  }, [])

  return getEngine
}
