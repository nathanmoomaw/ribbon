class BitcrushProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bitDepth', defaultValue: 16, minValue: 1, maxValue: 16, automationRate: 'k-rate' },
      { name: 'reduction', defaultValue: 1, minValue: 1, maxValue: 40, automationRate: 'k-rate' },
    ]
  }

  constructor() {
    super()
    this._held = 0
    this._counter = 0
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    if (!input || !input.length) return true

    const bitDepth = parameters.bitDepth[0]
    const reduction = Math.floor(parameters.reduction[0])
    const levels = Math.pow(2, bitDepth)

    for (let ch = 0; ch < input.length; ch++) {
      const inp = input[ch]
      const out = output[ch]
      for (let i = 0; i < inp.length; i++) {
        // Sample & hold: only update held value every N samples
        if (this._counter === 0) {
          // Bit crush: quantize to reduced bit depth
          this._held = Math.round(inp[i] * levels) / levels
        }
        this._counter = (this._counter + 1) % reduction
        out[i] = this._held
      }
    }

    return true
  }
}

registerProcessor('bitcrush-processor', BitcrushProcessor)
