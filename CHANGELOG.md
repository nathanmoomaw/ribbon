# Changelog

## v4 — "Citrus Sipper"

### Dual Mode
- **Party / Lo toggle** — Party mode blends v2's Three.js sphere visualizer with static-electricity arcs between the spheres; Lo mode is the v3 ASCII ribbon, both sharing the same v4 control set (VCF, space/tone, DualKnob oscillators)
- **Static-electricity spheres** — lightning arcs (recursive midpoint displacement, branching diffusion) jump between the 3 oscillator spheres, constrained to their outer edges and scaling with how far the spheres have drifted apart
- **Waveform morphing** — turning up an oscillator's mix warps its sphere's vertex displacement toward that waveform's shape

### Controls
- **DualKnob** — combined mix (outer ring) + detune (inner ring) control per oscillator, ported from Puddle
- **Mono/Arp toggle** — replaces the old Play/Arp + Mono/Poly pair; arp always implies poly
- **TEMPO knob** — bipolar knob combining BPM and glide into one control
- **ž knob** — bipolar knob combining flutter/flange and phased decay into one fun-to-turn effect
- **Transparent controls panel** — no background chrome; the animated party/lo background shows through behind floating controls
- Space/tone baked knobs and per-osc VCF routing carried over from v3

### Visuals & Theme
- **Citrus palette** — lime, lemon, orange, and pink across party mode, lo mode, the ASCII ribbon, and QR codes, replacing v3's terminal green
- **Citrus emoji confetti** — a rare (~1%) slice of confetti particles render as 🍋🍊🟢 slice emoji instead of shapes
- **Ribbon-twisted QR text** — preset names render with a dual-wave warp, in the family of v3's recaptcha-style distortion
- **[i] info button** — shows build/version info including the current commit hash

### Behavior
- **37s touch-to-play prompt** — fades back in after 37 seconds of inactivity; dismissed by ribbon touch or keyboard play alike
- **Shake randomization** — extended to mono/arp, hold, tempo, and octave in addition to v3's existing shake targets
- **ASDF keyboard play** — wired into party mode (previously lo-mode only)

### Engine
- Built on the shared `@audness/core` engine lineage (in progress) — v1–v3 remain self-contained/frozen

---

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
