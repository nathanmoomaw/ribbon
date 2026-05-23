/**
 * VersionSwitcher — inline header element
 * Navigates between version snapshots via URL paths: /v1/ /v2/ / (v3=root) /v4/
 */
export function VersionSwitcher({ current }) {
  function switchTo(v) {
    if (v === current) return
    window.location.href = `/v${v}/`
  }

  return (
    <div className="version-switcher">
      <button
        className={`version-btn${current === 1 ? ' version-btn--active' : ''}`}
        onClick={() => switchTo(1)}
        title="v1 Ribbon"
      >v1</button>
      <span className="version-sep">|</span>
      <button
        className={`version-btn${current === 2 ? ' version-btn--active' : ''}`}
        onClick={() => switchTo(2)}
        title="v2 Rock &amp; Rumble"
      >v2</button>
      <span className="version-sep">|</span>
      <button
        className={`version-btn${current === 3 ? ' version-btn--active' : ''}`}
        onClick={() => switchTo(3)}
        title="v3 ASCII Ribbon"
      >v3</button>
      <span className="version-sep">|</span>
      <button
        className={`version-btn${current === 4 ? ' version-btn--active' : ''}`}
        onClick={() => switchTo(4)}
        title="v4"
      >v4</button>
    </div>
  )
}
