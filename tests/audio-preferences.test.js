import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import {
  AUDIO_LAYER_IDS, AUDIO_PRESET_IDS, DEFAULT_MIXER, createPresetMix, normalizeMixer, validateMixer,
} from '../shared/audio.js';
import { createPreferenceStore, normalizePreferences } from '../src/services/preferences.js';
import { validatePreferencePatch } from '../electron/services/preferences.js';
import { DEFAULT_COMPANION } from '../shared/companion.js';

const syntheticText = 'SYNTHETIC_PRIVATE_MIXER';

function invalidMixers() {
  const mixer = normalizeMixer(DEFAULT_MIXER);
  return [
    null, {}, [], { ...mixer, thought: syntheticText },
    { ...mixer, version: 2 }, { ...mixer, muted: 'true' }, { ...mixer, preset: syntheticText },
    { ...mixer, layers: { ...mixer.layers, thought: syntheticText } },
    { ...mixer, layers: { ...mixer.layers, birds: { ...mixer.layers.birds, thought: syntheticText } } },
    { ...mixer, layers: { ...mixer.layers, birds: { enabled: 1, volume: 0.3 } } },
    { ...mixer, layers: { ...mixer.layers, birds: { enabled: true, volume: NaN } } },
    { ...mixer, layers: { ...mixer.layers, birds: { enabled: true, volume: Infinity } } },
    { ...mixer, layers: { ...mixer.layers, birds: { enabled: true, volume: -0.1 } } },
    { ...mixer, customLayers: { ...mixer.layers, birds: { enabled: true, volume: 1.01 } } },
    { ...mixer, customLayers: { birds: { enabled: true, volume: 0.1 } } },
  ];
}

test('every preset configures complete bounded layers and custom survives preset selection', () => {
  for (const id of AUDIO_PRESET_IDS) {
    const mixer = createPresetMix(id);
    assert.equal(mixer.preset, id);
    assert.deepEqual(Object.keys(mixer.layers), AUDIO_LAYER_IDS);
    assert.deepEqual(validateMixer(mixer), mixer);
  }
  const custom = createPresetMix('custom');
  custom.muted = true;
  custom.layers.birds = { enabled: true, volume: 0 };
  custom.customLayers = structuredClone(custom.layers);
  const night = createPresetMix('quiet-night', custom);
  assert.equal(night.layers.crickets.volume, 0.4);
  assert.equal(night.layers.crickets.enabled, true);
  assert.equal(night.layers.birds.enabled, false);
  const restored = createPresetMix('custom', night);
  assert.equal(restored.muted, true);
  assert.deepEqual(restored.layers.birds, { enabled: true, volume: 0 });
  assert.deepEqual(restored.layers, custom.layers);
  restored.layers.birds.volume = 0.8;
  assert.equal(restored.customLayers.birds.volume, 0);
  assert.throws(() => createPresetMix('unknown'), TypeError);
});

test('legacy preferences migrate without losing old choices or starting audio', () => {
  const legacy = { lampOn: false, rainOn: false, audioEnabled: true, volume: 0 };
  const migrated = normalizePreferences(legacy);
  assert.deepEqual(migrated, { ...legacy, mixer: DEFAULT_MIXER, companion: DEFAULT_COMPANION });
  assert.equal(migrated.mixer.preset, 'rainy-evening');
  assert.equal(Object.hasOwn(migrated, 'audioActive'), false);
});

test('nested mixer data is bounded and arbitrary text is rejected before persistence', async () => {
  const writes = [];
  const store = createPreferenceStore({ bridge: null, storage: {
    getItem: () => null, setItem: (_key, value) => writes.push(value),
  } });
  await store.initialize();
  for (const mixer of invalidMixers()) {
    assert.throws(() => validateMixer(mixer), TypeError);
    assert.throws(() => validatePreferencePatch({ mixer }), TypeError);
    assert.equal(store.setPreference('mixer', mixer), false);
  }
  assert.equal(writes.length, 0);
  const custom = createPresetMix('custom');
  custom.layers.fire = { enabled: false, volume: 0.82 };
  custom.customLayers = structuredClone(custom.layers);
  assert.equal(store.setPreference('mixer', custom), true);
  custom.layers.fire.volume = 0.01;
  await store.flush();
  assert.equal(writes.length, 1);
  const saved = JSON.parse(writes[0]);
  assert.equal(saved.mixer.layers.fire.volume, 0.82);
  assert.deepEqual(saved.mixer.layers.fire, { enabled: false, volume: 0.82 });
  assert.equal(writes[0].includes(syntheticText), false);
});

test('mixer recovery discards nested extra fields and malformed values', () => {
  const mixer = normalizeMixer(DEFAULT_MIXER);
  mixer.thought = syntheticText;
  mixer.layers.birds = { enabled: true, volume: 0, thought: syntheticText };
  mixer.customLayers.fire = { enabled: true, volume: NaN };
  const recovered = normalizeMixer(mixer);
  assert.equal(JSON.stringify(recovered).includes(syntheticText), false);
  assert.deepEqual(recovered.layers.birds, { enabled: true, volume: 0 });
  assert.ok(Number.isFinite(recovered.customLayers.fire.volume));
  assert.deepEqual(validateMixer(recovered), recovered);
});

test('preload and main reject the same invalid nested mixer data without sending IPC', async () => {
  const messages = [];
  let bridge;
  const source = await readFile(new URL('../electron/preload/index.cjs', import.meta.url), 'utf8');
  vm.runInNewContext(source, { require(name) {
    assert.equal(name, 'electron');
    return { contextBridge: { exposeInMainWorld(_name, value) { bridge = value; } },
      ipcRenderer: { invoke(channel, value) { messages.push({ channel, value }); return Promise.resolve(value); } } };
  } });
  for (const mixer of invalidMixers()) await assert.rejects(bridge.savePreferences({ mixer }), /Invalid mixer/);
  assert.equal(messages.length, 0);
  const original = createPresetMix('quiet-night');
  await bridge.savePreferences({ mixer: original });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].channel, 'haven:preferences:save');
  assert.deepEqual(JSON.parse(JSON.stringify(messages[0].value)), { mixer: original });
  original.layers.crickets.volume = 0.9;
  assert.equal(messages[0].value.mixer.layers.crickets.volume, 0.4);
  assert.equal(JSON.stringify(messages).includes(syntheticText), false);
});

test('an edited mixer wins a delayed restore and custom settings survive reload', async () => {
  let resolveRestore;
  const restoring = new Promise((resolve) => { resolveRestore = resolve; });
  const writes = [];
  const store = createPreferenceStore({ bridge: {
    getPreferences: () => restoring,
    savePreferences: async (value) => { writes.push(structuredClone(value)); },
  }, storage: null });
  const ready = store.initialize();
  const custom = createPresetMix('custom');
  custom.muted = true;
  custom.layers.stream = { enabled: true, volume: 0.67 };
  custom.customLayers = structuredClone(custom.layers);
  store.setPreference('mixer', custom);
  resolveRestore({ volume: 0.6, mixer: createPresetMix('morning-garden') });
  await ready;
  await store.flush();
  assert.equal(store.getSnapshot().preferences.volume, 0.6);
  assert.deepEqual(store.getSnapshot().preferences.mixer, custom);
  const reloaded = createPreferenceStore({ bridge: null, storage: {
    getItem: () => JSON.stringify(writes.at(-1)), setItem() {},
  } });
  await reloaded.initialize();
  assert.deepEqual(reloaded.getSnapshot().preferences.mixer, custom);
});
