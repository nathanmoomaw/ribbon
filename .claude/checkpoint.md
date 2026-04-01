# Checkpoint — experiment/multi-llm-dump (Opus)

**Date**: 2026-03-31
**Branch**: experiment/multi-llm-dump
**Model**: Opus

## Items Processed (16 total, all marked done)

### Implemented (3 items)
1. **Marble patterns** (line 392): Added cat-eye, swirl, and galaxy CSS patterns to marbles. Each marble now has a `pattern` field in MARBLE_CONFIGS. Amber/Opal = cat-eye, Emerald/TigerEye = swirl, Amethyst/Onyx = galaxy, Ruby/Sapphire/Moonstone = solid.
   - Files: `useMarbles.js`, `ActivationMode.jsx`, `ActivationMode.css`, `Puddle.jsx`, `Puddle.css`
2. **Logo too wide on mobile** (line 396): Reduced logo from 280px to 140px on mobile via media query. Header now wraps.
   - Files: `App.css`
3. **Marbles persist from QR/link** (lines 402, 407): Marble positions (id, x, y) now serialized into preset URLs and restored on load via new `restoreMarbles()` function.
   - Files: `presets.js`, `useMarbles.js`, `App.jsx`

### Routed to Roadmap (12 items)
- Tokenization ideas (lines 398-401): New "Tokenization / Crypto Roadmap" section with 6 items
- QR code style branch (line 403): Added to Up Next
- Rec/loop state saving (line 404): Added to Soon
- Goop needs attention (line 405): Added to Soon
- Marble puddle + sci-fi controls focus (line 406): Added to Up Next
- Puddle shape design (line 397): Added to Up Next (needs user input)

### Flagged as Needing User Input (1 item)
- **Puddle shape** (line 397): "help me draw the shape of puddle" — this is a collaborative design task. Added to roadmap but requires user to describe or sketch the desired shape.

## What Remains
- No unchecked items remain in DUMP.md lines 392-407
- The code changes (marble patterns, logo fix, preset marbles) need visual testing
- Marble pattern rendering relies on CSS only (no SVG/canvas) — may want refinement
- `restoreMarbles` does not auto-trigger marble voice playback yet; that happens through the existing hold+puddle effect chain
