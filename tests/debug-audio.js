/**
 * Browser debug script — paste into the browser console to exercise the audio engine.
 * Tests voice creation, polyphony, effects, and cleanup.
 *
 * Usage: Open ribbon app in browser, open DevTools console, paste this script.
 */

(async function debugAudio() {
  console.log('🎹 Ribbon Audio Debug Script\n')

  // Find the audio engine via the app's module system
  const engine = window.__RIBBON_ENGINE
  if (!engine) {
    console.error('Engine not found. Add `window.__RIBBON_ENGINE = getEngine()` to App.jsx temporarily, or use the engine directly.')
    return
  }

  const delay = ms => new Promise(r => setTimeout(r, ms))
  let passed = 0, failed = 0

  async function test(name, fn) {
    try {
      await fn()
      console.log(`  ✓ ${name}`)
      passed++
    } catch (e) {
      console.log(`  ✗ ${name}: ${e.message}`)
      failed++
    }
  }

  function assert(cond, msg) { if (!cond) throw new Error(msg) }

  // Voice tests
  console.log('Voice management:')

  await test('voiceOn creates voice', async () => {
    engine.voiceOn('test1', 440, 0.3)
    assert(engine.getIsPlaying('test1'), 'voice should be playing')
    engine.voiceOff('test1')
    await delay(50)
  })

  await test('voiceOff stops voice', async () => {
    engine.voiceOn('test2', 440, 0.3)
    engine.voiceOff('test2')
    await delay(50)
    assert(!engine.voiceIsPlaying('test2'), 'voice should be off')
  })

  await test('polyphonic voices (4 simultaneous)', async () => {
    const ids = ['poly1', 'poly2', 'poly3', 'poly4']
    ids.forEach((id, i) => engine.voiceOn(id, 220 * (i + 1), 0.2))
    assert(engine.getActiveVoiceCount() >= 4, `expected ≥4 voices, got ${engine.getActiveVoiceCount()}`)
    ids.forEach(id => engine.voiceOff(id))
    await delay(50)
  })

  await test('allNotesOff clears all voices', async () => {
    engine.voiceOn('a1', 440, 0.2)
    engine.voiceOn('a2', 880, 0.2)
    engine.allNotesOff()
    await delay(100)
    assert(!engine.getIsPlaying(), 'no voices should be playing')
  })

  await test('killAllSound clears everything', async () => {
    engine.voiceOn('k1', 330, 0.3)
    engine.killAllSound()
    await delay(250)
    assert(!engine.getIsPlaying(), 'all sound should be killed')
  })

  // Parameter tests
  console.log('\nParameter setting:')

  await test('setVolume does not throw', () => {
    engine.setVolume(0.5)
    engine.setVolume(0)
    engine.setVolume(1)
    engine.setVolume(0.5)
  })

  await test('setFilter does not throw', () => {
    engine.setFilter({ cutoff: 1000, resonance: 5 })
    engine.setFilter({ cutoff: 20000, resonance: 0 })
  })

  await test('setDelay does not throw', () => {
    engine.setDelay({ time: 0.3, feedback: 0.4, mix: 0.5 })
    engine.setDelay({ time: 0.3, feedback: 0.4, mix: 0 })
  })

  await test('setReverb does not throw', () => {
    engine.setReverb({ mix: 0.5 })
    engine.setReverb({ mix: 0 })
  })

  await test('setCrunch does not throw', () => {
    engine.setCrunch(0.5)
    engine.setCrunch(0)
  })

  await test('setWaveform across all osc indices', () => {
    ['sine', 'square', 'sawtooth', 'triangle'].forEach(w => {
      for (let i = 0; i < 3; i++) engine.setWaveform(w, i)
    })
    engine.setWaveform('sawtooth', 0)
  })

  // Stress test
  console.log('\nStress test:')

  await test('rapid voice creation/destruction (50 voices)', async () => {
    for (let i = 0; i < 50; i++) {
      const id = `stress_${i}`
      engine.voiceOn(id, 220 + Math.random() * 880, 0.1)
      engine.voiceOff(id)
    }
    await delay(500)
    assert(!engine.getIsPlaying(), 'all stress voices should be cleaned up')
  })

  await test('getAnalyser returns analyser node', () => {
    const analyser = engine.getAnalyser()
    assert(analyser, 'analyser should exist')
    assert(analyser.fftSize > 0, 'analyser should have fftSize')
  })

  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`)
})()
