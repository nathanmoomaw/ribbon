# Changelog

## v2 (in progress)

### Sound Engine
- **Third oscillator** — full 3-osc engine with independent waveform, detune, and mix per oscillator
- **Bitcrush/Crunch effect** — AudioWorklet-based bit depth + sample rate reduction with dry/wet mix and paired slapback delay
- **Polyphonic voice pool** — up to 8 simultaneous voices with voice stealing
- **Filter controls** — cutoff frequency (20-20kHz) and resonance (0-25)
- **Glide/portamento** — adjustable pitch slide speed

### Play Modes
- **Arpeggiator** — replaces latch mode; adjustable BPM (40-300), works with poly and hold
- **Mono/Poly toggle** — hardware-style rocker switch for voice mode
- **Hold mode** — sustains notes; in arp+poly+hold combo, tap ribbon to build note sequences
- **Arp trigger markers** — visual lines on ribbon showing active arp notes; click to remove

### Controls
- **Hardware rocker switches** — 3D physical-style toggle switches for Play/Arp and Mono/Poly
- **DJ volume fader** — vertical mixer-style fader replacing volume slider
- **Per-section shake bolts** — randomize individual oscillators or the general section independently
- **Multi-select scales** — combine scales (major+blues, etc.) for hybrid note sets
- **Shake combo system** — rapid triggers increase intensity; shakes randomize switches, octaves, scales, BPM

### Visuals
- **3D sphere visualizer** — Three.js wireframe spheres (one per oscillator) with audio-reactive rotation, scale, and opacity; zoom with +/-
- **Staff notation** — scrolling neon musical staff with flag-wave animation; notes positioned by pitch
- **Industrial panel skin** — beveled osc panels, brushed steel texture, retro console aesthetic inspired by Rock & Rule
- **Per-OSC colored slider handles** — unique colored thumbs for every slider, with subtle per-oscillator hue shifts

### Mobile
- **Accelerometer shake** — DeviceMotionEvent permission flow for iOS/Android
- **Floating lightning bolt** — semi-transparent shake button next to logo
- **Compact layout** — ribbon above controls, two-row switch layout, horizontal faders
- **Audio fixes** — AudioWorklet secure context guard, gesture-based AudioContext resume

### Infrastructure
- **CI/CD** — auto-deploy to S3/CloudFront on push to main
- **Staging** — ribbon.obfusco.us
- **v1 preserved** — ribbon.obfusco.us/v1

---

## v1

- Dual oscillator synthesis with detune and mix
- Continuous ribbon controller (touch, mouse, keyboard A-L)
- Chromatic and stepped scale modes
- Delay and reverb effects
- Play and latch activation modes
- Party mode: fullscreen reactive canvas with waveform, frequency bars, confetti, fireworks
- Lo mode: stripped-down distraction-free visuals
- Dark sci-fi neon theme
