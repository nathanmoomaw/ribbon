/**
 * Preset serialization/deserialization for shareable QR codes.
 * Encodes all synth settings into a compact URL-safe string.
 */

import { keccak256, stringToHex } from 'viem'

const PRESET_VERSION = 1

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle']

function waveformToIndex(w) { return WAVEFORMS.indexOf(w) }
function indexToWaveform(i) { return WAVEFORMS[i] || 'sawtooth' }

function round3(n) {
  return Math.round(n * 1000) / 1000
}

/**
 * Compute a deterministic keccak256 hash of the musical settings.
 * Excludes wallet address, visual mode, and loop data — those are
 * not part of the sound identity. Returns a 0x-prefixed hex string
 * suitable for use as the on-chain content hash when minting a Puddle.
 */
export function computePresetHash(settings) {
  // Canonical object — fixed key insertion order, no undefined values
  const canonical = {
    v:   PRESET_VERSION,
    m:   settings.mode,
    o:   settings.oscParams.map(p => [waveformToIndex(p.waveform), Math.round(p.detune), round3(p.mix)]),
    oct: settings.octaves,
    dl:  [round3(settings.delayParams.time), round3(settings.delayParams.feedback), round3(settings.delayParams.mix)],
    rv:  round3(settings.reverbMix),
    cr:  round3(settings.crunch),
    fl:  [Math.round(settings.filterParams.cutoff), round3(settings.filterParams.resonance)],
    gs:  round3(settings.glideSpeed),
    st:  settings.stepped ? 1 : 0,
    sc:  settings.scale,
    py:  settings.poly ? 1 : 0,
    hd:  settings.hold ? 1 : 0,
    bpm: settings.arpBpm,
  }

  // Optional fields — only include when non-empty so identical sounds hash identically
  if (settings.arpNotes?.length > 0) {
    canonical.an = settings.arpNotes.map(Math.round).sort((a, b) => a - b)
  }
  if (settings.vcfCutoff != null) {
    canonical.vc = [Math.round(settings.vcfCutoff), round3(settings.vcfResonance)]
    canonical.vr = settings.vcfRouting
  }
  if (settings.marbles?.length > 0) {
    // Sort by id for determinism regardless of drop order
    canonical.mb = [...settings.marbles]
      .sort((a, b) => a.id - b.id)
      .map(m => [m.id, round3(m.x), round3(m.y)])
  }

  return keccak256(stringToHex(JSON.stringify(canonical)))
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
    an: settings.arpNotes?.length > 0 ? settings.arpNotes.map(Math.round) : undefined,
  }

  // VCF settings
  if (settings.vcfCutoff != null) {
    preset.vc = [Math.round(settings.vcfCutoff), round3(settings.vcfResonance)]
    preset.vr = settings.vcfRouting
  }

  // Marble positions on puddle (id, x, y — only placed marbles)
  if (settings.marbles && settings.marbles.length > 0) {
    preset.mb = settings.marbles.map(m => [m.id, round3(m.x), round3(m.y)])
  }

  // Creator wallet address
  if (settings.walletAddress) {
    preset.wa = settings.walletAddress
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
      vcfCutoff: p.vc ? p.vc[0] : undefined,
      vcfResonance: p.vc ? p.vc[1] : undefined,
      vcfRouting: p.vr || undefined,
      walletAddress: p.wa || undefined,
      arpNotes: p.an || [],
      marbles: p.mb ? p.mb.map(arr => ({ id: arr[0], x: arr[1], y: arr[2] })) : [],
    }
  } catch {
    return null
  }
}

/**
 * Build a full shareable URL with the preset encoded in the hash.
 * Optionally includes a preset name.
 */
export function buildPresetUrl(settings, name) {
  const encoded = serializePreset(settings)
  const base = window.location.origin + window.location.pathname
  let url = `${base}#p=${encoded}`
  if (name) url += `&n=${encodeURIComponent(name)}`

  // Include loop data if present and URL stays under QR capacity
  if (settings.loopData && settings.loopData.events && settings.loopData.events.length > 0) {
    const loopJson = JSON.stringify({
      ev: settings.loopData.events.map(e => [Math.round(e.t), e.type, e.data]),
      d: Math.round(settings.loopData.duration),
    })
    const loopEncoded = btoa(unescape(encodeURIComponent(loopJson)))
    const withLoop = url + `&l=${loopEncoded}`
    if (withLoop.length < 3000) {
      url = withLoop
    }
  }

  return url
}

/**
 * Try to read a preset from the current URL hash.
 * Returns { settings, name } or null.
 */
export function readPresetFromUrl() {
  const hash = window.location.hash
  if (!hash.startsWith('#p=')) return null
  const parts = hash.slice(1).split('&')
  let encoded = null
  let name = ''
  let loopEncoded = null
  for (const part of parts) {
    if (part.startsWith('p=')) encoded = part.slice(2)
    if (part.startsWith('n=')) name = decodeURIComponent(part.slice(2))
    if (part.startsWith('l=')) loopEncoded = part.slice(2)
  }
  if (!encoded) return null
  const settings = deserializePreset(encoded)
  if (!settings) return null

  // Parse loop data if present
  let loopData = null
  if (loopEncoded) {
    try {
      const loopJson = decodeURIComponent(escape(atob(loopEncoded)))
      const lp = JSON.parse(loopJson)
      loopData = {
        events: lp.ev.map(e => ({ t: e[0], type: e[1], data: e[2] })),
        duration: lp.d,
      }
    } catch { /* ignore invalid loop data */ }
  }

  return { settings, name, loopData }
}
