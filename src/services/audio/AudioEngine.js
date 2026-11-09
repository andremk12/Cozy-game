import { DEFAULT_MIXER, normalizeMixer } from '../../../shared/audio.js';
import { AUDIO_LAYERS, loadRecording } from './audioLibrary.js';
import { createProceduralBuffer, fadeGain, prepareLoop } from './AudioLayer.js';
import { createKitchenEffect, KITCHEN_EFFECT_SECONDS } from './kitchenEffects.js';

export const MAX_MASTER_GAIN = 0.25;
const RELEASE_MS = 850;
const clampVolume = (value) => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(0, Math.min(1, value)) : 0;
function createContext() {
  const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  return Context ? new Context() : null;
}

/** One user-activated context serves all scenes; preferences never activate it. */
export class AudioEngine {
  constructor({ contextFactory = createContext, recordingLoader = loadRecording, random = Math.random, onStateChange = () => {} } = {}) {
    this._contextFactory = contextFactory;
    this._recordingLoader = recordingLoader;
    this._random = random;
    this._onStateChange = onStateChange;
    this._context = null;
    this._master = null;
    this._mix = normalizeMixer(DEFAULT_MIXER);
    this._volume = 0.25;
    this._layers = new Map();
    this._pendingRecordings = new Map();
    this._scene = 'room';
    this._effects = new Set();
    this._effectsGain = null;
    this._effectsTarget = null;
    this._playing = false;
    this._disposed = false;
    this._operation = 0;
    this._suspendTimer = null;
    this._errors = new Set();
    this._masterTarget = null;
  }

  _emit() {
    if (this._disposed) return;
    const layers = Object.fromEntries(AUDIO_LAYERS.map(({ id }) => {
      const layer = this._layers.get(id);
      const eligible = this._isEligible(id);
      const playing = eligible && (layer?.source || (id === 'kitchen-effects' && this._effects.size));
      return [id, this._errors.has(id) ? 'error' : eligible && layer?.pending ? 'loading'
        : playing ? 'playing' : 'idle'];
    }));
    this._onStateChange({ playing: this._playing, layers, error: this._errors.size
      ? 'Alguns sons não puderam carregar. Desative e ative a camada para tentar novamente.' : '' });
  }

  _setMaster(seconds = 0.4) {
    const target = this._playing && !this._mix.muted ? this._volume * MAX_MASTER_GAIN : 0;
    if (this._master && this._context && target !== this._masterTarget) {
      this._masterTarget = target;
      fadeGain(this._context, this._master.gain, target, seconds);
    }
  }

  _setLayerGain(layer, value) {
    if (layer.target === value) return;
    layer.target = value;
    fadeGain(this._context, layer.gain.gain, value);
  }

  _release(id, layer) {
    if (this._layers.get(id) !== layer) return;
    clearTimeout(layer.releaseTimer);
    this._layers.delete(id);
    if (layer.source) {
      try { layer.source.stop(); } catch { /* Already stopped. */ }
      layer.source.disconnect();
      layer.source.buffer = null;
    }
    layer.gain.disconnect();
    layer.source = null;
    layer.buffer = null;
  }

  _isEligible(id) {
    const value = this._mix.layers[id];
    const definition = AUDIO_LAYERS.find((item) => item.id === id);
    return this._playing && value.enabled && value.volume > 0
      && (!definition.scene || definition.scene === this._scene);
  }

  _isWanted(id) {
    return this._isEligible(id) && id !== 'kitchen-effects';
  }

  // Navigation changes eligibility, never consent or the persisted mix. Pending
  // decodes are shared even if a fading layer is released before they finish.
  setScene(scene) {
    if (this._disposed || this._scene === scene) return;
    this._scene = scene;
    if (scene !== 'kitchen') this._clearEffects();
    for (const id of this._errors) if (!this._isWanted(id)) this._errors.delete(id);
    this._syncLayers();
  }

