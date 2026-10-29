import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {
  COMPANION_APPEARANCES, DEFAULT_COMPANION, displayCompanionName, normalizeCompanion,
  validateCompanion, validateCompanionName,
} from '../shared/companion.js';
import { DEFAULT_PREFERENCES, createPreferenceStore, normalizePreferences } from '../src/services/preferences.js';
import { PreferencesStore, normalizePreferences as normalizeDesktopPreferences, validatePreferencePatch } from '../electron/services/preferences.js';
import { createPresetMix } from '../shared/audio.js';

const testRoot = path.resolve('work');
const syntheticText = 'SYNTHETIC_PRIVATE_COMPANION_DRAFT';
const settings = (patch = {}) => ({ ...DEFAULT_COMPANION, ...patch });

function invalidCompanions() {
  return [
    null, {}, [], settings({ enabled: 'yes' }), settings({ introduced: 1 }), settings({ soundEnabled: true }),
    settings({ appearance: 'remote-sprite' }), settings({ name: '  Mochi ' }), settings({ name: '   ' }),
    settings({ name: 42 }), settings({ name: 'a'.repeat(25) }), settings({ name: 'Mochi\n' }),
    settings({ name: '\u202eMochi' }), settings({ name: '\u200d\u200b' }),
    settings({ name: 'Mochi', thought: syntheticText }), { ...settings(), nested: { thought: syntheticText } },
  ];
}

test('companion names preserve Unicode graphemes, internal spaces and legitimate scripts', () => {
  assert.deepEqual(validateCompanionName('  Luna 02  '), { valid: true, name: 'Luna 02', error: '', count: 7 });
  for (const name of ['Café', '雨のねこ', 'قطتي الصغيرة', 'आर्या', 'Mèo Nhỏ', 'Mochi 2', 'A  B', '👩🏽‍🚀']) {
    assert.equal(validateCompanionName(name).valid, true, name);
    assert.equal(validateCompanionName(name).name, name);
  }
  for (const character of ['é', 'e\u0301', '👨‍👩‍👧‍👦', '🐈‍⬛']) {
    const result = validateCompanionName(character.repeat(24));
    assert.equal(result.valid, true);
    assert.equal(result.count, 24);
    assert.equal(result.name, character.repeat(24));
    const tooLong = validateCompanionName(character.repeat(25));
    assert.equal(tooLong.valid, false);
    assert.equal(tooLong.name, character.repeat(25), 'invalid names are never silently truncated');
    assert.equal(tooLong.count, 25);
  }
});

test('blank names, line breaks, controls and invisible-only names receive friendly validation', () => {
  for (const name of [null, 42, '', '   ', '\u00a0', '\u200b\u200d', 'Mochi\n', '\tMochi', 'Mochi\rNeko',
    'Mo\u0000chi', 'Mo\u0085chi', 'Mo\u2028chi', 'Mo\u2029chi', '\u202eMochi', 'Mo\u2066chi', '\ud800']) {
    const result = validateCompanionName(name);
    assert.equal(result.valid, false, JSON.stringify(name));
    assert.equal(typeof result.error, 'string');
    assert.ok(result.error.length > 0);
  }
  assert.equal(validateCompanionName(`M${'\u0301'.repeat(3000)}`).valid, false, 'pathological combining-mark input remains bounded');
});

test('companion schema has no imposed name or unavailable sound and recovers only safe known fields', () => {
  assert.equal(DEFAULT_COMPANION.name, '');
  assert.equal(displayCompanionName(DEFAULT_COMPANION), 'Seu gatinho');
  assert.equal(displayCompanionName(settings({ name: 'Mochi' })), 'Mochi');
  assert.deepEqual(COMPANION_APPEARANCES.map(({ id }) => id), ['default', 'ginger', 'midnight']);
  for (const companion of invalidCompanions()) assert.throws(() => validateCompanion(companion), TypeError);
  const recovered = normalizeCompanion(settings({ name: '  Mochi  ', enabled: false, soundEnabled: true,
    appearance: 'invalid', thought: syntheticText }));
  assert.deepEqual(recovered, settings({ name: 'Mochi', enabled: false }));
  assert.equal(JSON.stringify(recovered).includes(syntheticText), false);
  assert.equal(normalizeCompanion(settings({ name: 'x'.repeat(25) })).name, '');
  const copy = validateCompanion(settings({ name: 'Mochi', introduced: true }));
  copy.name = 'Luna';
  assert.equal(DEFAULT_COMPANION.name, '');
  assert.deepEqual(validateCompanion(DEFAULT_COMPANION), DEFAULT_COMPANION);
});

