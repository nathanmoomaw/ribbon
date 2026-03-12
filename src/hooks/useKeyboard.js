import { useEffect } from 'react'

export function useKeyboard(handlers) {
  useEffect(() => {
    function onKeyDown(e) {
      // Ignore if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      const handler = handlers[e.code] || handlers[e.key]
      if (handler) {
        e.preventDefault()
        handler(e)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
