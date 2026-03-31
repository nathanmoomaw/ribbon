import { useState, useCallback, useEffect } from 'react'
import './MobileSplash.css'

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768
}

function requestFullscreen() {
  const el = document.documentElement
  const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen
  if (rfs) {
    rfs.call(el).catch(() => {})
  }
}

export function MobileSplash({ onEnter }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show on mobile, and only once per session
    if (isMobile() && !sessionStorage.getItem('ribbon_splashed')) {
      setVisible(true)
    }
  }, [])

  const handleEnter = useCallback(() => {
    sessionStorage.setItem('ribbon_splashed', '1')
    requestFullscreen()
    setVisible(false)
    onEnter?.()
  }, [onEnter])

  if (!visible) return null

  return (
    <div className="mobile-splash" onClick={handleEnter}>
      <div className="mobile-splash__content">
        <div className="mobile-splash__logo">ribbon</div>
        <div className="mobile-splash__hint">tap to enter</div>
      </div>
    </div>
  )
}