test('legacy preference recovery adds companion without changing room or mixer settings', () => {
  const mixer = createPresetMix('quiet-night');
  mixer.muted = true;
  const legacy = { lampOn: false, rainOn: false, audioEnabled: true, volume: 0.38, mixer };
  const expected = { ...legacy, companion: DEFAULT_COMPANION };
  assert.deepEqual(normalizePreferences(legacy), expected);
  assert.deepEqual(normalizeDesktopPreferences(legacy), expected);
  const priorCompanion = { ...legacy, companion: { enabled: false, name: 'Neko', appearance: 'ginger', soundEnabled: false } };
  assert.deepEqual(normalizePreferences(priorCompanion).companion, settings({ enabled: false, name: 'Neko', appearance: 'ginger', introduced: true }));
});

test('renderer and preload reject unknown companion data before any persistence or IPC', async () => {
  const writes = [];
  const store = createPreferenceStore({ bridge: null, storage: {
    getItem: () => null, setItem: (_key, value) => writes.push(value),
  } });
  await store.initialize();
  const messages = [];
  let bridge;
  const source = await readFile(new URL('../electron/preload/index.cjs', import.meta.url), 'utf8');
  vm.runInNewContext(source, { require(name) {
    assert.equal(name, 'electron');
    return { contextBridge: { exposeInMainWorld(_name, value) { bridge = value; } },
      ipcRenderer: { invoke(channel, value) { messages.push({ channel, value }); return Promise.resolve(value); } } };
  } });
  for (const companion of invalidCompanions()) {
    assert.equal(store.setPreference('companion', companion), false);
    assert.throws(() => validatePreferencePatch({ companion }), TypeError);
    await assert.rejects(bridge.savePreferences({ companion }), /Invalid companion/);
  }
  assert.deepEqual(writes, []);
  assert.deepEqual(messages, []);
  const companion = settings({ name: '🐈‍⬛'.repeat(24), introduced: true });
  await bridge.savePreferences({ companion });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].channel, 'haven:preferences:save');
  assert.deepEqual(JSON.parse(JSON.stringify(messages[0].value)), { companion });
  companion.name = 'Changed after IPC';
  assert.notEqual(messages[0].value.companion.name, companion.name);
  assert.equal(JSON.stringify(messages).includes(syntheticText), false);
});

test('naming, choosing later and renaming survive reload while unrelated preferences stay unchanged', async () => {
  let saved;
  const storage = { getItem: () => saved ?? null, setItem: (_key, value) => { saved = value; } };
  const store = createPreferenceStore({ bridge: null, storage });
  await store.initialize();
  store.setPreference('volume', 0.43);
  store.setPreference('mixer', createPresetMix('peaceful-journey'));
  store.setPreference('companion', settings({ introduced: true }));
  await store.flush();
  const later = createPreferenceStore({ bridge: null, storage });
  await later.initialize();
  assert.equal(later.getSnapshot().preferences.companion.introduced, true);
  assert.equal(displayCompanionName(later.getSnapshot().preferences.companion), 'Seu gatinho');
  const named = settings({ name: '雨のねこ', appearance: 'midnight', introduced: true });
  store.setPreference('companion', named);
  named.name = 'Changed externally';
  await store.flush();
  assert.equal(store.getSnapshot().preferences.companion.name, '雨のねこ');
  store.setPreference('companion', (current) => ({ ...current, name: 'Mochi', enabled: false }));
  await store.flush();
  const reopened = createPreferenceStore({ bridge: null, storage });
  await reopened.initialize();
  assert.deepEqual(reopened.getSnapshot().preferences.companion, settings({ name: 'Mochi', enabled: false, appearance: 'midnight', introduced: true }));
  assert.equal(reopened.getSnapshot().preferences.volume, 0.43);
  assert.equal(reopened.getSnapshot().preferences.mixer.preset, 'peaceful-journey');
  assert.equal(JSON.stringify(reopened.getSnapshot()).includes(syntheticText), false);
});

test('desktop companion changes are atomic, cloned and restored through the existing preference file', async () => {
  await mkdir(testRoot, { recursive: true });
  const directory = await mkdtemp(path.join(testRoot, 'little-haven-companion-'));
  assert.equal(path.dirname(path.resolve(directory)), testRoot);
  const file = path.join(directory, 'preferences.json');
  try {
    const store = new PreferencesStore(file);
    const companion = settings({ name: 'Luna 2', introduced: true });
    await store.save({ companion, volume: 0.17 });
    companion.name = 'External mutation';
    const snapshot = await store.get();
    assert.equal(snapshot.companion.name, 'Luna 2');
    snapshot.companion.name = 'Another mutation';
    await store.save({ companion: settings({ name: 'Mochi', enabled: false, appearance: 'ginger', introduced: true }) });
    await store.flush();
    const reopened = await new PreferencesStore(file).get();
    assert.deepEqual(reopened, { ...DEFAULT_PREFERENCES, volume: 0.17,
      companion: settings({ name: 'Mochi', enabled: false, appearance: 'ginger', introduced: true }) });
    assert.equal((await readFile(file, 'utf8')).includes(syntheticText), false);
    assert.equal((await store.get()).companion.name, 'Mochi');
  } finally {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), testRoot);
    assert.match(path.basename(resolved), /^little-haven-companion-/);
    await rm(resolved, { recursive: true, force: true });
  }
});
