import { memo, useMemo } from 'react'
import './GoopOverlay.css'

/**
 * SVG overlay that renders goop blobs on top of gooped controls.
 * Blobs scale with goop level (0-1). Pointer-events: none so they don't block interaction.
 */
export const GoopOverlay = memo(function GoopOverlay({ goopLevels }) {
  // Convert goop levels to renderable blobs
  const blobs = useMemo(() => {
    const entries = Object.entries(goopLevels)
    if (entries.length === 0) return null
    return entries
      .filter(([, level]) => level > 0.01)
      .map(([id, level]) => ({ id, level }))
  }, [goopLevels])

  if (!blobs || blobs.length === 0) return null

  return (
    <div className="goop-overlay">
      {blobs.map(({ id, level }) => (
        <div
          key={id}
          className="goop-overlay__blob"
          data-control={id}
          style={{
            '--goop-level': level,
            '--goop-opacity': Math.min(0.6, level * 0.7),
            '--goop-scale': 0.3 + level * 0.7,
          }}
        >
          <svg viewBox="0 0 60 40" className="goop-overlay__svg">
            <ellipse
              cx="30"
              cy="20"
              rx={15 + level * 12}
              ry={8 + level * 8}
              fill="none"
              stroke={`rgba(120, 80, 200, ${level * 0.5})`}
              strokeWidth="1.5"
            />
            {level > 0.3 && (
              <ellipse
                cx={22 + level * 8}
                cy={14 + level * 4}
                rx={6 + level * 6}
                ry={4 + level * 4}
                fill="none"
                stroke={`rgba(180, 100, 255, ${level * 0.4})`}
                strokeWidth="1"
              />
            )}
            {level > 0.6 && (
              <circle
                cx={38}
                cy={25}
                r={3 + level * 4}
                fill="none"
                stroke={`rgba(100, 200, 255, ${level * 0.3})`}
                strokeWidth="1"
              />
            )}
          </svg>
        </div>
      ))}
    </div>
  )
})
