/**
 * VersionSwitcher — inline header element
 * Wide: inline v1 v2 v3 v4 buttons
 * Narrow (≤640px): single "v" toggle that drops a vertical menu
 */
import { useState, useEffect, useRef } from 'react'

export function VersionSwitcher({ current }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  function switchTo(v) {
    if (v === current) return
    window.location.href = `/v${v}/`
  }

  useEffect(() => {
    if (!open) return
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  const versions = [
    { v: 1, label: 'v1', title: 'Ribbon' },
    { v: 2, label: 'v2', title: 'Rock & Rumble' },
    { v: 3, label: 'v3', title: 'ASCII Ribbon' },
    { v: 4, label: 'v4', title: 'v4' },
  ]

  return (
    <>
      {/* Wide: inline row */}
      <div className="version-switcher">
        {versions.map(({ v, label, title }, i) => (
          <>
            {i > 0 && <span key={`sep-${v}`} className="version-sep">|</span>}
            <button
              key={v}
              className={`version-btn${current === v ? ' version-btn--active' : ''}`}
              onClick={() => switchTo(v)}
              title={title}
            >{label}</button>
          </>
        ))}
      </div>

      {/* Narrow: compact "v" toggle + dropdown */}
      <div className="version-switcher--compact" ref={ref}>
        <button
          className={`version-btn version-compact-trigger${open ? ' version-btn--active' : ''}`}
          onClick={() => setOpen(o => !o)}
          title="Switch version"
          aria-expanded={open}
        >v</button>
        {open && (
          <div className="version-dropdown">
            {versions.map(({ v, label, title }) => (
              <button
                key={v}
                className={`version-btn${current === v ? ' version-btn--active' : ''}`}
                onClick={() => switchTo(v)}
                title={title}
              >{label}</button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
