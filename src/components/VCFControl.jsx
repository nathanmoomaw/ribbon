import { memo, useCallback } from 'react'
import { RotaryKnob } from './RotaryKnob'
import './VCFControl.css'

const OSC_COLORS = ['var(--osc-red)', 'var(--osc-gold)', 'var(--osc-green)']
const OSC_LABELS = ['1', '2', '3']

/**
 * VCF — voltage-controlled filter with per-oscillator routing.
 * Single cutoff knob + 3 routing buttons to assign to any combo of oscillators.
 */
export const VCFControl = memo(function VCFControl({
  vcfCutoff,
  vcfResonance,
  vcfRouting,
  getEngine,
  onCutoffChange,
  onResonanceChange,
  onRoutingToggle,
}) {
  const handleCutoff = useCallback((val) => {
    onCutoffChange(val)
    getEngine().setVcfCutoff(val)
  }, [getEngine, onCutoffChange])

  const handleResonance = useCallback((val) => {
    onResonanceChange(val)
    getEngine().setVcfResonance(val)
  }, [getEngine, onResonanceChange])

  const handleRouteToggle = useCallback((index) => {
    const newEnabled = !vcfRouting[index]
    onRoutingToggle(index, newEnabled)
    getEngine().setVcfRouting(index, newEnabled)
  }, [vcfRouting, getEngine, onRoutingToggle])

  const anyRouted = vcfRouting.some(Boolean)

  return (
    <div className={`vcf-control ${anyRouted ? 'vcf-control--active' : ''}`}>
      <label className="vcf-control__label">VCF</label>
      <div className="vcf-control__knobs">
        <RotaryKnob
          value={vcfCutoff}
          min={20}
          max={20000}
          step={1}
          onChange={handleCutoff}
          color="#e040fb"
          label="Cut"
          size={38}
        />
        <RotaryKnob
          value={vcfResonance}
          min={0}
          max={25}
          step={0.1}
          onChange={handleResonance}
          color="#e040fb"
          label="Res"
          size={38}
        />
      </div>
      <div className="vcf-control__routing">
        {vcfRouting.map((enabled, i) => (
          <button
            key={i}
            className={`vcf-control__route-btn ${enabled ? 'active' : ''}`}
            style={{ '--route-color': OSC_COLORS[i] }}
            onClick={() => handleRouteToggle(i)}
            title={`Route OSC ${i + 1} through VCF`}
          >
            {OSC_LABELS[i]}
          </button>
        ))}
      </div>
    </div>
  )
})
