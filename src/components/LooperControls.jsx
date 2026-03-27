import { memo } from 'react'
import './LooperControls.css'

/**
 * Circular record/play buttons for the capture/looper system.
 * Record: red circle. Play: green triangle.
 * Return key toggles recording.
 */
export const LooperControls = memo(function LooperControls({
  recording,
  playing,
  hasLoop,
  onToggleRecord,
  onTogglePlay,
}) {
  return (
    <div className="looper">
      <button
        className={`looper__btn looper__record ${recording ? 'looper__record--active' : ''}`}
        onClick={onToggleRecord}
        title={recording ? 'Stop recording (Return)' : 'Start recording (Return)'}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
      >
        <span className="looper__record-dot" />
      </button>
      <button
        className={`looper__btn looper__play ${playing ? 'looper__play--active' : ''}`}
        onClick={onTogglePlay}
        disabled={!hasLoop && !playing}
        title={playing ? 'Stop loop' : 'Play loop'}
        aria-label={playing ? 'Stop loop' : 'Play loop'}
      >
        {playing ? (
          <span className="looper__stop-icon" />
        ) : (
          <span className="looper__play-icon" />
        )}
      </button>
    </div>
  )
})
