// Only bounded, non-sensitive mixer settings cross the persistence boundary.
export const AUDIO_LAYER_IDS = Object.freeze([
  'rain-soft', 'rain-heavy', 'rain-window', 'wind', 'leaves', 'birds',
  'stream', 'crickets', 'fire', 'train-track', 'train-wheels', 'carriage',
]);
export const AUDIO_PRESET_IDS = Object.freeze([
  'rainy-evening', 'morning-garden', 'quiet-night', 'peaceful-journey', 'custom',
]);

export const AUDIO_PRESET_LEVELS = Object.freeze({
  'rainy-evening': Object.freeze({ 'rain-soft': 0.4, fire: 0.25, wind: 0.15 }),
  'morning-garden': Object.freeze({ birds: 0.5, stream: 0.35, wind: 0.25 }),
  'quiet-night': Object.freeze({ crickets: 0.4, wind: 0.2, stream: 0.1 }),
  'peaceful-journey': Object.freeze({ 'train-track': 0.35, 'train-wheels': 0.2, wind: 0.1 }),
});

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exactKeys = (value, keys) => isRecord(value) && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));
const validVolume = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

export function cloneAudioLayers(layers) {
  return Object.fromEntries(AUDIO_LAYER_IDS.map((id) => [id, { ...layers[id] }]));
}

function presetLayers(id) {
  const levels = AUDIO_PRESET_LEVELS[id] ?? {};
  return Object.fromEntries(AUDIO_LAYER_IDS.map((layerId) => [layerId, {
    enabled: Object.hasOwn(levels, layerId), volume: levels[layerId] ?? 0.35,
  }]));
}

const initialLayers = presetLayers('rainy-evening');
for (const layer of Object.values(initialLayers)) Object.freeze(layer);
Object.freeze(initialLayers);
export const DEFAULT_MIXER = Object.freeze({
  version: 1, preset: 'rainy-evening', muted: false,
  layers: initialLayers, customLayers: initialLayers,
});

function validLayers(layers) {
  return exactKeys(layers, AUDIO_LAYER_IDS) && AUDIO_LAYER_IDS.every((id) => (
    exactKeys(layers[id], ['enabled', 'volume'])
      && typeof layers[id].enabled === 'boolean' && validVolume(layers[id].volume)
  ));
}

/** Reject extra fields at every level before saving or invoking IPC. */
export function validateMixer(value) {
  if (!exactKeys(value, ['version', 'preset', 'muted', 'layers', 'customLayers'])
    || value.version !== 1 || !AUDIO_PRESET_IDS.includes(value.preset)
    || typeof value.muted !== 'boolean' || !validLayers(value.layers) || !validLayers(value.customLayers)) {
    throw new TypeError('Invalid mixer settings.');
  }
  return {
    version: 1, preset: value.preset, muted: value.muted,
    layers: cloneAudioLayers(value.layers), customLayers: cloneAudioLayers(value.customLayers),
  };
}

/** Disk recovery copies only the explicit schema; arbitrary data never survives. */
export function normalizeMixer(value) {
  const source = isRecord(value) && value.version === 1 ? value : {};
  const preset = AUDIO_PRESET_IDS.includes(source.preset) ? source.preset : DEFAULT_MIXER.preset;
  const recoverLayers = (candidate, fallback) => Object.fromEntries(AUDIO_LAYER_IDS.map((id) => {
    const layer = isRecord(candidate) && isRecord(candidate[id]) ? candidate[id] : {};
    return [id, {
      enabled: typeof layer.enabled === 'boolean' ? layer.enabled : fallback[id].enabled,
      volume: validVolume(layer.volume) ? layer.volume : fallback[id].volume,
    }];
  }));
  const fallback = preset === 'custom' ? DEFAULT_MIXER.layers : presetLayers(preset);
  const layers = recoverLayers(source.layers, fallback);
  return {
    version: 1, preset, muted: typeof source.muted === 'boolean' ? source.muted : false,
    layers, customLayers: recoverLayers(source.customLayers, preset === 'custom' ? layers : DEFAULT_MIXER.customLayers),
  };
}

/** Selecting a preset never discards the last manually edited combination. */
export function createPresetMix(id, previousMixer = DEFAULT_MIXER) {
  if (!AUDIO_PRESET_IDS.includes(id)) throw new TypeError('Unknown audio preset.');
  const previous = normalizeMixer(previousMixer);
  return {
    ...previous, preset: id,
    layers: id === 'custom' ? cloneAudioLayers(previous.customLayers) : presetLayers(id),
  };
}
