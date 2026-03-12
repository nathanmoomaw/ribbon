# Devlog

## 2026-03-11 — Lo visual mode (distraction-free)

- Added "Lo" visual mode as alternative to "Party" (default)
- Lo mode: no particles, no confetti/fireworks, no frequency bars — just a subtle thin waveform line and faint ambient pulse
- CSS overrides in lo-mode: disabled all animations (gradient-shift, pulse-glow), removed glow box-shadows, muted slider/button effects
- Retains same color palette and dark aesthetic, just calmer
- Toggle via UI buttons (Party / Lo) in Visuals group or keyboard shortcut V
- Used ref for visualMode to avoid re-creating the animation loop on toggle
- Particles cleared immediately when switching to lo mode

## 2026-03-11 — Ribbon-reactive confetti & firework visuals

- Replaced center-spawn particles with ribbon-position-aware visuals
- Confetti burst on note-on, continuous confetti stream while playing
- Periodic firework bursts during active play with sufficient amplitude
- 4 particle shapes: circle, rectangle, star, diamond with rotation & shimmer
- Performance: removed all shadowBlur, pre-computed bar colors & star paths, manual transforms instead of save/restore, swap-remove for particle cleanup
- Ribbon position passed via shared ref to avoid re-renders
- Cached gradient and canvas dimensions on resize

## 2026-03-11 — Fix stepped-sounding continuous pitch

- Replaced exponentialRampToValueAtTime with setTargetAtTime in setFrequency
- Eliminates staircase artifacts from discrete pointer events during ribbon drag
- 5ms time constant provides smooth continuous glide without perceptible latency

## 2026-03-11 — v2: Rave visuals, multi-oscillator, input modes

- Refactored AudioEngine for 2 oscillators with per-osc waveform, detune, and mix
- Added AnalyserNode for music-reactive visuals
- Created fullscreen canvas Visualizer: waveform line, frequency bars, particle bursts
- Moved ribbon below controls in layout
- Per-oscillator control sections (OSC 1 cyan, OSC 2 magenta)
- Keyboard play mode: A-L keys mapped to ribbon positions
- Input mode switching UI (Touch / Keys)
- Rave/neon styling overhaul: vivid animated gradients, pulse-glow, neon color palette
- Semi-transparent surfaces with backdrop-filter for depth over canvas

## 2026-03-11 — Initial scaffold

- Scaffolded Vite + React project
- Built Web Audio API engine: oscillator, gain nodes, delay, reverb (parallel sends)
- Created ribbon controller component with Pointer Events API for mouse/touch
- Pitch mapping utility: position → frequency with scale support (chromatic default)
- Controls: waveform selector, volume, octave range, delay/reverb params
- Activation modes: play (hold) and latch (toggle), keyboard shortcuts
- Dark sci-fi base theme: deep navy, cyan/magenta accents, monospace UI
- Keyboard shortcuts: Space=stop, 1/2=mode, Q/W/E/R=waveform
