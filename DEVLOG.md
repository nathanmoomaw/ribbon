# Devlog

## 2026-03-24 — Modifier key passthrough, console bottom padding

- **Modifier key passthrough**: Cmd+L, Ctrl+C, Alt+anything etc. now pass through to the browser instead of triggering synth keyboard shortcuts. Added `metaKey/ctrlKey/altKey` guard to useKeyboard, useKeyboardPlay, and useShake.
- **Console bottom padding**: increased from 0.5rem to 1rem so Delay knobs don't hang off the bottom edge.

## 2026-03-24 — Fix BPM slider killing poly arp, project milestones

- **Root cause**: race condition between arp restart and voice gain fade-out. When BPM changed, `arpStop()` triggered a 10ms voice fade, then `playNote()` fired 10ms later while gain was still mid-fade. `voiceOn()` captured the stale intermediate gain value as its starting point, resulting in silence.
- **Fix 1 — AudioEngine**: `voiceOn()` now forces `setValueAtTime(0)` before ramping up, ensuring a clean attack regardless of previous gain state.
- **Fix 2 — useArpeggiator**: replaced `setInterval` with chained `setTimeout` so each tick reads live BPM (instant tempo changes). BPM change handler no longer does stop/delay/restart — just clears timers and schedules the next tick directly.
- **Milestones**: v2 stable by EOD 2026-03-25, v3 live by EOW 2026-03-27 (cryptic crypto + mild ambient play).

## 2026-03-23 — Restore shake bolt offset, commit referenced screenshots

- **Restored top: 8px on shake bolt**: the removal was premature — user was seeing stale cache. Offset keeps the bolt visually aligned below the logo text.
- **Screenshot tracking**: committed all referenced screenshots to git so visual context for DUMP.md prompts is preserved.

## 2026-03-23 — Clean up shake bolt positioning

- **Removed vertical offset**: shake bolt no longer has `top: 8px` pushing it down — sits naturally aligned with the logo. Already had no background/border.

## 2026-03-23 — Independent Reverb/Crunch, shake hover states, mobile compact

- **Reverb & Crunch independent**: split back into separate sections with own labels/sliders, side by side on the grid. Delay moved to bottom spanning full width (3 knobs benefit from the space).
- **Shake icon hover states**: header bolt gets warm glow on hover (drop-shadow + higher opacity). Mini console bolts get yellow-gold color, warm glow, subtle background shift, and bolt-dance animation on hover.
- **Mobile above-the-fold**: oscillator panels use CSS grid (3-col: wave | mix | detune) cutting height roughly in half. Reduced padding, gaps, font sizes, fader height, and toggle spacing throughout mobile breakpoint.

## 2026-03-23 — Crunch merged with Reverb, console texture boost

- **Merged Crunch into Reverb section**: crunch slider was alone on the last grid row hanging off the bottom. Combined it with Reverb as side-by-side knobs ("Reverb / Crunch"), making a clean 2x2 grid (Filter, Glide, Delay, Reverb/Crunch).
- **Boosted console background**: tripled brushed grain opacity (0.04 → 0.12), added vertical panel seam lines every 120px, diagonal cross-hatch texture, brighter top gradient. Increased border highlight opacity, inner bevel contrast, chamfer/rivet visibility, and added bottom/right shadow edges.

## 2026-03-23 — Fix crunch slider positioning

- **align-items: start on shared grid**: the 2-column grid was stretching sections to fill row height, pushing the crunch slider (alone on the last row) to the bottom. Adding `align-items: start` keeps each section compact at the top of its grid cell.

## 2026-03-23 — Ribbon full-width fix

- **overflow-x: hidden on .app**: the 100vw ribbon was exceeding the viewport by the scrollbar width on some browsers, leaving a gap on the right. Adding overflow-x: hidden clips the excess so the ribbon reaches edge-to-edge.

## 2026-03-23 — Full-width app on large screens

- **Removed max-width cap on .app**: the 1000px max-width was making the app float in a narrow column on wide screens. Now the app fills the full viewport width while the controls panel keeps its own 800px max-width.

## 2026-03-23 — Clean panel, per-section shake, large screen fix

