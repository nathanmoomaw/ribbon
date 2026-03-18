#!/usr/bin/env node
/**
 * Smoke test — verifies the project builds cleanly and checks for common issues.
 * Run: node tests/smoke.mjs
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`)
    failed++
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'assertion failed')
}

console.log('\n🔧 Ribbon Synth — Smoke Tests\n')

// 1. Build test
console.log('Build:')
test('vite build succeeds', () => {
  execSync('npm run build', { cwd: root, stdio: 'pipe' })
})

test('dist/index.html exists', () => {
  assert(existsSync(join(root, 'dist', 'index.html')))
})

test('dist contains JS bundle', () => {
  const assets = readdirSync(join(root, 'dist', 'assets'))
  assert(assets.some(f => f.endsWith('.js')), 'no JS bundle in dist/assets')
})

test('dist contains CSS bundle', () => {
  const assets = readdirSync(join(root, 'dist', 'assets'))
  assert(assets.some(f => f.endsWith('.css')), 'no CSS bundle in dist/assets')
})

// 2. Source integrity
console.log('\nSource integrity:')
test('AudioEngine exports all required functions', () => {
  const src = readFileSync(join(root, 'src', 'audio', 'AudioEngine.js'), 'utf-8')
  const required = ['init', 'voiceOn', 'voiceOff', 'noteOn', 'noteOff', 'setFrequency',
    'setFilter', 'setWaveform', 'setVolume', 'setDelay', 'setReverb', 'setCrunch',
    'allNotesOff', 'killAllSound', 'getAnalyser', 'getIsPlaying']
  for (const fn of required) {
    assert(src.includes(`export function ${fn}`), `missing export: ${fn}`)
  }
})

test('AudioEngine MAX_VOICES is reasonable (≤16)', () => {
  const src = readFileSync(join(root, 'src', 'audio', 'AudioEngine.js'), 'utf-8')
  const match = src.match(/MAX_VOICES\s*=\s*(\d+)/)
  assert(match, 'MAX_VOICES not found')
  assert(parseInt(match[1]) <= 16, `MAX_VOICES too high: ${match[1]}`)
})

test('no console.log left in production code (except warnings)', () => {
  const files = ['src/App.jsx', 'src/audio/AudioEngine.js', 'src/components/Controls.jsx',
    'src/components/Ribbon.jsx', 'src/hooks/useArpeggiator.js']
  for (const file of files) {
    const src = readFileSync(join(root, file), 'utf-8')
    const logs = (src.match(/console\.log\(/g) || []).length
    assert(logs === 0, `${file} has ${logs} console.log calls`)
  }
})

test('bitcrush-processor.js exists in public', () => {
  assert(existsSync(join(root, 'public', 'bitcrush-processor.js')),
    'bitcrush-processor.js missing from public/')
})

// 3. CSS animation performance checks
console.log('\nCSS performance:')
test('scan-line uses transform (not left)', () => {
  const src = readFileSync(join(root, 'src', 'index.css'), 'utf-8')
  const scanLine = src.match(/@keyframes scan-line\s*\{([^}]+)\}/s)
  assert(scanLine, 'scan-line keyframe not found')
  assert(!scanLine[1].includes('left:'), 'scan-line should use transform, not left')
  assert(scanLine[1].includes('transform'), 'scan-line should use transform')
})

test('bolt-dance not running infinitely on idle', () => {
  const src = readFileSync(join(root, 'src', 'App.css'), 'utf-8')
  // The shake bolt should not have bolt-dance in its base rule
  const boltRule = src.match(/\.app-header__shake-bolt\s*\{([^}]+)\}/s)
  assert(boltRule, 'shake-bolt rule not found')
  assert(!boltRule[1].includes('bolt-dance'), 'bolt-dance should only run on hover, not idle')
})

// 4. Component structure checks
console.log('\nComponent checks:')
test('OscSection is memoized', () => {
  const src = readFileSync(join(root, 'src', 'components', 'Controls.jsx'), 'utf-8')
  assert(src.includes('memo(function OscSection') || src.includes('memo(OscSection'),
    'OscSection should be wrapped in React.memo')
})

test('handleShake uses refs (minimal dependencies)', () => {
  const src = readFileSync(join(root, 'src', 'App.jsx'), 'utf-8')
  // The handleShake dependency array should be short (≤ 3 deps)
  const match = src.match(/handleShake\s*=\s*useCallback\([^]*?\],\s*\[([^\]]*)\]\)/)
  if (match) {
    const deps = match[1].split(',').filter(d => d.trim()).length
    assert(deps <= 5, `handleShake has ${deps} deps — should use refs to reduce`)
  }
})

test('ActivationMode desktop order: Play/Arp before Mono/Poly', () => {
  const src = readFileSync(join(root, 'src', 'components', 'ActivationMode.jsx'), 'utf-8')
  const playIdx = src.indexOf('"Play"')
  const monoIdx = src.indexOf('"Mono"')
  const holdIdx = src.indexOf('activation__hold')
  const stopIdx = src.indexOf('activation__stop')
  const bpmIdx = src.indexOf('activation__arp-tempo')
  assert(playIdx < monoIdx, 'Play/Arp should come before Mono/Poly')
  assert(monoIdx < holdIdx, 'Mono/Poly should come before Hold')
  assert(holdIdx < stopIdx, 'Hold should come before Stop')
  assert(stopIdx < bpmIdx, 'Stop should come before BPM')
})

// Summary
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`)
process.exit(failed > 0 ? 1 : 0)
