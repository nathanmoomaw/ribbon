import { useEffect, useRef, useCallback, useState } from 'react'

// Standard MIDI note to frequency
function midiToHz(note) {
  return 440 * Math.pow(2, (note - 69) / 12)
}

// Map CC 0-127 to a range, optionally with exponential curve
function ccToRange(cc, min, max, curve = 'linear') {
  const t = cc / 127
  if (curve === 'exp') {
    // Exponential mapping for frequency-like params
    return min * Math.pow(max / min, t)
  }
  return min + t * (max - min)
}

// CC assignments — grouped logically
const CC = {
  MOD_WHEEL: 1,       // filter cutoff
  VOLUME: 7,          // master volume
  OSC1_MIX: 12,
  OSC2_MIX: 13,
  OSC3_MIX: 14,
  OSC1_DETUNE: 15,
  OSC2_DETUNE: 16,
  OSC3_DETUNE: 17,
  GLIDE: 18,
  CRUNCH: 19,
  DELAY_TIME: 20,
  DELAY_FDBK: 21,
  DELAY_MIX: 22,
  BPM: 23,
  SUSTAIN: 64,         // hold toggle
  FILTER_RES: 71,      // standard filter resonance
  FILTER_CUT: 74,      // standard brightness/cutoff
  REVERB: 91,          // standard reverb send
}

