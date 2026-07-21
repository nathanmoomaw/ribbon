# Changelog

## v3 — "ASCII Ribbon"

### Rendering
- **Fully text-based visuals** — ribbon surface, oscillator spheres, musical staff, logo, and QR codes all rendered in ASCII/monospace characters instead of canvas graphics
- **2D fluid simulation** — wave-equation fluid sim (`useAsciiFluid`) drives the ribbon surface's response to touch, ambient idle rippling, and shake splashes, rendered as a density-character gradient (` .·:;+=*#@`)

### Sound Engine
- **Audness engine merge** — synced onto the shared engine lineage (`nmj/engine-sync`) with iOS audio unlock and improved `latencyHint` handling
- **Baked FX knobs** — SPACE (reverb+delay "sweet spots": cathedral / dry / orbit) and TONE (crunch+VCF sweet spots: grit / clean / glitter) blend multiple parameters into one satisfying rotary knob instead of separate sliders
- **3 oscillators engaged by default** with varied waveform/detune/mix

### Visuals
- **AsciiOrbs** — 3 animated ASCII wireframe spheres, one per oscillator, reflecting its waveform, mix, and detune
- **Oscillator waveform bands** — each active osc draws its live waveform shape across a horizontal band of the ribbon canvas
- **FloatingStaff** — drifting ASCII musical staves with notes/barlines crossing the screen, wave-like motion inspired by v2's staff
- **Full-screen ASCII confetti** — dedicated `ConfettiCanvas` overlay; note-name particles (e.g. "C", "F#") spawn on every voice trigger, plus organic multi-burst shake confetti
- **Ambient idle behavior** — small ripples fire automatically after ~1.5s of inactivity; rare glitch-flicker bursts (character corruption + color shift) when idle longer
- **Animated ASCII möbius-strip logo** with rainbow gradient wordmark

### Controls
- **SVG circular knobs** — smooth 270° continuous-rotation dials replacing discrete arrow/bar indicators
- **Responsive scaling** — all control fonts/sizes use `clamp()` to scale continuously from mobile through large desktop
- **ASDF/JKL/; keyboard play** — mapped ribbon positions with velocity, live key markers drawn on the canvas
- **QR/NFT/wallet** — ported from Puddle; QR renders as a styled, iridescently-colored ASCII block-character code (not the canvas/SVG version)

### Infrastructure
- **Deployed at ribbon.obfusco.us root + /v3** with its own dev branch autodeploy
- **Version switcher** (v1 | v2 | v3) with path-based routing, shown across all versions

---

## v2 — "Rock & Rumble"

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

### Easter Eggs
- **Hidden double harmonic scale** — ~5% chance on shake unlocks the Byzantine/Arabic scale (all scale buttons deactivate while active)

### Ribbon Behavior
- **Real ribbon synth feel** — press and slide continuously changes pitch in play and arp modes
- **Hold+mono pitch glide** — re-pressing ribbon glides held voice to new pitch instead of re-attacking
- **Arp drag** — dragging along ribbon in arp mode updates the arpeggiated frequency

### Infrastructure
- **CI/CD** — auto-deploy to S3/CloudFront on push to main
- **Staging** — ribbon.obfusco.us
- **Möbius strip favicon** — custom SVG icon matching the logo style
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