  _loadRecording(context, definition) {
    const { id } = definition;
    let pending = this._pendingRecordings.get(id);
    if (!pending) {
      pending = Promise.resolve().then(() => this._recordingLoader(context, id)).then((decoded) => {
        if (this._disposed || this._context !== context) return null;
        return prepareLoop(context, decoded, definition.loopOverlap);
      }).finally(() => {
        if (this._pendingRecordings.get(id) === pending) this._pendingRecordings.delete(id);
      });
      this._pendingRecordings.set(id, pending);
    }
    return pending;
  }

  _releaseEffect(effect, ended = false) {
    if (!this._effects.delete(effect)) return;
    effect.source.onended = null;
    if (!ended) {
      try { effect.source.stop(); } catch { /* A finite effect may already have ended. */ }
    }
    effect.source.disconnect();
    effect.source.buffer = null;
    this._emit();
  }

  _clearEffects() {
    for (const effect of this._effects) this._releaseEffect(effect);
  }

  _setEffectsGain() {
    const value = this._mix.layers['kitchen-effects'];
    const target = value.enabled ? value.volume : 0;
    if (this._effectsGain && this._effectsTarget !== target) {
      this._effectsTarget = target;
      fadeGain(this._context, this._effectsGain.gain, target, 0.08);
    }
  }

  /** Optional one-shots share the already authorized context and master gain. */
  playKitchenEffect(kind) {
    if (this._disposed || !this._playing || this._mix.muted || this._volume <= 0
      || !this._isEligible('kitchen-effects')
      || this._context?.state !== 'running' || !this._master
      || !Object.hasOwn(KITCHEN_EFFECT_SECONDS, kind)
      || [...this._effects].some((effect) => effect.kind === kind)) return false;
    let effect;
    try {
      if (!this._effectsGain) {
        const gain = this._context.createGain();
        try {
          gain.gain.value = 0;
          gain.connect(this._master);
          this._effectsGain = gain;
          this._setEffectsGain();
        } catch (error) {
          gain.disconnect();
          this._effectsGain = null;
          this._effectsTarget = null;
          throw error;
        }
      }
      const source = this._context.createBufferSource();
      effect = { kind, source };
      this._effects.add(effect);
      source.buffer = createKitchenEffect(this._context, kind);
      source.loop = false;
      source.connect(this._effectsGain);
      source.onended = () => this._releaseEffect(effect, true);
      source.start();
      this._emit();
      return true;
    } catch {
      if (effect) this._releaseEffect(effect);
      return false;
    }
  }

  _ensureLayer(definition) {
    const { id } = definition;
    let layer = this._layers.get(id);
    if (layer) {
      clearTimeout(layer.releaseTimer);
      layer.releaseTimer = null;
      if (layer.source) this._setLayerGain(layer, this._mix.layers[id].volume);
      return layer.pending ?? Promise.resolve();
    }
    if (!definition.available) {
      this._errors.add(id);
      return Promise.resolve();
    }
    const context = this._context;
    const gain = context.createGain();
    gain.gain.value = 0;
    layer = { gain, source: null, buffer: null, pending: null, releaseTimer: null, target: null };
    this._layers.set(id, layer);
    gain.connect(this._master);
    this._errors.delete(id);
    const load = async () => {
      try {
        let buffer;
        if (definition.source === 'procedural') buffer = createProceduralBuffer(context, id, this._random);
        else {
          buffer = await this._loadRecording(context, definition);
        }
        if (this._disposed || this._context !== context || this._layers.get(id) !== layer || !this._isWanted(id)) return;
        const source = context.createBufferSource();
        layer.source = source;
        layer.buffer = buffer;
        source.buffer = buffer;
        source.loop = true;
        source.connect(gain);
        source.start();
        this._setLayerGain(layer, this._mix.layers[id].volume);
      } catch {
        if (!this._disposed && this._layers.get(id) === layer) {
          if (this._isWanted(id)) this._errors.add(id);
          this._release(id, layer);
        }
      } finally {
        layer.pending = null;
        // A disabled layer that finished loading is not retained silently.
        if (!layer.source && this._layers.get(id) === layer) this._release(id, layer);
        this._emit();
      }
    };
    // Defer source creation by one microtask so pending has a stable lifecycle
    // even for synchronous procedural buffers or a thrown allocation.
    layer.pending = Promise.resolve().then(load);
    return layer.pending;
  }

