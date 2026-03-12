# Ribbon

A web-based analog ribbon synthesizer inspired by the Korg Monotribe. Play continuous pitch with touch, mouse, or keyboard — layered with music-reactive visuals.

**Staging:** [ribbon.obfusco.us](https://ribbon.obfusco.us)

## Features

### Sound Engine
- Dual oscillator synthesis (sine, square, sawtooth, triangle) with per-oscillator detune and mix
- Continuous ribbon controller — slide to sweep pitch across 1-4 octaves
- Chromatic and stepped scale modes
- Effects chain: delay (time, feedback, mix) and reverb
- Play and latch activation modes (arpeggiate coming soon)

### Input Modes
- **Touch/Mouse** — drag along the ribbon strip for continuous pitch control
- **Keyboard** — A through L keys mapped across the ribbon range

### Visuals
- **Party mode** (default) — fullscreen reactive canvas with waveform display, frequency bars, confetti bursts, and fireworks that respond to your playing position and amplitude
- **Lo mode** — stripped-down visuals for focused playing: subtle waveform line, no particles or animations, better performance

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `1` | Play mode |
| `2` | Latch mode |
| `V` | Toggle Party/Lo visuals |
| `Space` | Stop (in latch mode) |
| `A`-`L` | Play notes (in keys input mode) |

## Getting Started

```bash
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173) to play.

## Stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) (OscillatorNode, GainNode, DelayNode, ConvolverNode)
- Canvas 2D for visualizer
- Zero external audio/UI libraries
