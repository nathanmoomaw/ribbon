import { SCALES } from './scales'

// A4 = 440Hz, MIDI note 69
// C3 = MIDI note 48 = 130.81Hz
const BASE_NOTE = 48

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * Map a normalized ribbon position (0–1) to a frequency in Hz.
 * @param {number} position - 0.0 (left) to 1.0 (right)
 * @param {object} options
 * @param {number} options.octaves - range in octaves (default 2)
 * @param {string} options.scale - scale name from SCALES (default 'chromatic')
 * @param {number} options.baseNote - MIDI note at left edge (default 48 = C3)
 * @returns {number} frequency in Hz
 */
export function positionToFrequency(position, options = {}) {
  const {
    octaves = 2,
    scale = 'chromatic',
    baseNote = BASE_NOTE,
  } = options

  const semitoneRange = octaves * 12
  const rawSemitone = position * semitoneRange

  // Quantize to scale if not chromatic
  const intervals = SCALES[scale] || SCALES.chromatic
  if (scale !== 'chromatic') {
    const octave = Math.floor(rawSemitone / 12)
    const remainder = rawSemitone % 12

    // Find nearest scale degree
    let closest = intervals[0]
    let minDist = Math.abs(remainder - closest)
    for (let i = 1; i < intervals.length; i++) {
      const dist = Math.abs(remainder - intervals[i])
      if (dist < minDist) {
        minDist = dist
        closest = intervals[i]
      }
    }

    const quantized = octave * 12 + closest
    return midiToFreq(baseNote + Math.min(quantized, semitoneRange))
  }

  return midiToFreq(baseNote + rawSemitone)
}
