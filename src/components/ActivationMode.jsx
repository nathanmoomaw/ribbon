import './ActivationMode.css'

const MODES = [
  { id: 'play', label: 'Play', key: '1', description: 'Sound while touching' },
  { id: 'latch', label: 'Latch', key: '2', description: 'Touch to start, Space to stop' },
  { id: 'arp', label: 'Arp', key: '3', description: 'Coming soon', disabled: true },
]

export function ActivationMode({ mode, setMode, getEngine }) {
  const handleStop = () => {
    getEngine().noteOff()
  }

  return (
    <div className="activation">
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
      </div>
      {mode === 'latch' && (
        <button className="activation__stop" onClick={handleStop}>
          Stop <kbd>Space</kbd>
        </button>
      )}
    </div>
  )
}