export function useMIDI(getEngine, {
  setVolume, setFilterParams, setGlideSpeed, setDelayParams,
  setReverbMix, setCrunch, setOscParams, setArpBpm, setHold,
  mode, poly, hold, octaves, stepped, scale,
  handleArpNoteToggle, handleArpNoteAdd, handleArpNoteRemove,
  arpStart, arpStop,
}) {
  const [midiDevice, setMidiDevice] = useState(null)
  const midiAccessRef = useRef(null)
  const activeVoicesRef = useRef(new Map()) // noteNumber -> voiceId
  const modeRef = useRef(mode)
  const polyRef = useRef(poly)
  const holdRef = useRef(hold)
  modeRef.current = mode
  polyRef.current = poly
  holdRef.current = hold

  const handleNoteOn = useCallback((note, velocity) => {
    const engine = getEngine()
    const hz = midiToHz(note)
    const vel = velocity / 127

    if (modeRef.current === 'arp' && polyRef.current) {
      handleArpNoteAdd?.(hz)
      if (!activeVoicesRef.current.size) arpStart?.()
    } else if (modeRef.current === 'arp') {
      engine.setFrequency(hz)
      if (!activeVoicesRef.current.size) {
        engine.noteOn(vel)
        arpStart?.()
      }
    } else {
      const voiceId = `midi_${note}`
      engine.voiceOn(voiceId, hz, vel)
    }
    activeVoicesRef.current.set(note, hz)
  }, [getEngine, handleArpNoteAdd, arpStart])

  const handleNoteOff = useCallback((note) => {
    const engine = getEngine()
    const hz = activeVoicesRef.current.get(note)

    if (holdRef.current) {
      // In hold mode, don't stop — just remove from tracking
      activeVoicesRef.current.delete(note)
      return
    }

    if (modeRef.current === 'arp' && polyRef.current && hz) {
      handleArpNoteRemove?.(hz)
      activeVoicesRef.current.delete(note)
      if (!activeVoicesRef.current.size) arpStop?.()
    } else if (modeRef.current === 'arp') {
      activeVoicesRef.current.delete(note)
      if (!activeVoicesRef.current.size) {
        engine.noteOff()
        arpStop?.()
      }
    } else {
      const voiceId = `midi_${note}`
      engine.voiceOff(voiceId)
      activeVoicesRef.current.delete(note)
    }
  }, [getEngine, handleArpNoteRemove, arpStop])

  const handleCC = useCallback((cc, value) => {
    const engine = getEngine()

    switch (cc) {
      case CC.VOLUME:
      case CC.MOD_WHEEL: // fallthrough — mod wheel also controls volume if preferred
        if (cc === CC.VOLUME) {
          const vol = value / 127
          setVolume(vol)
          engine.setVolume(vol)
        } else {
          // Mod wheel → filter cutoff
          const cutoff = ccToRange(value, 20, 20000, 'exp')
          setFilterParams(prev => ({ ...prev, cutoff }))
          engine.setFilter({ cutoff })
        }
        break

      case CC.FILTER_CUT: {
        const cutoff = ccToRange(value, 20, 20000, 'exp')
        setFilterParams(prev => ({ ...prev, cutoff }))
        engine.setFilter({ cutoff })
        break
      }

      case CC.FILTER_RES: {
        const resonance = ccToRange(value, 0, 25)
        setFilterParams(prev => ({ ...prev, resonance }))
        engine.setFilter({ resonance })
        break
      }

      case CC.OSC1_MIX:
      case CC.OSC2_MIX:
      case CC.OSC3_MIX: {
        const idx = cc - CC.OSC1_MIX
        const mix = value / 127
        setOscParams(prev => {
          const next = [...prev]
          next[idx] = { ...next[idx], mix }
          return next
        })
        engine.setOscMix(idx, mix)
        break
      }

      case CC.OSC1_DETUNE:
      case CC.OSC2_DETUNE:
      case CC.OSC3_DETUNE: {
        const idx = cc - CC.OSC1_DETUNE
        const detune = Math.round(ccToRange(value, -1200, 1200))
        setOscParams(prev => {
          const next = [...prev]
          next[idx] = { ...next[idx], detune }
          return next
        })
        engine.setOscDetune(idx, detune)
        break
      }

      case CC.GLIDE: {
        const speed = ccToRange(value, 0.001, 0.3, 'exp')
        setGlideSpeed(speed)
        engine.setGlideSpeed(speed)
        break
      }

      case CC.CRUNCH: {
        const crunch = value / 127
        setCrunch(crunch)
        engine.setCrunch(crunch)
        break
      }

      case CC.DELAY_TIME: {
        const time = ccToRange(value, 0.05, 1)
        setDelayParams(prev => ({ ...prev, time }))
        engine.setDelay({ time })
        break
      }

      case CC.DELAY_FDBK: {
        const feedback = ccToRange(value, 0, 0.9)
        setDelayParams(prev => ({ ...prev, feedback }))
        engine.setDelay({ feedback })
        break
      }

      case CC.DELAY_MIX: {
        const mix = value / 127
        setDelayParams(prev => ({ ...prev, mix }))
        engine.setDelay({ mix })
        break
      }

      case CC.BPM: {
        const bpm = Math.round(ccToRange(value, 40, 300))
        setArpBpm(bpm)
        break
      }

      case CC.SUSTAIN: {
        // Standard sustain pedal: >=64 is on
        setHold(value >= 64)
        break
      }

      case CC.REVERB: {
        const mix = value / 127
        setReverbMix(mix)
        engine.setReverb({ mix })
        break
      }
    }
  }, [getEngine, setVolume, setFilterParams, setGlideSpeed, setDelayParams, setReverbMix, setCrunch, setOscParams, setArpBpm, setHold])

  const handlePitchBend = useCallback((lsb, msb) => {
    const engine = getEngine()
    // 14-bit pitch bend: 0-16383, center at 8192
    const bend = ((msb << 7) | lsb) - 8192
    // +-2 semitones range (standard)
    const semitones = (bend / 8192) * 2
    // Apply bend to all active MIDI voices
    for (const [note] of activeVoicesRef.current) {
      const bentHz = midiToHz(note + semitones)
      const voiceId = `midi_${note}`
      engine.voiceSetFrequency(voiceId, bentHz)
    }
  }, [getEngine])

  const handleMIDIMessage = useCallback((e) => {
    const [status, data1, data2] = e.data
    const type = status & 0xf0

    switch (type) {
      case 0x90: // Note On
        if (data2 > 0) handleNoteOn(data1, data2)
        else handleNoteOff(data1) // velocity 0 = note off
        break
      case 0x80: // Note Off
        handleNoteOff(data1)
        break
      case 0xb0: // CC
        handleCC(data1, data2)
        break
      case 0xe0: // Pitch Bend
        handlePitchBend(data1, data2)
        break
    }
  }, [handleNoteOn, handleNoteOff, handleCC, handlePitchBend])

  const connectMIDI = useCallback(() => {
    if (!navigator.requestMIDIAccess) {
      setMidiDevice('unsupported')
      return
    }
    if (midiAccessRef.current) return // already connected

    navigator.requestMIDIAccess({ sysex: false }).then((access) => {
      midiAccessRef.current = access

      const connectInputs = () => {
        let firstName = null
        for (const input of access.inputs.values()) {
          input.onmidimessage = handleMIDIMessage
          if (!firstName) firstName = input.name
        }
        setMidiDevice(firstName || 'no-device')
      }

      connectInputs()

      access.onstatechange = () => {
        connectInputs()
      }
    }).catch(() => {
      setMidiDevice('denied')
    })
  }, [handleMIDIMessage])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (midiAccessRef.current) {
        for (const input of midiAccessRef.current.inputs.values()) {
          input.onmidimessage = null
        }
      }
    }
  }, [])

  return { midiDevice, connectMIDI }
}