  _syncLayers() {
    if (!this._context || !this._master) return [];
    const pending = [];
    for (const definition of AUDIO_LAYERS) {
      const { id } = definition;
      if (this._isWanted(id)) {
        try { pending.push(this._ensureLayer(definition)); }
        catch {
          this._errors.add(id);
          const layer = this._layers.get(id);
          if (layer) this._release(id, layer);
        }
      }
      else {
        const layer = this._layers.get(id);
        if (layer && !layer.releaseTimer) {
          this._setLayerGain(layer, 0);
          layer.releaseTimer = setTimeout(() => {
            this._release(id, layer);
            this._emit();
          }, RELEASE_MS);
        }
      }
    }
    this._emit();
    return pending;
  }

  setMix(mix) {
    if (this._disposed) return;
    const muted = this._mix.muted;
    this._mix = normalizeMixer(mix);
    if (this._mix.muted || !this._mix.layers['kitchen-effects'].enabled
      || this._mix.layers['kitchen-effects'].volume === 0) this._clearEffects();
    this._setEffectsGain();
    for (const id of this._errors) if (!this._mix.layers[id].enabled) this._errors.delete(id);
    this._setMaster(this._mix.muted && !muted ? 0.025 : 0.4);
    this._syncLayers();
    this._emit();
  }

  setVolume(value) {
    this._volume = clampVolume(value);
    if (this._volume === 0) this._clearEffects();
    this._setMaster(0.08);
  }

  async start() {
    if (this._disposed) return false;
    const operation = ++this._operation;
    clearTimeout(this._suspendTimer);
    this._suspendTimer = null;
    try {
      if (!this._context) {
        const context = this._contextFactory();
        if (!context) return false;
        try {
          this._master = context.createGain();
          this._master.gain.value = 0;
          this._master.connect(context.destination);
          this._context = context;
        } catch (error) {
          this._master?.disconnect();
          this._master = null;
          try { await context.close(); } catch { /* A partial graph must remain silent. */ }
          throw error;
        }
      }
      // Called before awaiting anything, directly inside the initiating gesture.
      if (this._context.state === 'suspended') await this._context.resume();
      if (this._disposed || operation !== this._operation || this._context.state !== 'running') return false;
      this._playing = true;
      this._setMaster();
      await Promise.all(this._syncLayers());
      if (this._disposed || operation !== this._operation) return false;
      this._emit();
      return true;
    } catch {
      if (operation === this._operation) this.stop();
      return false;
    }
  }

  stop() {
    this._playing = false;
    this._clearEffects();
    this._operation += 1;
    clearTimeout(this._suspendTimer);
    this._setMaster(0.08);
    this._syncLayers();
    const context = this._context;
    if (context) this._suspendTimer = setTimeout(() => {
      this._suspendTimer = null;
      if (!this._playing && !this._disposed && context.state === 'running') void context.suspend().catch(() => {});
    }, RELEASE_MS);
    this._emit();
  }

  async dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._playing = false;
    this._clearEffects();
    this._operation += 1;
    clearTimeout(this._suspendTimer);
    this._suspendTimer = null;
    for (const [id, layer] of this._layers) this._release(id, layer);
    this._pendingRecordings.clear();
    this._effectsGain?.disconnect();
    this._effectsGain = null;
    this._master?.disconnect();
    this._master = null;
    const context = this._context;
    this._context = null;
    if (context && context.state !== 'closed') {
      try { await context.close(); } catch { /* The browser may already be closing. */ }
    }
  }
}
