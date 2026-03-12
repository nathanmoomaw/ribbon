import './ActivationMode.css'

const MODES = [
  { id: 'play', label: 'Play', key: '1', description: 'Sound while touching' },
  { id: 'latch', label: 'Latch', key: '2', description: 'Touch to start, Space to stop' },
  { id: 'arp', label: 'Arp', key: '3', description: 'Rhythmic retrigger while touching' },
]

const INPUT_MODES = [
  { id: 'touch', label: 'Touch' },
  { id: 'keys', label: 'Keys', description: 'A-L keys control ribbon' },
]

const VISUAL_MODES = [
  { id: 'party', label: 'Party' },
  { id: 'lo', label: 'Lo' },
]

export function ActivationMode({ mode, setMode, inputMode, setInputMode, getEngine, visualMode, setVisualMode, arpBpm, setArpBpm }) {
  const handleStop = () => {
    getEngine().noteOff()
  }

  return (
    <div className="activation">
      <div className="activation__group">
        <label className="activation__group-label">Play Mode</label>
        <div className="activation__modes">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={mode === m.id ? 'active' : ''}
              disabled={m.disabled}
              onClick={() => !m.disabled && setMode(m.id)}
              title={m.description}
            >
              {m.label}
              <kbd>{m.key}</kbd>
            </button>
          ))}
          {mode === 'latch' && (
            <button className="activation__stop" onClick={handleStop}>
              Stop <kbd>Space</kbd>
            </button>
          )}
          {mode === 'arp' && (
            <div className="activation__arp-tempo">
              <label className="activation__group-label">
                BPM <span className="controls__value">{arpBpm}</span>
              </label>
              <input
                type="range"
                min="40"
                max="300"
                step="1"
                value={arpBpm}
                onChange={(e) => setArpBpm(Number(e.target.value))}
              />
            </div>
          )}
        </div>
      </div>

      <div className="activation__group">
        <label className="activation__group-label">Input</label>
        <div className="activation__modes">
          {INPUT_MODES.map((m) => (
            <button
              key={m.id}
              className={inputMode === m.id ? 'active' : ''}
              onClick={() => setInputMode(m.id)}
              title={m.description}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="activation__group">
        <label className="activation__group-label">Visuals</label>
        <div className="activation__modes">
          {VISUAL_MODES.map((m) => (
            <button
              key={m.id}
              className={visualMode === m.id ? 'active' : ''}
              onClick={() => setVisualMode(m.id)}
            >
              {m.label}
              {m.id === 'lo' && <kbd>V</kbd>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
