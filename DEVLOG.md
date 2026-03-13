# Devlog

## 2026-03-12 — Hold mode, velocity, filter, glide, and visualizer enhancements

- Added touch velocity via ribbon Y-axis (bottom=quiet, top=full volume)
- Perspective grid now responds to input: forward speed from velocity, lateral drift from pitch
- Frequency bars render from top instead of bottom
- Tuned grid speed and lateral drift through multiple iterations
- Particles (confetti/fireworks) drift longer with reduced decay and gravity
- Added filter controls: cutoff (20-20000 Hz) and resonance (0-25) with BiquadFilterNode in audio chain
- Added glide/portamento speed control (0.001-0.3s time constant)
- Implemented Hold mode: independent toggle that composes with play/latch/arp
  - Keeps note alive after release; global mouse movement controls pitch across full screen
  - Ribbon cursor tracks during hold mode
  - Keyboard keys (A-L) change pitch without interrupting held note
  - Space bar clears hold mode (like latch)
- Fixed stale closure bug in keyHandlers useMemo (added `hold` to dependency array)

## 2026-03-12 — 3D depth effects and enhanced animations

- Added retrowave perspective grid to visualizer background (scrolling horizontal lines + converging verticals + horizon glow)
- Controls and ribbon panels now float with subtle 3D perspective transforms and breathing animation
- Shimmer border animation cycles through cyan/purple/magenta on panels
- Buttons now have 3D depth: gradient backgrounds, inset highlights, lift on hover, push on press
- Ribbon cursor enhanced with diamond-shaped end caps and extended glow radius
- Scan line sweeps across the ribbon track for a holographic feel
- Slider thumbs upgraded to radial gradient spheres with inset border highlights
- OSC sections glow along their color-coded left border on hover
- Shared controls divider now uses a gradient border (cyan to purple fade)
- Full-width layout: app container, controls, and ribbon all extend edge to edge
- All 3D effects and animations properly disabled in Lo mode for clean playing

## 2026-03-12 — Arpeggiator mode and always-on keyboard

- Implemented arpeggiator activation mode with tempo control (40-300 BPM)
- Arp mode rhythmically retriggers the note at the selected BPM with 50% gate
- Added BPM slider in activation mode panel (visible when Arp selected)
- Keyboard shortcut `3` to switch to Arp mode
- Keyboard keys (A-L) now work in all input modes, not just "Keys" mode
- Wired arpeggiator into both ribbon touch and keyboard play paths
- Added do-later script to global Claude config (~/.claude/scripts/)

## 2026-03-12 — Fix UI readability in Party mode

- Fixed visualizer canvas painting on top of all UI elements due to CSS stacking context issue
- Root cause: `position: fixed; z-index: 0` on visualizer painted over non-positioned siblings — changed to `z-index: -1`
- Bumped font sizes across controls (labels 0.65->0.75rem, knob spans 0.6->0.7rem, osc labels 0.7->0.8rem)
- Increased `--text-muted` from 0.5 to 0.75, `--border-subtle` from 0.12 to 0.25, `--bg-raised` from #1a1a2e to #222240
- Made `--bg-surface` more opaque (0.85->0.96)
- Styled disabled buttons with explicit colors instead of opacity
- Brightened ribbon label, subtitle, and kbd elements

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
