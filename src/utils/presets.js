/**
 * Preset serialization/deserialization for shareable QR codes.
 * Encodes all synth settings into a compact URL-safe string.
 */

const PRESET_VERSION = 1

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle']

function waveformToIndex(w) { return WAVEFORMS.indexOf(w) }
function indexToWaveform(i) { return WAVEFORMS[i] || 'sawtooth' }

function round3(n) {
  return Math.round(n * 1000) / 1000
}

/**
 * Encode all synth settings into a compact URL-safe base64 string.
 */
export function serializePreset(settings) {
  const preset = {
    v: PRESET_VERSION,
    m: settings.mode,
    o: settings.oscParams.map(p => ([
      waveformToIndex(p.waveform),
      Math.round(p.detune),
      round3(p.mix),
    ])),
    vol: round3(settings.volume),
    oct: settings.octaves,
    dl: [round3(settings.delayParams.time), round3(settings.delayParams.feedback), round3(settings.delayParams.mix)],
    rv: round3(settings.reverbMix),
    cr: round3(settings.crunch),
    fl: [Math.round(settings.filterParams.cutoff), round3(settings.filterParams.resonance)],
    gs: round3(settings.glideSpeed),
    st: settings.stepped ? 1 : 0,
    sc: settings.scale,
    py: settings.poly ? 1 : 0,
    hd: settings.hold ? 1 : 0,
    bpm: settings.arpBpm,
    vm: settings.visualMode === 'lo' ? 1 : 0,
  }
  const json = JSON.stringify(preset)
  return btoa(unescape(encodeURIComponent(json)))
}

/**
 * Decode a preset string back into full settings.
 * Returns null if invalid.
 */
export function deserializePreset(encoded) {
  try {
    const json = decodeURIComponent(escape(atob(encoded)))
    const p = JSON.parse(json)
    if (p.v !== PRESET_VERSION) return null

    return {
      mode: p.m,
      oscParams: p.o.map(arr => ({
        waveform: indexToWaveform(arr[0]),
        detune: arr[1],
        mix: arr[2],
      })),
      volume: p.vol,
      octaves: p.oct,
      delayParams: { time: p.dl[0], feedback: p.dl[1], mix: p.dl[2] },
      reverbMix: p.rv,
      crunch: p.cr,
      filterParams: { cutoff: p.fl[0], resonance: p.fl[1] },
      glideSpeed: p.gs,
      stepped: p.st === 1,
      scale: p.sc,
      poly: p.py === 1,
      hold: p.hd === 1,
      arpBpm: p.bpm,
      visualMode: p.vm === 1 ? 'lo' : 'party',
    }
  } catch {
    return null
  }
}

/**
 * Build a full shareable URL with the preset encoded in the hash.
 */
export function buildPresetUrl(settings) {
  const encoded = serializePreset(settings)
  const base = window.location.origin + window.location.pathname
  return `${base}#p=${encoded}`
}

/**
 * Try to read a preset from the current URL hash.
 * Returns deserialized settings or null.
 */
export function readPresetFromUrl() {
  const hash = window.location.hash
  if (!hash.startsWith('#p=')) return null
  return deserializePreset(hash.slice(3))
}