- **Removed cityscape**: stripped all building/facade SVG backgrounds from the console — replaced with clean matte steel panel (brushed metal grain + simple gradient)
- **Per-section shake**: clicking a mini shake bolt now triggers a CSS shake animation on its parent osc/shared panel, not just the whole console
- **Large screen fix**: replaced `height: 100dvh` + `overflow: hidden` with `min-height: 100dvh` + `max-width: 1000px` so the app doesn't stretch absurdly on wide monitors. Mobile still uses 100dvh with internal scroll.

## 2026-03-23 — Building facade skin (v3)

- **Rebuilt as architectural facade**: replaced abstract geometric plates with actual building wall — 4 overlapping rectangular structures at different heights and depths (tall narrow left, large center, lighter right, dark far-right)
- **Added windows**: rows of recessed dark rectangles on each building section, with varying sizes for larger accent windows
- **Floor ledges**: horizontal ledge lines with top highlight + bottom shadow on each building, creating visible floor separations
- **Structural elements**: protruding cross-brace on main wall, vertical pipe/conduit on right building, panel seam lines
- **Multi-tone depth**: 4 distinct gradient fills (#5a5580, #4e4975, #656090, #403b62) creating real depth between overlapping structures

## 2026-03-23 — Industrial hull panel skin (v2)

- **Boosted hull visibility**: dramatically increased opacity on all SVG panel elements (fills 0.6-0.9, strokes 0.3-0.4, rivets 0.3-0.35) so overlapping steel plates are clearly visible against the darker base
- **Added structural detail**: top trapezoid plate, side accent panels, second horizontal beam, edge highlights on plate borders, rivets along both beams
- **Darkened base**: lowered base gradient to rgba(24-32) so plates stand out with real contrast

## 2026-03-23 — Industrial hull panel skin

- **Removed cityscape**: scrapped the gradient-based and SVG-based building skylines — never looked right
- **Hull panel skin**: replaced with an SVG industrial hull aesthetic inspired by Rock & Rule — angular overlapping steel plates, cross-brace diagonals, structural beams, rivet dots, and a muted blue-purple steel base tone matching the screenshot reference

## 2026-03-23 — Layout overhaul, cityscape rewrite, shelve ambient play

- **Console layout**: switched shared controls (Octaves/Scale/Filter/Speed/Delay/Reverb/Crunch) from flex-wrap to a clean 2-column CSS grid so sections align properly
- **Cityscape rewrite**: replaced 30+ gradient layers with an inline SVG skyline silhouette (two rows of buildings with window lights), much cleaner and actually looks like buildings
- **Above the fold**: app now uses `100dvh` height with `overflow: hidden`, controls panel scrolls internally if needed. Reduced padding/gaps throughout — tighter header offsets, compact oscillator panels, smaller mobile ribbon (64px)
- **v2 tag noted**: will be tagged when user says ready, will live at /v2 with a changelog
- **Ambient play shelved**: removed ambient play UI, state, hooks integration, and ghost volume from App.jsx and Controls. The `useAmbientPlay` hook file remains in codebase for future version

## 2026-03-18 — Boost cityscape visibility

- **Cityscape too faint**: significantly increased visibility of building silhouettes (lightened to rgba 40-55 range), boosted window light opacity (0.22-0.35 with warm halos, added 8 extra windows), strengthened floor/wall structural lines (0.12-0.22), darkened base layer (0.92-0.95) for contrast, and added double-line rooftop glow highlights

## 2026-03-18 — Building cityscape console, hold rework

- **Console building effect**: rewrote `.controls` background with building silhouettes (6 vertical blocks of varying heights), scattered window lights (12 warm/cool dots), horizontal floor lines, vertical wall edges, rooftop ledge highlights, and concrete grain texture over a dark urban night-sky base
- **Hold rework**: removed global pointermove listener that made held notes track mouse position across the entire screen. Hold now simply sustains the note at its original pitch until space/hold-off. Global pitch tracking ("wild mode") preserved as a concept for future implementation.

## 2026-03-18 — Performance optimizations, smoke tests

- **handleShake refs pattern**: moved 13 state dependencies to refs — callback now only depends on `getEngine` + `handleArpNoteToggle`, eliminating cascading re-renders on every parameter change
- **React.memo on OscSection**: prevents all 3 oscillator panels from re-rendering when unrelated Controls state changes
- **DJFader RAF fix**: volume debounce now uses a proper useRef for requestAnimationFrame ID, preventing accumulation on rapid drags
- **AudioEngine guards**: try/catch on voice destruction (osc.stop/disconnect) to handle already-stopped oscillators; killAllSound timeout leak fixed with proper timer tracking
- **CSS scan-line**: changed from `left` (layout-triggering) to `transform: translateX()` for GPU compositing
- **Conditional CSS animations**: bolt-dance now only runs on hover; moebius-drift only when ambient is enabled
- **Passive pointermove**: added `{ passive: true }` to global hold-mode pointer listener
- **Smoke test suite** (`npm test`): 13 tests covering build, source integrity, CSS perf checks, component structure, and switch order verification
- **Browser debug script** (`tests/debug-audio.js`): paste-in-console script for exercising voice management, parameter setting, and stress testing

## 2026-03-18 — Stop above BPM, switch order saved to memory

- **Moved Stop button above BPM slider on desktop**: swapped source order so desktop flows Play/Arp → Mono/Poly → Hold → Stop → BPM → Vol. Mobile grid placement unchanged (Stop stays in Row 1)
- **Saved switch order to memory** so it won't be forgotten in future sessions

## 2026-03-18 — Fix leftside switch order, remove ambient icon box

- **Fixed leftside switch order**: restructured ActivationMode to flat layout — desktop order is now correct: Play/Arp → Mono/Poly → Hold → Stop → BPM (top to bottom). Mobile uses CSS Grid to reflow into Row 1 (Play/Arp, Hold, Stop) and Row 2 (Mono/Poly, BPM)
- **Removed ambient icon box**: stripped default button appearance, outline, and tap highlight from ambient toggle button

## 2026-03-17 — Ambient UX overhaul: larger icon, arp+poly+hold integration, ghost volume

- **Ambient icon larger and more animated when active**: SVG scales from 40x20 to 56x28 when playing, with multi-phase breathing animation including rotateY and stronger glow
- **Shake adds to arp in arp+poly+hold mode**: when shake fires during arp+poly+hold, the random note is added to the arp sequence via `handleArpNoteToggle` instead of playing a one-shot
- **Ambient starts in arp+poly+hold mode**: `handleAmbientStart` now sets mode=arp, poly=true, hold=true so ambient notes build arp sequences
- **Ghost volume on ambient start**: volume fader shows a translucent green ghost marker at the pre-ambient level, actual volume drops to 35% of current for gentle ambient; ghost pulses and disappears when ambient is toggled off

## 2026-03-17 — Rounded shake icons, ambient play stays on during interaction

- **Rounded mini shake bolt borders**: changed from `border-radius: 3px` (square) to `50%` (circle)
- **Ambient play no longer stops on user interaction**: removed auto-stop on pointerdown/keydown/touchstart, removed ribbon interaction check, removed shake-triggered stop — ambient now stays on while user plays
- Removed 30s idle timer tooltip text (was already non-functional)
- Cleaned up unused `ambientStopRef`, `ambientStopNow`, and `ribbonInteraction` param

## 2026-03-17 — Fix ambient play, per-section shake bolts

- **Fixed ambient play not producing sound**: `handleAmbientStart` called `engine.setReverbMix()` which doesn't exist — should be `engine.setReverb({ mix })`. This threw a TypeError inside `startPlaying`, preventing the note interval from ever starting. Same fix applied to `handleAmbientTweak`.
- **Added mini shake bolts** (⚡) to upper-right of each OSC panel — fully randomizes that oscillator's waveform, mix, and detune
- **Added mini shake bolt to general panel** — randomizes octaves, scale, filter, speed, delay, reverb, and crunch
- **Removed old console shake button** from lower-right (replaced by header bolt + per-section bolts)
- Committed untracked files (PLAN-NFT.md, screenshots)

## 2026-03-16 — Ambient play rewrite, default off, sleep animation

- **Rewrote `useAmbientPlay`**: replaced recursive `setTimeout` with `setInterval` polling (250ms) to eliminate stale closure issues; all state read from refs
- Ambient play now **OFF by default** — user clicks icon to start immediately
- Ambient stops on **any user interaction**: pointerdown, keydown, touchstart, or shake (except clicking the ambient icon itself)
- Added **sleep shimmer animation** when ambient goes to sleep: icon fades from cyan to gray with `·` and `✧` particles drifting upward
- `isSleeping` state exposed from hook; `--sleeping` CSS class with `ambient-sleep` + `sleep-shimmer` keyframes
- **Known bug**: ambient play still not triggering audible notes — needs further investigation

## 2026-03-16 — Ambient play fix, icon positioning, sparkle polish

- Fixed ambient play not triggering notes: refactored `useAmbientPlay` scheduling to use ref-based pattern, preventing stale closures in recursive `setTimeout` chain
- Slightly increased ambient note velocity (0.10–0.25) for better audibility
- Moved ambient and shake icons down 15px each for better visual positioning
- Enhanced sparkle wake-up animation: larger particles, longer duration (1.8s), added glow text-shadow, more gradual multi-stage fade with brightness filter

## 2026-03-16 — Desktop bolt, ambient icon polish, sparkle wake

- Lightning bolt shake button now visible on desktop too (was mobile-only), circle button in Controls hidden
- Ambient möbius icon vertically centered with logo via flexbox alignment
- Ambient icon starts dim/disabled, shows sparkle wake-up animation (✦✧ pseudo-elements) when ambient play begins
- Same sparkle animation fires on manual click to start ambient
- Armed state (on but not playing) is very subtle (25% opacity, desaturated)

## 2026-03-16 — Accelerometer shake, ambient play mode, logo shake

- Accelerometer shake: rewrote useShake to request DeviceMotionEvent permission on first user gesture (required on iOS 13+), added proper permission flow with `requestMotionPermission()` export
- Logo click now triggers shake (with shake animation on tap)
- Logo tap highlight suppressed (`-webkit-tap-highlight-color: transparent`)
- **Ambient play mode** (new feature):
  - Enabled by default; starts after 30s of inactivity
  - Plays gentle short taps (0.3–1.2s sustain) at unhurried pace (2–5s gaps)
  - When ambient starts, auto-applies random reverb + delay for pleasant ringing
  - Controls subtly evolve every ~10 notes (nudges reverb, delay, filter, crunch)
  - Any user interaction stops ambient and resets the 30s countdown
  - SVG möbius strip toggle icon left of logo: dim when off, medium when armed, breathing glow when playing
  - Click toggle starts ambient immediately (no waiting)
  - `useAmbientPlay` hook with `startNow`, `onAmbientStart`, `onAmbientTweak` callbacks

## 2026-03-16 — Mobile fixes, Android audio, floating shake bolt

- Fixed mobile switch layout to match spec: row 1 = play/arp + hold + stop, row 2 = mono/poly + bpm slider
- Fixed Android localhost audio: added secure context guard for AudioWorklet (graceful fallback on HTTP), added `pointerdown` to gesture resume events, added optional HTTPS to Vite dev server via self-signed certs
- Replaced mobile shake circle button with floating semi-transparent lightning bolt that dances next to the logo; desktop circle button unchanged

## 2026-03-16 — Mobile layout reorg, stop button refactor

- Reorganized ActivationMode mobile layout: rocker switches side-by-side in row 1, Hold+Stop in row 2, BPM slider full-width in row 3
- Stop button refactored: uses onStop/onKillAll callbacks instead of direct engine access; double-tap (< 400ms) kills all sound including tails
- Stop button always enabled (no longer gated on hold mode)

## 2026-03-16 — Staff depth, crunch boost, arp trigger markers

- Staff notation now has depth (z-axis) perspective — notes and lines scale/brighten as they wave forward and dim as they recede, creating genuine forward/backward motion instead of just up/down
- Inactive staff (no notes playing) is now much more transparent, fading to ~25-30% opacity when silent
- Crunch effect significantly boosted: bit depth now drops to 2 (was 3), sample reduction up to 39× (was 26×), front-loaded curve so first half of slider has more bite, fuller slapback mix
- Arp+poly+hold mode now shows glowing pink trigger lines on the ribbon at each active arp note position; clicking a marker removes that note from the arp cycle
- Added `frequencyToPosition()` inverse utility for mapping Hz back to ribbon position

## 2026-03-16 — Flag-wave staff, osc recolor, arp+hold fix

- Staff notation now waves like a flag — amplitude increases toward edges, multiple sine waves create organic billowing motion
  - Notes follow the flag wave path instead of scrolling in a straight line
  - Lo mode gets a gentler version of the same wave
- Replaced osc color scheme: cyan/magenta/purple → red/gold/green (console button palette)
  - Updated CSS variables, Controls.jsx OSC_COLORS, 3D visualizer sphere colors
  - Osc labels use new colors with softer text-shadow
- Added `user-select: none` to entire app to prevent accidental text selection on double-click
- Fixed arp+poly+hold mode:
  - Mouse movement no longer changes pitch when in arp mode (was only intended for play+hold)
  - Ribbon drag in arp+poly+hold is suppressed — each tap is a discrete note add/remove
  - Global pitch-follow effect now correctly skips arp mode entirely

## 2026-03-16 — Staff notation visual, console restyling

- Replaced waveform display with scrolling musical staff notation visual
  - 5 green neon staff lines with gentle wavering animation
  - Pink/magenta neon notes spawn as user plays, scroll right to left
  - Notes positioned on staff based on detected pitch frequency (MIDI mapping)
  - Note heads as tilted ellipses with stems and flags, glow layers for neon effect
  - Lo mode gets a simpler muted version of the staff
  - Inspired by Rock & Rule neon music staff screenshot
- Removed CRT scanline grid from controls panel background
  - Kept structural elements: horizontal panel seams, vertical ribs, brushed steel grain
  - Slightly increased opacity on remaining layers for more solid building feel
- Removed chunky colored button strip from bottom of controls panel (was decorative only)
- Restyled oscillator section housings:
  - Replaced glowing colored border-left with chunky beveled panel borders
  - Light/shadow border pattern creates raised panel illusion (brutalist hardware feel)
  - Subtle color accent strip along top of each osc section
  - Hover state adds faint osc-color glow

## 2026-03-15 — iOS audio fix (root cause)

- Root cause: visualizer animation loop called `getEngine()` on every frame, which triggered `AudioContext` creation outside a user gesture — iOS Safari permanently suspends contexts created this way
- Fix: `useAudioEngine` now pre-initializes on first user gesture (touchstart/mousedown/click/keydown/pointerdown) via document-level capture listeners
- Added `getEngine.peek()` — returns engine or null without triggering init, used by visualizer animation loops
- Both `useVisualizer` and `use3DVisualizer` updated to use `peek()` so they never create the AudioContext

## 2026-03-15 — Volume fader performance fix

- Eliminated lag on DJ volume fader by caching getBoundingClientRect on pointerdown instead of every move
- Thumb position updates directly via DOM refs, bypassing React re-render cycle during drag
- Volume state sync deferred to requestAnimationFrame to avoid re-rendering entire Controls tree on each pointer move

## 2026-03-15 — Mobile overhaul + audio fix

- Restructured mobile toggles into two rows: Row 1 (play/arp + hold + stop), Row 2 (mono/poly + BPM slider) — compact layout, no overflow
- Volume fader stretches full width on mobile as its own row
- Ribbon now appears above controls on mobile (under header logo) via CSS `order`
- Removed 'analog ribbon synth' subtitle text
- Fixed mobile audio not playing: added document-level gesture listener (touchstart, mousedown, click, keydown) to resume suspended AudioContext — required by iOS/mobile Safari autoplay policy
- Bitcrush AudioWorklet now retries loading after context resumes (was silently failing on mobile)
- Fixed DJ volume fader on mobile: JS was calculating position from clientY (vertical) but CSS transforms the fader to horizontal on small screens — now auto-detects orientation from track dimensions

## 2026-03-14 — Shake refinements

- Removed volume slider from shake randomization (velocity differences handle this)
- Added octave randomization on shake (random 1-5, not nudge — small range needs full random)
- Added scale randomization on shake (picks random scale from available options)
- Fixed octave not visibly changing on shake (nudge delta too small for integer range)

## 2026-03-14 — Toggles integrated into controls panel with DJ fader

- Moved toggles (Play/Arp, Mono/Poly, Hold, BPM) inside the controls panel as a left column
- Reordered: Play/Arp → Mono/Poly → Hold → BPM (top to bottom)
- Added vertical DJ mixer line fader for volume underneath the toggles
- Removed volume from the shared controls section (replaced by fader)
- Enhanced rocker switches with more physical 3D dimension:
  - Multi-layer gradients, beveled borders, raised/pressed transforms
  - Deeper inset shadows on active side, subtle highlight on inactive
  - Thicker divider with edge highlights
  - Indicator lights with radial gradient and glass-like border
  - Hold button matches 3D style
- Rest of controls slide right of the toggles column
- On mobile, toggles wrap horizontally above the main controls

## 2026-03-14 — Activation controls sidebar layout

- Moved activation controls (Play/Arp, BPM, Mono/Poly, Hold, Stop) to a vertical sidebar on the left of the controls panel
- Wrapped ActivationMode + Controls in a flex row container (`.controls-row`)
- Simplified ActivationMode JSX: removed switch-group/switch-row wrappers, flat vertical stack
- BPM slider stacks vertically under Play/Arp rocker
- On mobile, activation controls flow horizontally and stack above controls

## 2026-03-14 — Live multi-key arp cycling

- In arp+poly mode, holding multiple keyboard keys now cycles the arpeggiator through all held notes
- Notes added on keydown, removed on keyup — arp auto-starts/stops based on held keys
- Distinct from arp+hold+poly (latched toggle): this is live, based on which keys are currently pressed
- Extended arp note auto-start/stop effect to cover arp+poly (not just arp+hold+poly)

## 2026-03-14 — Rocker switches, layout polish, v1 deploy

- Redesigned toggle switches as rocker switches with pressed/raised 3D visual states
  - Active side pressed inward (inset shadow), inactive side raised (outset shadow)
  - Larger, more tactile — more fun to press
- Layout reorganization:
  - Row 1: Play/Arp rocker + BPM slider to the right
  - Row 2: Mono/Poly rocker + Hold button + Stop button
  - BPM slider always visible, dimmed when not in arp mode
  - Keys toggle repositioned below controls panel, above ribbon
- Deployed v1 branch to ribbon.obfusco.us/v1 for posterity
- Updated deploy workflow to preserve versioned folders (`--exclude "v*/*"`)

## 2026-03-14 — Hardware-style switches, mono/poly, control redesign

- Replaced Play/Latch/Arp mode buttons with hardware-style toggle switches
  - Play/Arp toggle switch: clementine orange light (play), grapefruit pink + avocado green + meyer lemon yellow lights (arp)
  - Mono/Poly toggle switch: sky blue light (mono), eggplant purple + lime green + silver lights (poly)
  - Indicator lights glow when active, dim when inactive
- Removed standalone latch mode (functionality preserved via arp+hold+poly combo)
- Added mono/poly voice mode: mono = one voice at a time, poly = multi-voice (default: mono)
- Arp+Hold now triggers held arp (continues after release)
- Arp+Hold+Poly triggers multi-note arp building (tap notes to add to sequence)
- Hold button now has blood orange red indicator light
- Keys toggle moved between ribbon and controls panel, more subtle/discreet styling
- Shake randomization now sometimes toggles switches (play/arp, mono/poly) and hold
  - Switch toggle chance is lower (~8-23%) than parameter nudges
  - Hold toggle even rarer (~60% of switch chance)
- Keyboard shortcuts updated: 1=play, 2=arp, 3=mono/poly toggle, 4=hold
- Stop button now shown whenever Hold is active (replaces latch-only stop)

## 2026-03-14 — Spacebar arp stop, BPM shake, input simplification, latch+arp combo

- Spacebar now stops the arpeggiator in addition to cutting all notes
- BPM added to shake randomization (nudged within 40-300 range like other controls)
- Removed Touch/Keys input mode selector; replaced with a single minimal Keys toggle button
- New latch+arp combo mode: pressing both Latch (2) and Arp (3) activates combined mode
  - Tapping notes on the ribbon or keyboard adds them to an arp sequence
  - Tapping the same note removes it from the sequence
  - Arp auto-starts when first note is added, auto-stops when all removed
  - Spacebar clears all latched arp notes
- Arpeggiator refactored to support cycling through a notes array (for latch+arp)
- Mode buttons highlight both Latch and Arp when in combined mode

## 2026-03-14 — Bitcrush effect

- Added bitcrush/digitize effect via AudioWorklet processor
- Two parameters: bit depth (1-16) and sample rate reduction (1-40x)
- Dry/wet mix control for blending clean and crushed signal
- Signal chain: masterGain → [crushDry + crushNode→crushWet] → postCrushGain → effects
- Worklet loads async on init; gracefully degrades if unavailable
- UI: Crush section with Bits, Rate, and Mix knobs in controls panel
- Integrated into shake randomization (all 3 crush params can be nudged)

## 2026-03-14 — Multi-select scales, visual mode relocation, shake combos

- Scale selection now supports multi-select: toggle multiple scales (major+blues, etc.) to create combined note sets
- Scale intervals merged via union — selecting multiple scales gives you all notes from each
- Chromatic acts as reset/default; selecting any other scale deselects chromatic
- If all scales are deselected, falls back to chromatic
- Moved Party/Lo visual mode toggle from ActivationMode bar to upper-left corner overlay (matches zoom buttons style)
- Shake/quake reworked: removed blocking cooldown, rapid clicks/Enter presses now accumulate
- Combo system: triggers within 800ms window boost intensity (each extra hit adds ~0.15 up to +0.6)
- Randomization chance scales with intensity (20%–50% of parameters nudged)
- Shake sound velocity now scales with combo intensity (louder rapid shakes)
- Tagged main as v1

## 2026-03-13 — Shake/Quake feature

- New shake/quake mechanic: shakes the synth universe, randomizes controls, triggers ribbon sound
- Trigger methods: Enter key, click outside controls/ribbon, device accelerometer (mobile shake)
- Accelerometer intensity mapped from shake magnitude for variable effect strength
- ~25% of all slider/button parameters randomly nudged on each shake, scaled by intensity
- CSS shake animation on controls panel and ribbon container
- Ribbon track undulation animation (scaleY + translateY spring effect)
- Random ribbon press at <50% velocity with auto-release after 150-400ms
- useShake hook handles all detection with cooldown to prevent spam
- Controls and Ribbon converted to forwardRef for click-outside detection

## 2026-03-13 — Controls reorganization, 3rd oscillator, polish

- Added 3rd oscillator (AudioEngine NUM_OSCILLATORS=3, App state, Controls UI)
- Reorganized controls: 3 oscillators laid out horizontally across top, each with vertical wave/mix/detune stack
- Speed control moved under Filter section
- Widened logo b stems (44→76 spread, up from 48→70) with updated infinity ribbon paths
- Space key now always cuts sound regardless of mode (was only working in latch/hold)
- Dimmed sphere grid opacity (base 0.2→0.12, capped at 0.6)
- CI/CD auto-deploy to S3/CloudFront on push to main

## 2026-03-13 — 3D grid sphere visualizer

- Added Three.js for 3D rendering layer behind existing 2D canvas
- 3 wireframe grid spheres, each mapped to a frequency band (low/mid/high)
- Spheres rotate around unique axes, speed driven by audio energy + ribbon velocity
- Scale pulses with audio energy per band
- Opacity responds to energy (brighter when louder, dim at idle)
- +/- keyboard controls zoom camera in/out with smooth interpolation
- Zooming out causes spheres to drift apart in 3 different directions
- Inner glow mesh per sphere for depth effect
- Layered behind existing 2D visualizer (particles, waveform, bars still visible on top)
- Works in both party and lo visual modes (lo = very dim)

## 2026-03-12 — Polyphonic support

- Refactored AudioEngine from monophonic to voice pool system (max 8 voices)
- Voices created on demand with per-voice oscillator pair, gain, and filter nodes
- All voices feed into shared masterGain → effects chain (delay, reverb, analyser)
- Voice lifecycle: create on voiceOn, fade + cleanup on voiceOff, with 300ms reuse window for arp
- Voice stealing: oldest voice replaced when at capacity
- Multi-touch ribbon: each pointer gets its own voice via pointerId tracking
- Multi-key keyboard: each held key (A-L) plays its own voice simultaneously
- Multiple cursors rendered on ribbon for all active voices
- Global settings (waveform, detune, mix, filter, volume) propagated to all active voices
- Latch mode: individual note toggling (press key to start, press again to stop)
- Hold mode: works with poly — voices sustain after release, global mouse pitch control only when single voice active
- Space / Stop button uses allNotesOff to clear all voices
- Arp mode stays monophonic (uses mono convenience API)

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
