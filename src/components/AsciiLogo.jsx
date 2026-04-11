import { useEffect, useRef } from 'react'
import './AsciiLogo.css'

// ASCII moebius strip animation frames
const FRAMES = [
  '╔═══∞═══╗',
  '╔══∞∞═══╗',
  '╔═∞∞∞══╗',
  '╔∞∞∞∞═╗',
  '╔∞∞∞╗∞╗',
  '╔═∞╗∞∞╗',
  '╔══╗∞∞∞╗',
  '╔═══╗∞∞╗',
]

const TAGLINE = 'v3 · text ribbon'

export function AsciiLogo({ onClick }) {
  const frameRef = useRef(null)
  const idxRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      idxRef.current = (idxRef.current + 1) % FRAMES.length
      if (frameRef.current) {
        frameRef.current.textContent = FRAMES[idxRef.current]
      }
    }, 120)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="ascii-logo" onClick={onClick} role="button" tabIndex={0}>
      <span className="ascii-logo__ribbon">ribbon</span>
      <span className="ascii-logo__moebius" ref={frameRef}>{FRAMES[0]}</span>
      <span className="ascii-logo__tag">{TAGLINE}</span>
    </div>
  )
}
