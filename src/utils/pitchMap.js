import { SCALES } from './scales'

// A4 = 440Hz, MIDI note 69
// C3 = MIDI note 48 = 130.81Hz
const BASE_NOTE = 48

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// Merge intervals from multiple scales into a sorted, deduplicated array
function mergeScaleIntervals(scales) {
  if (!Array.isArray(scales)) scales = [scales]
  const set = new Set()
  for (const s of scales) {
    const intervals = SCALES[s] || SCALES.chromatic
    for (const i of intervals) set.add(i)
  }
  return [...set].sort((a, b) => a - b)
}

/**
 * Map a normalized ribbon position (0–1) to a frequency in Hz.
 * @param {number} position - 0.0 (left) to 1.0 (right)
 * @param {object} options
 * @param {number} options.octaves - range in octaves (default 2)
 * @param {string|string[]} options.scale - scale name(s) from SCALES (default ['chromatic'])
 * @param {boolean} options.stepped - snap to discrete notes (default false)
 * @param {number} options.baseNote - MIDI note at left edge (default 48 = C3)
 * @returns {number} frequency in Hz
 */
export function positionToFrequency(position, options = {}) {
  const {
    octaves = 2,
    scale = ['chromatic'],
    stepped = false,
    baseNote = BASE_NOTE,
  } = options

  const semitoneRange = octaves * 12
  const rawSemitone = position * semitoneRange

  if (stepped) {
    const intervals = mergeScaleIntervals(scale)
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

/**
 * Inverse of positionToFrequency — map a frequency back to a ribbon position (0–1).
 */
export function frequencyToPosition(freq, options = {}) {
  const { octaves = 2, baseNote = BASE_NOTE } = options
  const semitoneRange = octaves * 12
  // freq = 440 * 2^((baseNote + semitone - 69) / 12)
  // semitone = 12 * log2(freq / 440) + 69 - baseNote
  const semitone = 12 * Math.log2(freq / 440) + 69 - baseNote
  return Math.max(0, Math.min(1, semitone / semitoneRange))
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/**
 * Convert a frequency to its nearest note name (e.g., "C", "F#").
 */
export function frequencyToNoteName(freq) {
  const midi = Math.round(12 * Math.log2(freq / 440) + 69)
  return NOTE_NAMES[((midi % 12) + 12) % 12]
}

/**
 * Get all note positions (0–1) for step markers on the ribbon.
 */
export function getStepPositions(options = {}) {
  const { octaves = 2, scale = ['chromatic'] } = options
  const intervals = mergeScaleIntervals(scale)
  const semitoneRange = octaves * 12
  const positions = []

  for (let oct = 0; oct < octaves; oct++) {
    for (const interval of intervals) {
      const semitone = oct * 12 + interval
      if (semitone <= semitoneRange) {
        positions.push(semitone / semitoneRange)
      }
    }
  }
  // Add the final note (top of range)
  if (positions[positions.length - 1] !== 1) {
    positions.push(1)
  }
  return positions
}
