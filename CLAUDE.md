# Ribbon

A web-based analog ribbon synthesizer inspired by the Korg Monotribe. Mobile and desktop, with input modes tailored to each device.

## Stack
- Vite + React
- Web Audio API (oscillators, effects, routing)
- npm as package manager

## Core Concepts

### Puddle Surface (v3)
- 2D kaos pad replacing the ribbon strip — X=pitch, Y=velocity
- Three.js custom shaders: iridescent oil-spill surface with thin-film interference
- Ripple physics: vertex displacement from touch origins in a ring buffer with exponential decay
- Asteroids-style confetti: unfilled stroke-only geometry with firework bursts
- Moving grid background with drift animation

### Rotary Knobs (v3)
- Replace all range sliders (except volume fader) with rotary knob components
- Vertical drag interaction with pointer capture (not circular)
- Ghost slider overlay: fades in during drag to hint at interaction model
- 270° rotation range, direct DOM updates for zero-lag response

### VCF Control (v3)
- Voltage-controlled filter with cutoff + resonance knobs
- Per-oscillator routing via toggle buttons (any combo of 3 oscs)
- BiquadFilter nodes inserted per-voice at creation time

### Capture/Looper (v3)
- Event-based looper: records timestamped user events (not audio)
- Replays via setTimeout chains against audio engine API
- 33.3s max loops, layering supported (record while playing)
- Return key toggles recording

### Goop/Liquid Control (v3)
- Per-control goop levels (0-1) with SVG blob overlay
- Drag from puddle onto controls increases goop
- Gooped controls react to puddle ripples
- Shake removes goop (~13 shakes to fully clean)

### Crypto Integration (v3)
- RainbowKit + wagmi + viem for wallet connection on Base L2
- POAP milestone tracking via localStorage with toast notifications
- 6 milestones: first_sound, shared_preset, shake_master, loop_creator, goop_artist, vcf_explorer

### Sound Engine
- Real oscillator-based synthesis (Web Audio API OscillatorNode, etc.)
- Adjustable knobs, switches, and buttons for synth parameters
- Effects: delay, reverb, bitcrush/digitize
- VCF: per-oscillator voltage-controlled filter with cutoff + resonance
- MIDI controller support via Web MIDI API (`src/hooks/useMIDI.js`)
- Goal: layered sounds that let users create real, listenable music

### Presets & Sharing
- QR code preset system: all synth settings encoded in URL hash (`#p=...`)
- Multi-colored gradient QR codes generated client-side with `qrcode` library
- Preset URLs restore all settings on load (oscillators, effects, scales, switches)
- Serialization in `src/utils/presets.js`

### Composition
- Users can save their compositions
- Consider multi-ribbon sessions (multiple instances per session)

## Design Direction
- v3 "Puddle": iridescent oil-spill kaos pad, glitch/datamosh aesthetic
- v2 "Rock & Rumble": party/candy store meets creepy sci-fi spaceship
- Animated visuals that flow from the instrument and respond to the music
- Animations should enhance the musical experience, not clutter the controls
- Controls stay clean and usable; visuals live around/behind them

## Hosting & Deployment
- Production: ribbon.obfusco.us (deploys on push to `main`)
- Dev: ribbon-dev.obfusco.us (deploys on push to `nmj/*` branches)
- Production domain: TBD (eventually its own domain)
- CI/CD: GitHub Actions → S3 + CloudFront (separate distributions for prod and dev)
- Dev CloudFront distribution ID stored in `DEV_CLOUDFRONT_DISTRIBUTION_ID` GitHub secret

## Git Workflow
- Push after every commit
- Keep CLAUDE.md, DEVLOG.md, ROADMAP.md, and MEMORY.md updated before committing
- DEVLOG: reverse-chronological (newest at top)
- ROADMAP: mark completed items with `[x]`, move to Completed section
- Git auth via `gh auth` with HTTPS
