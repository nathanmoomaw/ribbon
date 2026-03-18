import './ActivationMode.css'

const COLORS = {
  clementine: '#FF7F32',
  grapefruit: '#FF5A6E',
  avocado: '#8DB600',
  lemon: '#FFD23F',
  sky: '#5DADE2',
  eggplant: '#8E44AD',
  lime: '#7FFF00',
  silver: '#AAB7B8',
  blood: '#CC3300',
}

function Light({ color, on }) {
  return (
    <span
      className={`switch-light ${on ? 'switch-light--on' : ''}`}
      style={{ '--light-color': color }}
    />
  )
}

function RockerSwitch({ leftLabel, rightLabel, leftLights, rightLights, isRight, onToggle }) {
  return (
    <div className="rocker" onClick={onToggle}>
      <div className={`rocker__side ${!isRight ? 'rocker__side--active' : ''}`}>
        <div className="rocker__lights">
          {leftLights.map((color, i) => (
            <Light key={i} color={color} on={!isRight} />
          ))}
        </div>
        <span className="rocker__label">{leftLabel}</span>
      </div>
      <div className="rocker__divider" />
      <div className={`rocker__side ${isRight ? 'rocker__side--active' : ''}`}>
        <div className="rocker__lights">
          {rightLights.map((color, i) => (
            <Light key={i} color={color} on={isRight} />
          ))}
        </div>
        <span className="rocker__label">{rightLabel}</span>
      </div>
    </div>
  )
}

export function ActivationMode({ mode, setMode, poly, setPoly, arpBpm, setArpBpm, hold, setHold, onStop, onKillAll }) {
  const lastStopRef = { current: 0 }

  const handleStop = () => {
    const now = Date.now()
    const elapsed = now - lastStopRef.current
    lastStopRef.current = now

    if (elapsed < 400) {
      // Double-tap: kill all sound including tails
      onKillAll?.()
    } else {
      // Single tap: normal stop
      onStop?.()
    }
  }

  return (
    <div className="activation">
      {/* Desktop order (top→bottom): Play/Arp, Mono/Poly, Hold, BPM, Stop */}
      {/* Mobile Row 1: Play/Arp, Hold, Stop */}
      {/* Mobile Row 2: Mono/Poly, BPM */}
      <RockerSwitch
        leftLabel="Play"
        rightLabel="Arp"
        leftLights={[COLORS.clementine]}
        rightLights={[COLORS.grapefruit, COLORS.avocado, COLORS.lemon]}
        isRight={mode === 'arp'}
        onToggle={() => setMode(m => m === 'play' ? 'arp' : 'play')}
      />
      <RockerSwitch
        leftLabel="Mono"
        rightLabel="Poly"
        leftLights={[COLORS.sky]}
        rightLights={[COLORS.eggplant, COLORS.lime, COLORS.silver]}
        isRight={poly}
        onToggle={() => setPoly(p => !p)}
      />
      <button
        className={`activation__hold ${hold ? 'active' : ''}`}
        onClick={() => setHold(h => !h)}
        title="Hold note"
      >
        <Light color={COLORS.blood} on={hold} />
        Hold
        <kbd>4</kbd>
      </button>
      <button
        className="activation__stop"
        onClick={handleStop}
      >
        Stop <kbd>Space</kbd>
      </button>
      <div className={`activation__arp-tempo ${mode !== 'arp' ? 'activation__arp-tempo--inactive' : ''}`}>
        <label className="activation__tempo-label">
          BPM <span className="activation__tempo-value">{arpBpm}</span>
        </label>
        <input
          type="range"
          min="40"
          max="300"
          step="1"
          value={arpBpm}
          onChange={(e) => setArpBpm(Number(e.target.value))}
          disabled={mode !== 'arp'}
        />
      </div>
    </div>
  )
}
