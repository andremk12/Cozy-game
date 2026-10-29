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

// Memory notes are deliberately persistent, explicitly created content. This
// bounded schema is separate from preferences and the ephemeral ritual draft.
function safeMemory(board) {
  const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
  const id = (value) => typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
  const text = (value, max) => typeof value === 'string' && value.length <= max
    && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cs}]/u.test(value);
  if (!exact(board, ['version', 'theme', 'decorations', 'items']) || board.version !== 1
    || !['warm', 'moonlight', 'garden'].includes(board.theme)
    || !exact(board.decorations, ['lights', 'flowers', 'stars'])
    || !Object.values(board.decorations).every((value) => typeof value === 'boolean')
    || !Array.isArray(board.items) || board.items.length > 60) throw new TypeError('Invalid memory board.');
  const ids = new Set();
  for (const item of board.items) {
    const common = ['id', 'kind', 'x', 'y', 'rotation'];
    const fields = item?.kind === 'photo' ? ['imageId', 'frame', 'caption'] : ['text', 'paper', 'style'];
    if (!exact(item, [...common, ...fields]) || !id(item.id) || ids.has(item.id)
      || !Number.isFinite(item.x) || !Number.isFinite(item.y) || item.x < 0 || item.x > 1 || item.y < 0 || item.y > 1
      || ![-8, -4, 0, 4, 8].includes(item.rotation)) throw new TypeError('Invalid memory item.');
    ids.add(item.id);
    if (item.kind === 'photo') {
      if (!id(item.imageId) || !['polaroid', 'light-wood', 'dark-wood', 'simple', 'floral'].includes(item.frame)
        || !text(item.caption, 300)) throw new TypeError('Invalid memory photo.');
    } else if (item.kind !== 'note' || !text(item.text, 2000) || !item.text.trim()
      || !['beige', 'rose', 'sage', 'blue', 'lilac'].includes(item.paper)
      || !['plain', 'lined', 'torn'].includes(item.style)) throw new TypeError('Invalid memory note.');
  }
  return { version: 1, theme: board.theme, decorations: { ...board.decorations }, items: board.items.map((item) => ({ ...item })) };
}

const memoryWithoutArguments = (channel, args) => args.length
  ? Promise.reject(new TypeError('Unexpected memory arguments.')) : ipcRenderer.invoke(channel);

// The sandboxed renderer receives no filesystem, Node.js, or generic IPC access.
contextBridge.exposeInMainWorld('haven', Object.freeze({
  openDeveloperContact: (...args) => args.length === 1 && ['email', 'linkedin'].includes(args[0])
    ? ipcRenderer.invoke('haven:developer:open-contact', args[0])
    : Promise.reject(new TypeError('Invalid developer contact.')),
  memoryGet: (...args) => memoryWithoutArguments('haven:memory:get', args),
  memoryImport: (...args) => memoryWithoutArguments('haven:memory:import', args),
  memoryExport: (...args) => memoryWithoutArguments('haven:memory:export', args),
  memoryRestore: (...args) => memoryWithoutArguments('haven:memory:restore', args),
  memorySave: (...args) => {
    try {
      if (args.length !== 1) throw new TypeError('Invalid memory save.');
      return ipcRenderer.invoke('haven:memory:save', safeMemory(args[0]));
    } catch { return Promise.reject(new TypeError('Invalid memory board.')); }
  },
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
