# ribbon - Initial Brain Dump

create a new CLAUDE.md for this ribbon project.  possibly called ribbow? something cute like that.  

ribbon will be a web app for mobile and desktop (with unique controls making the most of each of those input interfaces) that essentially emulates an analog ribbon synthesizer. My idea comes from the use of a Korg Monotribe.

I'm envisioning the option to control the ribbon itself via trackpad, mouse, touchscreen, keyboard keys, and camera.  user should be able to switch between these modes (or at least the ones available at the moment on that device).  keyboard shortcuts and onscreen buttons should control whether the ribbon is activated (playing, arpegiating or in some kind of latch mode).

it should use some oscillator plugin or some such to implement the sound (like a real analog synthesizer).  there should be easily adjustable knobs and switches and buttons.

it should also have some basic effects like delay, reverb, digitize so the user can actually easily create layered sounds and actually create some music that's real and worth listening to.

user should have the ability to save their composition.

consider idea for being able to launch more than one of these per session.

I want the design to be fun and animated with colors and patterns flowing from the ribbon as the sound is played.  the animations should "go to the music".  they should not interrupt the user's clean experience with the controls though.  the design should be somewhere between a party/candy store and a more creepy sci-fi space ship feel.  Emphasis on animation that actually contributes to the feeling and flow of the music and sound being created.

This will eventually live on it's own domain somewhere, but in the meantime I want it available at ribbon.obfusco.us.  I want to create a staging-deploy agent that runs through the necessary tasks of merging the current branch into staging.


# Friday March 13 additional features

[x] ribbon logo where the loops of the 'b's in the word connect together via a moebius strip that moves like an infinity ribbon (or magnetic tape)
[x] turn the grid 3d, like the synth is in the middle of a rolling 3d grid sphere.  there should be 3 spheres, one for each oscillator and each should move accordingly given what's being played and the settings of each oscillator.  they should be loosely on top of one another and moving in different directions.  the user should be able to change the perspective by pressing -/+.  as the user "zooms out" from the spheres they should move apart in 3 different directions.
[x] the color bars from the top should only be outlines, not filled in
[x] add 3rd oscillator
[x] try organizing the controls differently.  the 3 oscillators should line up across the top of the panel they're in, left to right.  vertically aligned for each, top to bottom, the components should be: wave, mix, detune.  put speed under the filter
[x] spread out the b's more (wider)
[x] space should also cut the sound.  sometimes it stays on
[x] sphere grids should be a bit dimmer
[x] add visual buttons for zooming in the upper right corner, but make them fairly subtle

# Saturday March 14 features, etc

[x] tag the current branch as v1
[x] add scale options.  these should be buttons and multiple should be able to be pressed at once resulting in combination scales.
[x] move the visuals buttons (party/lo) to the upper left corner of the screen (if this doesn't look good, we'll try the upper right, alongside the zoom)
[x] instead of the current blocking of multiple clicks for the shake functionality it should allow for fast clicking and this action should be seen as a larger shake (a bit louder and randomizes a bit more controls)
[x] spacebar should also stop the arp if it keeps playing
[x] bpm should also vary like the other controls on shake
[x] get rid of the touch button and just have a more minimal version of the keys button that just turns on and off
[x] allow latch and arp to both be pressed, the result being that multiple taps on the ribbon add those notes to the arp pattern.  ie. if user clicks latch and arp then clicks on F and then B and then D the arp would cycle those notes in the order they were triggered
[x] remove latch function for now (but remember this in case we want to bring it back).  the latech+arp combo i just created will be triggered by a new combination of buttons described below
[x] make arp and play buttons one single switch, either play or arp.  play/single should have a light on that side when activated it should be clementine orange.  the arp side, when activated, should light up 3 lights, grapefruit pink, avocado green and meyer lemon yellow
[x] add another switch next to that for mono/poly mode.  mono side should have one light it should be sky blue.  poly side should have three lights when activated, eggplant purple, lime green and silver
[x] keep the hold button, but add one light to this button as well, make it blood orange red
[x] the arp+latch combo functionality created earlier should be triggered by a combination of arp and the hold key.  if poly is also selected the functionality should be like that described by the latch+arp combo before.
[x] the keys button created before should be more discreet and subtle, hovering over the ribbon itself, between the ribbon and the controls panel
[x] shake should also affect these switches and sometimes even the hold button
[x] deploy my v1 branch to ribbon.obfusco.us/v1 and leave it there for posterity.  will do this for each iteration of "version"
[x] make the switches rocker switches (and larger, more fun to press)
[x] keep the tempo slider up always, but not active until on arp mode, also move it down under play/arp
[x] put the mono/poly button directly below the play/arp button
[x] put the bpm slider to the right of play/arp
[x] put the hold button cleanly to theh right of the mono/poly button
[x] the keys button isn't in the right place. it should be below the control panel and above the ribbon, no need to add any more spacing, just stick it nicely in there
[x] pressing multiple keys on the keyboard while poly and arp are triggered should cycle through those keys
[x] let's try the play/arp, mono/poly, hold button, and bpm slider all neatly organized to the left of the control panel, top to bottom
[x] give the toggle switches more dimension as if they were real physical switches
[x] put play/arp THEN below that mono/poly then hold (aligned with the other please) and THEN the bpm slider under that.  let's call that chunk of items the "toggles".  then put this whole thing (the toggles) into the control panel on the left side, pushing everything nicely to the right.
[x] put the main volume slider vertically and looking like a DJ mixer line fader underneath the toggles.
[x] the rest of the items should slide right and fit as messily as they currently are.  need to work on their alignment in the future
[x] hold button should be same width as toggle switches
[x] bpm slider should also be this width
[x] make the volume knob wider, so it is wider than the track it runs on (to better emulate a dj fader)
[x] still not seeing proper poly arping when pressing multiple keyboard keys
[x] outline on hold button looks funny
[x] always keep the stop button visible, just disable it
[x] future buttons and features should follow that pattern.  it's weird to have stuff move around in the ui when things are enabled
[x] the main volume slider should no longer change on shake. the velocity differences achieve this effect
[x] scale and octave should change sometimes on shake tho
[x] general note: when i say dev branch i mean nmj/wX where X is the number of the week i've been working on the project
[x] i don't see the octaves changing on shake
[x] seems to be bug where shake makes no octave selected. i don't know what it's doing, but it seems cool as fuck and i'd like to leave this bug

