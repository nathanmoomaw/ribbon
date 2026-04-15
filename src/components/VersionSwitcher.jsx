/**
 * VersionSwitcher — fixed upper-left overlay
 * Switches between v2 (Puddle) and v3 (ASCII Ribbon) via ?v= URL param.
 */
export function VersionSwitcher({ current }) {
  function switchTo(v) {
    const url = new URL(window.location.href)
    if (v === 2) {
      url.searchParams.set('v', '2')
    } else {
      url.searchParams.delete('v')
    }
    window.location.href = url.toString()
  }

  return (
    <div className="version-switcher">
      <button
        className={`version-btn${current === 2 ? ' version-btn--active' : ''}`}
        onClick={() => switchTo(2)}
        title="v2 Puddle"
      >v2</button>
      <span className="version-sep">|</span>
      <button
        className={`version-btn${current === 3 ? ' version-btn--active' : ''}`}
        onClick={() => switchTo(3)}
        title="v3 ASCII Ribbon"
      >v3</button>
    </div>
  )
}
