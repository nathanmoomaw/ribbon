import './ActivationMode.css'

const MODES = [
  { id: 'play', label: 'Play', key: '1', description: 'Sound while touching' },
  { id: 'latch', label: 'Latch', key: '2', description: 'Touch to start, Space to stop' },
  { id: 'arp', label: 'Arp', key: '3', description: 'Rhythmic retrigger while touching' },
]

export function ActivationMode({ mode, setMode, inputMode, setInputMode, getEngine, arpBpm, setArpBpm, hold, setHold }) {
  const handleStop = () => {
    getEngine().allNotesOff()
  }

  return (
    <div className="activation">
      <div className="activation__group">
        <label className="activation__group-label">Play Mode</label>
        <div className="activation__modes">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={mode === m.id || (mode === 'latch+arp' && (m.id === 'latch' || m.id === 'arp')) ? 'active' : ''}
              disabled={m.disabled}
              onClick={() => {
                if (m.disabled) return
                if (m.id === 'play') { setMode('play'); return }
                if (m.id === 'latch') {
                  setMode(prev => prev === 'arp' ? 'latch+arp' : prev === 'latch+arp' ? 'arp' : 'latch')
                } else if (m.id === 'arp') {
                  setMode(prev => prev === 'latch' ? 'latch+arp' : prev === 'latch+arp' ? 'latch' : 'arp')
                }
              }}
              title={m.description}
            >
              {m.label}
              <kbd>{m.key}</kbd>
            </button>
          ))}
          <button
            className={hold ? 'active' : ''}
            onClick={() => setHold((h) => !h)}
            title="Hold note and control pitch globally"
          >
            Hold
            <kbd>4</kbd>
          </button>
          {mode.includes('latch') && (
            <button className="activation__stop" onClick={handleStop}>
              Stop <kbd>Space</kbd>
            </button>
          )}
          {mode.includes('arp') && (
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

      <button
        className={`activation__keys-toggle ${inputMode === 'keys' ? 'active' : ''}`}
        onClick={() => setInputMode(inputMode === 'keys' ? 'touch' : 'keys')}
        title="A-L keys control ribbon"
      >
        Keys
      </button>

    </div>
  )
}
