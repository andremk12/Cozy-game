const { contextBridge, ipcRenderer } = require('electron');

// This sandboxed CommonJS boundary cannot import shared/companion.js. Keep its
// small schema and Unicode validation equivalent; main validates again.
function safeCompanion(companion) {
  const keys = ['enabled', 'name', 'appearance', 'soundEnabled', 'introduced'];
  if (!companion || typeof companion !== 'object' || Array.isArray(companion)
    || Object.keys(companion).length !== keys.length || !keys.every((key) => Object.hasOwn(companion, key))
    || typeof companion.enabled !== 'boolean' || typeof companion.introduced !== 'boolean'
    || !['default', 'ginger', 'midnight'].includes(companion.appearance) || companion.soundEnabled !== false
    || typeof companion.name !== 'string' || companion.name.length > 2048) {
    throw new TypeError('Invalid companion settings.');
  }
  const name = companion.name;
  if (name !== '') {
    const count = typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(name)].length : Array.from(name).length;
    if (name !== name.trim() || count > 24 || /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}\p{Bidi_Control}\ufeff]/u.test(name)
      || !/[^\p{White_Space}\p{Default_Ignorable_Code_Point}]/u.test(name)) {
      throw new TypeError('Invalid companion settings.');
    }
  }
  return Object.fromEntries(keys.map((key) => [key, companion[key]]));
}

// Sandboxed preloads cannot import ESM. Keep this bounded schema in sync with
// shared/audio.js; the trusted main process validates the same document again.
function safeMixer(mixer) {
  const ids = ['rain-soft', 'rain-heavy', 'rain-window', 'wind', 'leaves', 'birds',
    'stream', 'crickets', 'fire', 'train-track', 'train-wheels', 'carriage'];
  const presets = ['rainy-evening', 'morning-garden', 'quiet-night', 'peaceful-journey', 'custom'];
  const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
  const validLayers = (layers) => exact(layers, ids) && ids.every((id) => (
    exact(layers[id], ['enabled', 'volume']) && typeof layers[id].enabled === 'boolean'
      && typeof layers[id].volume === 'number' && Number.isFinite(layers[id].volume)
      && layers[id].volume >= 0 && layers[id].volume <= 1
  ));
  if (!exact(mixer, ['version', 'preset', 'muted', 'layers', 'customLayers'])
    || mixer.version !== 1 || !presets.includes(mixer.preset) || typeof mixer.muted !== 'boolean'
    || !validLayers(mixer.layers) || !validLayers(mixer.customLayers)) {
    throw new TypeError('Invalid mixer settings.');
  }
  const copy = (layers) => Object.fromEntries(ids.map((id) => [id, {
    enabled: layers[id].enabled, volume: layers[id].volume,
  }]));
  return { version: 1, preset: mixer.preset, muted: mixer.muted,
    layers: copy(mixer.layers), customLayers: copy(mixer.customLayers) };
}

function validGarden(garden) {
  const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
  const unique = (items) => new Set(items.map(({ slotId }) => slotId)).size === items.length;
  const plantSlots = ['bed-1', 'bed-2', 'bed-3', 'bed-4', 'pot-1', 'pot-2', 'pot-3', 'pot-4'];
  const decorations = {
    'bench-1': ['bench'], 'lantern-1': ['lantern'], 'lantern-2': ['lantern'],
    'accent-1': ['stone', 'mushroom'], 'accent-2': ['stone', 'mushroom'], 'accent-3': ['stone', 'mushroom'],
  };
  return exact(garden, ['version', 'plants', 'pots', 'decorations', 'atmosphere', 'weather'])
    && garden.version === 1 && ['day', 'sunset', 'night'].includes(garden.atmosphere) && ['clear', 'rain'].includes(garden.weather)
    && Array.isArray(garden.plants) && garden.plants.length <= 8 && garden.plants.every((plant) => (
      exact(plant, ['slotId', 'species', 'elapsedMs', 'updatedAt', 'wateredStages']) && plantSlots.includes(plant.slotId)
      && ['daisy', 'lavender', 'hibiscus', 'fern', 'succulent'].includes(plant.species)
      && Number.isFinite(plant.elapsedMs) && plant.elapsedMs >= 0 && plant.elapsedMs <= 1_200_000
      && Number.isFinite(plant.updatedAt) && plant.updatedAt >= 0 && plant.updatedAt <= 8_640_000_000_000_000
      && Array.isArray(plant.wateredStages) && plant.wateredStages.length <= 3
      && plant.wateredStages.every((stage) => Number.isInteger(stage) && stage >= 0 && stage <= 2)
      && new Set(plant.wateredStages).size === plant.wateredStages.length
    )) && unique(garden.plants)
    && Array.isArray(garden.pots) && garden.pots.length === 4 && garden.pots.every((pot) => (
      exact(pot, ['slotId', 'style']) && plantSlots.slice(4).includes(pot.slotId) && ['terracotta', 'wood'].includes(pot.style)
    )) && unique(garden.pots)
    && Array.isArray(garden.decorations) && garden.decorations.length <= 6 && garden.decorations.every((item) => (
      exact(item, ['slotId', 'kind', 'lit']) && Object.hasOwn(decorations, item.slotId)
      && decorations[item.slotId].includes(item.kind) && typeof item.lit === 'boolean' && (item.kind === 'lantern' || !item.lit)
    )) && unique(garden.decorations);
}

// The sandboxed renderer receives no filesystem, Node.js, or generic IPC access.
contextBridge.exposeInMainWorld('haven', Object.freeze({
  getGarden: () => ipcRenderer.invoke('haven:garden:get'),
  saveGarden: (garden) => {
    if (!validGarden(garden)) {
      return Promise.reject(new TypeError('Invalid garden document.'));
    }
    // The complete shared schema is validated again by the trusted main process.
    return ipcRenderer.invoke('haven:garden:save', garden);
  },
  getPreferences: () => ipcRenderer.invoke('haven:preferences:get'),
  savePreferences: (patch) => {
    const allowed = ['lampOn', 'rainOn', 'audioEnabled', 'volume', 'mixer', 'companion'];
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return Promise.reject(new TypeError('Invalid preferences.'));
    }
    const keys = Object.keys(patch);
    if (keys.length === 0 || keys.some((key) => !allowed.includes(key))) {
      return Promise.reject(new TypeError('Unknown or empty preferences.'));
    }
    for (const key of keys) {
      const value = patch[key];
      if (key === 'mixer') {
        try { safeMixer(value); } catch { return Promise.reject(new TypeError('Invalid mixer settings.')); }
        continue;
      }
      if (key === 'companion') {
        try { safeCompanion(value); } catch { return Promise.reject(new TypeError('Invalid companion settings.')); }
        continue;
      }
      if (key === 'volume'
        ? typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1
        : typeof value !== 'boolean') {
        return Promise.reject(new TypeError('Invalid preference value.'));
      }
    }
    return ipcRenderer.invoke('haven:preferences:save', Object.fromEntries(keys.map((key) => [
      key, key === 'mixer' ? safeMixer(patch[key]) : key === 'companion' ? safeCompanion(patch[key]) : patch[key],
    ])));
  },
}));
