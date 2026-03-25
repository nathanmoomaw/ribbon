# Ribbon

A web-based analog ribbon synthesizer inspired by the Korg Monotribe. Mobile and desktop, with input modes tailored to each device.

## Stack
- Vite + React
- Web Audio API (oscillators, effects, routing)
- npm as package manager

## Core Concepts

### Ribbon Controller
- Emulates an analog ribbon strip — continuous pitch control via touch/drag
- Input modes: trackpad, mouse, touchscreen, keyboard keys, camera
- User can switch between available input modes per device
- Activation controls (play, arpeggiate, latch) via keyboard shortcuts and onscreen buttons

### Sound Engine
- Real oscillator-based synthesis (Web Audio API OscillatorNode, etc.)
- Adjustable knobs, switches, and buttons for synth parameters
- Effects: delay, reverb, bitcrush/digitize
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
- Aesthetic: somewhere between party/candy store and creepy sci-fi spaceship
- Animated visuals that flow from the ribbon and respond to the music
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
