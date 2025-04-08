class MicrophoneProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (event) => {
      // handle messages from main thread if needed
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0]; // mono
      this.port.postMessage(channelData);
    }
    return true; // keep processor alive
  }
}

registerProcessor('microphone-processor', MicrophoneProcessor);