# Sunday March 15

[x] this is not optimized for mobile, the play/arp button falls off left, fix that and put directly under it the mono/poly button switch
[x] mobile master volume does not work as it should.  i think there's a bug where it thinks it's still a vertical slider, but apparently at this size it's not
[x] ok, the change you made for the switches isn't good.  they should be the same smaller width they were before.  they use too much screen estate like this.  the order and layout on mobile should be like this:
play/arp, hold, stop
mono/poly, bpm slider (horizontal)
volume slider (horizontal)
[x] on mobile always keep the ribbon at the top (but under the header logo), above all the controls
[x] let's remove the words 'analog ribbon synth' from this thing for now
[x] some people have told me that when they try to load this on mobile it doesn't make sound.  i am presently experiencing this with my mobile.  any ideas?
[x] main volume knob seems to have some lag, is there any way to improve performance
[x] i'm still not hearing sound on my mobile

# Monday March 16

[x] reorder the leftside console
[x] space bar pressed once should act as it does, pressed twice should stop all sound, like any remaining delay
[x] work more on mobile mode
[x] implement design concepts from rock & rule, screenshots, determine v2 clandestine concept
[x] work on design of the controls panel (roadmap further ux design), but for now let's just have fun with the design presentation: give it maybe 80% transparency, but let's give it a chunky texture, also include shadows/luminoscity from the revolving spheres that it's inside of (intensity of the shadows/light from the sphere)
[x] integrate/replace the waveform visual in the app with notes on a staff, or relative notes as they are played on the ribbon (placed relative on the staff relative to the tone triggered by the ribbon).  this semitransparent staff should be a moving animated wavering scroll of staff that goes mostly behind the control panel/ribbon (ask for screenshot)
[x] allow all claude commands on that repo globally without approval
[x] start a plan of how to simply/transparently implement concepts of nft/eft gain from usage of this simple toy
[x] let's find some way to simplify the bitcrusher effect into one easy/fun to use slider that applies a significant effect that sounds good and crunchy.  while we're at it let's pair it with a very tight bit of slapback delay to enhance the sound it creates
[x] in some spare space (perhaps the lower right corner) of the console create a subtle button that animates a bit and acts as a more explicit trigger for the shake functionality
[x] remove the chunky colored button strip.  it's doing nothing.  use the design concept of the chunky buttons to restyle each of the 3 osc housings, replacing the "glowing" blue, pink, purple outlines of each with chunky beveled sections that nod to the buttons in that screenshot
[x] also remove the extra CRT scanline grid that you applied to the console.  instead, turn back to the first screenshot i gave you today and lean into the style of buildings more for the console.
[x] here is the screenshot I was referencing for the notes on a staff: (<Screenshot 2026-03-15 at 23.55.39.png>)
[x] the staff with the notes should sort of wave like a flag.  use the image i provided for inspiration on that.  note that it seems to waver back and forward.  the notes themselves should move with it.  they should not just go in a straight line heading left.
[x] replace the blue, pink, purple colors from the oscillators entirely.  replace these with colors and texture styles pulled from the buttons on the screenshot with the console.
[x] text on the console etc should not be able to accidentally get selected by double clicking
[x] let's work on getting the arp/hold functionality improved.  first, if hold is selected and it's on play mode it should behave as it does.  however, on arp and poly with hold it should behave differently.  if the user selects arp + poly + hold then triggers the ribbon (even via a shake) additional movement of the mouse should not change the tone like it does during play mode.  the user should be able to click the ribbon again and ADD to the notes being played in the arp this way (like pressing multiple keyboard buttons on the keyboard at once).  for instance if the user is on this mode then taps a C followed by an F followed by a Bb the arp should keep playing cycling those notes.

