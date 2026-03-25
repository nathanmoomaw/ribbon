# Ribbon

A web-based analog ribbon synthesizer inspired by the Korg Monotribe. Play continuous pitch with touch, mouse, or keyboard — layered with music-reactive 3D visuals.

**Live:** [ribbon.obfusco.us](https://ribbon.obfusco.us)

## Features

### Sound Engine
- Triple oscillator synthesis (sine, square, sawtooth, triangle) with per-oscillator detune and mix
- Continuous ribbon controller — slide to sweep pitch across multiple octaves
- Multi-select scale modes (chromatic, major, minor, blues, pentatonic — combine scales for hybrid note sets)
- Effects chain: delay (time, feedback, mix), reverb, and bitcrush/crunch with slapback
- Filter with cutoff and resonance controls
- Glide/portamento speed control

### Play Modes
- **Play / Arp** — toggle between single-note play and arpeggiator with adjustable BPM
- **Mono / Poly** — single voice or polyphonic (up to 8 voices)
- **Hold** — sustains notes after release; in arp+poly+hold, tap notes to build arp sequences
- **Shake** — randomizes synth parameters for happy accidents (click logo, lightning bolt, or shake device)

### Input
- **Touch/Mouse** — drag along the ribbon strip for continuous pitch control
- **Keyboard** — A through L keys mapped across the ribbon range
- **Accelerometer** — shake your mobile device to trigger parameter randomization

### Visuals
- **Party mode** (default) — 3D wireframe spheres (one per oscillator) that pulse with audio energy, scrolling staff notation with neon notes, confetti and fireworks
- **Lo mode** — stripped-down visuals for focused playing
- Zoom in/out with +/- keys to shift perspective on 3D spheres

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `1` | Play mode |
| `2` | Arp mode |
| `3` | Mono/Poly toggle |
| `4` | Hold toggle |
| `V` | Toggle Party/Lo visuals |
| `Space` | Stop / kill sound (double-tap kills tails) |
| `A`-`L` | Play notes |
| `+`/`-` | Zoom 3D spheres |

## Getting Started

```bash
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173) to play.

## Stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) (OscillatorNode, GainNode, DelayNode, ConvolverNode, AudioWorklet)
- [Three.js](https://threejs.org/) for 3D sphere visualizer
- Canvas 2D for staff notation and particle effects
- Zero external audio/UI libraries

## Versions

- **v1** — [ribbon.obfusco.us/v1](https://ribbon.obfusco.us/v1) — Original dual-oscillator build with latch mode and 2D visuals
- **v2 "Rock & Rumble"** — Current — Triple oscillator, poly/arp/hold modes, 3D spheres, staff notation, bitcrush, hardware-style rocker switches, per-section shake, retro industrial panel design
