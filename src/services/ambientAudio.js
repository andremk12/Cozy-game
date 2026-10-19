const MAX_GAIN = 0.25;
const FADE_SECONDS = 0.14;

function createAudioContext() {
  const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  return Context ? new Context() : null;
}

function clampVolume(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

/**
 * Original, quiet procedural rain. Constructing this service never starts sound.
 * Call start() directly from an explicit audio-button gesture; a restored setting
 * must not call it. No samples, network requests, recording, or microphone access.
 */
export class AmbientAudio {
  constructor({ contextFactory = createAudioContext, random = Math.random } = {}) {
    this._contextFactory = contextFactory;
    this._random = random;
    this._context = null;
    this._nodes = [];
    this._source = null;
    this._master = null;
    this._rainGain = null;
    this._volume = 0.25;
    this._rain = true;
    this._playing = false;
    this._disposed = false;
    this._operation = 0;
    this._suspendTimer = null;
  }

  _createGraph() {
    const context = this._contextFactory();
    if (!context) return false;
    this._context = context;
    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const rainGain = context.createGain();
    const master = context.createGain();
    this._source = source;
    this._master = master;
    this._rainGain = rainGain;
    this._nodes = [source, highpass, lowpass, rainGain, master];

    // The buffer is synthesized locally and decorrelated in stereo. Gentle
    // ripples are mixed into the same buffer, so no background timers are needed.
    const length = Math.floor(context.sampleRate * 8);
    const buffer = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const samples = buffer.getChannelData(channel);
      let softNoise = 0;
      for (let i = 0; i < length; i += 1) {
        softNoise = softNoise * 0.82 + (this._random() * 2 - 1) * 0.18;
        samples[i] = softNoise * 0.34;
      }
      for (let drop = 0; drop < 7; drop += 1) {
        const start = Math.floor((0.3 + this._random() * 7.2) * context.sampleRate);
        const frequency = 650 + this._random() * 550;
        const duration = Math.floor(context.sampleRate * 0.09);
        for (let i = 0; i < duration && start + i < length; i += 1) {
          const time = i / context.sampleRate;
          const envelope = Math.sin((Math.PI * i) / duration) * Math.exp(-time * 45);
          samples[start + i] += Math.sin(2 * Math.PI * frequency * time) * envelope * 0.025;
        }
      }
    }
    source.buffer = buffer;
    source.loop = true;
    highpass.type = 'highpass';
    highpass.frequency.value = 180;
    highpass.Q.value = 0.4;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2800;
    lowpass.Q.value = 0.4;
    rainGain.gain.value = this._rain ? 1 : 0;
    master.gain.value = 0;
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(rainGain);
    rainGain.connect(master);
    master.connect(context.destination);
    source.start();
    return true;
  }

  _fade(parameter, value) {
    if (!this._context || !parameter) return;
    const now = this._context.currentTime;
    if (typeof parameter.cancelAndHoldAtTime === 'function') {
      parameter.cancelAndHoldAtTime(now);
    } else {
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(parameter.value, now);
    }
    parameter.setTargetAtTime(value, now, FADE_SECONDS);
  }

  async start() {
    if (this._disposed) return false;
    const operation = ++this._operation;
    this._playing = true;
    clearTimeout(this._suspendTimer);
    this._suspendTimer = null;
    try {
      if (!this._context && !this._createGraph()) {
        this._playing = false;
        return false;
      }
      if (this._context.state === 'suspended') await this._context.resume();
      if (this._disposed || !this._playing || operation !== this._operation) return false;
      if (this._context.state !== 'running') {
        this._playing = false;
        return false;
      }
      this._fade(this._rainGain.gain, this._rain ? 1 : 0);
      this._fade(this._master.gain, this._volume * MAX_GAIN);
      return true;
    } catch {
      if (operation === this._operation) this._playing = false;
      return false;
    }
  }

  setVolume(volume) {
    this._volume = clampVolume(volume);
    if (this._playing && this._master) this._fade(this._master.gain, this._volume * MAX_GAIN);
  }

  setRain(enabled) {
    this._rain = enabled === true;
    if (this._rainGain) this._fade(this._rainGain.gain, this._rain ? 1 : 0);
  }

  stop() {
    this._playing = false;
    this._operation += 1;
    clearTimeout(this._suspendTimer);
    if (!this._context) return;
    this._fade(this._master.gain, 0);
    const context = this._context;
    this._suspendTimer = setTimeout(() => {
      this._suspendTimer = null;
      if (!this._playing && !this._disposed && context.state === 'running') {
        void context.suspend().catch(() => {});
      }
    }, 850);
  }

  async dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._playing = false;
    this._operation += 1;
    clearTimeout(this._suspendTimer);
    this._suspendTimer = null;
    try {
      this._source?.stop();
    } catch {
      /* Already stopped or never started. */
    }
    for (const node of this._nodes) node.disconnect();
    const context = this._context;
    this._nodes = [];
    this._source = null;
    this._master = null;
    this._rainGain = null;
    this._context = null;
    if (context && context.state !== 'closed') {
      try {
        await context.close();
      } catch {
        /* Browser may already be closing. */
      }
    }
  }
}
