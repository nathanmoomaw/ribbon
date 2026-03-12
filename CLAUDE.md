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

### Composition
- Users can save their compositions
- Consider multi-ribbon sessions (multiple instances per session)

## Design Direction
- Aesthetic: somewhere between party/candy store and creepy sci-fi spaceship
- Animated visuals that flow from the ribbon and respond to the music
- Animations should enhance the musical experience, not clutter the controls
- Controls stay clean and usable; visuals live around/behind them

## Hosting & Deployment
- Production domain: TBD (eventually its own domain)
- Staging: ribbon.obfusco.us
- Staging deploy: merge current branch into `staging`, push to trigger CI/CD

## Git Workflow
- Push after every commit
- Keep CLAUDE.md, DEVLOG.md, ROADMAP.md, and MEMORY.md updated before committing
- DEVLOG: reverse-chronological (newest at top)
- ROADMAP: mark completed items with `[x]`, move to Completed section
- Git auth via `gh auth` with HTTPS
