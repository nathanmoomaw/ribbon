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

function SynthSwitch({ leftLabel, rightLabel, leftLights, rightLights, isRight, onToggle }) {
  return (
    <div className="synth-switch" onClick={onToggle}>
      <div className={`synth-switch__side ${!isRight ? 'synth-switch__side--active' : ''}`}>
        <div className="synth-switch__lights">
          {leftLights.map((color, i) => (
            <Light key={i} color={color} on={!isRight} />
          ))}
        </div>
        <span className="synth-switch__label">{leftLabel}</span>
      </div>
      <div className={`synth-switch__track ${isRight ? 'synth-switch__track--right' : ''}`}>
        <div className="synth-switch__thumb" />
      </div>
      <div className={`synth-switch__side ${isRight ? 'synth-switch__side--active' : ''}`}>
        <div className="synth-switch__lights">
          {rightLights.map((color, i) => (
            <Light key={i} color={color} on={isRight} />
          ))}
        </div>
        <span className="synth-switch__label">{rightLabel}</span>
      </div>
    </div>
  )
}

export function ActivationMode({ mode, setMode, poly, setPoly, getEngine, arpBpm, setArpBpm, hold, setHold }) {
  const handleStop = () => {
    getEngine().allNotesOff()
  }

  return (
    <div className="activation">
      <SynthSwitch
        leftLabel="Play"
        rightLabel="Arp"
        leftLights={[COLORS.clementine]}
        rightLights={[COLORS.grapefruit, COLORS.avocado, COLORS.lemon]}
        isRight={mode === 'arp'}
        onToggle={() => setMode(m => m === 'play' ? 'arp' : 'play')}
      />

      <SynthSwitch
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

      {hold && (
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
  )
}
