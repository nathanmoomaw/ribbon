import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

function MarbleVisual({ marble, size, style, onPointerDown, className = '' }) {
  if (!marble) return null
  const patternClass = marble.pattern ? `marble-visual--${marble.pattern}` : ''
  return (
    <div
      className={`marble-visual ${patternClass} ${className}`}
      style={{
        '--marble-color': marble.color,
        '--marble-highlight': marble.highlight,
        '--marble-shadow': marble.shadow,
        '--marble-size': `${size ?? marble.size}px`,
        ...style,
      }}
      onPointerDown={onPointerDown}
    />
  )
}

// Size multipliers for marble dispensing: 1 = full, 0.5 = half, ~0.333 = third
const MARBLE_SIZES = [1, 0.5, 1 / 3]
const MARBLE_SIZE_LABELS = ['1', '½', '⅓']

export function ActivationMode({
  mode, setMode, poly, setPoly, arpBpm, setArpBpm,
  hold, setHold, onStop, onKillAll,
  trayMarble, draggingMarble, onMarblePickUp, nextSlotId,
}) {
  const lastStopRef = useRef(0)
  // Size selector: 0=full, 1=half, 2=third — resets when tray marble changes
  const [marbleSizeIdx, setMarbleSizeIdx] = useState(0)
  const prevTrayIdRef = useRef(trayMarble?.id)

  // Reset size to full whenever a new marble appears in the tray
  useEffect(() => {
    if (trayMarble?.id !== prevTrayIdRef.current) {
      prevTrayIdRef.current = trayMarble?.id
      setMarbleSizeIdx(0)
    }
  }, [trayMarble?.id])

  const handleStop = () => {
    const now = Date.now()
    const elapsed = now - lastStopRef.current
    lastStopRef.current = now
    if (elapsed < 400) {
      onKillAll?.()
    } else {
      onStop?.()
    }
  }

  const marbleCount = nextSlotId === -1 ? 9 : nextSlotId
  const hasMarbles = marbleCount > 0
  const sizeMultiplier = MARBLE_SIZES[marbleSizeIdx]
  // Display size of tray marble — scaled by current size selector
  const trayDisplaySize = trayMarble
    ? Math.max(Math.round(trayMarble.size * sizeMultiplier), 6)
    : null

  return (
    <div className="activation">
      {/* Desktop order (top→bottom): Play/Arp, Mono/Poly, Hold, BPM, Stop */}
      {/* Mobile Row 1: Play/Arp, Hold, Stop */}
      {/* Mobile Row 2: Mono/Poly, BPM */}
      <RockerSwitch
        leftLabel="Play"
        rightLabel="Arp"
        leftLights={[COLORS.clementine]}
        rightLights={[COLORS.grapefruit]}
        isRight={mode === 'arp'}
        onToggle={() => setMode(m => m === 'play' ? 'arp' : 'play')}
      />
      <RockerSwitch
        leftLabel="Mono"
        rightLabel="Poly"
        leftLights={[COLORS.sky]}
        rightLights={[COLORS.eggplant]}
        isRight={poly}
        onToggle={() => setPoly(p => !p)}
      />

      {/* Hold: left = traditional hold, center = marble dispenser, right = size selector */}
      <div className={`activation__hold-split ${hold ? 'hold-active' : ''}`}>
        <button
          className={`activation__hold-left ${hold ? 'active' : ''}`}
          onClick={() => setHold(h => !h)}
          title="Hold note"
        >
          <Light color={COLORS.blood} on={hold} />
          Hold
          <kbd>4</kbd>
        </button>
        <div className="rocker__divider" />
        <div
          className={`activation__hold-right ${hasMarbles ? 'has-marbles' : ''}`}
          title={nextSlotId === -1 && !trayMarble ? 'All 9 marbles placed' : 'Drag a marble onto the puddle'}
        >
          {trayMarble ? (
            <MarbleVisual
              marble={trayMarble}
              size={trayDisplaySize}
              className="marble-visual--tray"
              onPointerDown={(e) => {
                e.preventDefault()
                onMarblePickUp?.(trayMarble.id, e.clientX, e.clientY, sizeMultiplier)
              }}
            />
          ) : (
            // All marbles are on the puddle
            <span className="activation__marble-full">✦</span>
          )}
        </div>
        <div className="rocker__divider" />
        <button
          className="activation__marble-size"
          onClick={() => setMarbleSizeIdx(i => (i + 1) % MARBLE_SIZES.length)}
          title={`Marble size: ${MARBLE_SIZE_LABELS[marbleSizeIdx]} — click to change`}
        >
          <span className="activation__marble-size-icon">◉</span>
          <span className="activation__marble-size-label">{MARBLE_SIZE_LABELS[marbleSizeIdx]}</span>
        </button>
      </div>

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
          className="slider--coral"
          type="range"
          min="40"
          max="300"
          step="1"
          value={arpBpm}
          onChange={(e) => setArpBpm(Number(e.target.value))}
          disabled={mode !== 'arp'}
        />
      </div>

      {/* Dragging marble portal — renders at pointer position above everything */}
      {draggingMarble && createPortal(
        <MarbleVisual
          marble={draggingMarble}
          className="marble-visual--dragging"
          style={{
            position: 'fixed',
            left: (draggingMarble.dragX ?? 0) - draggingMarble.size / 2,
            top: (draggingMarble.dragY ?? 0) - draggingMarble.size / 2,
            pointerEvents: 'none',
            zIndex: 10000,
          }}
        />,
        document.body
      )}
    </div>
  )
}
