import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createPresetMix } from '../shared/audio.js';
import {
  DEFAULT_PREFERENCES,
  normalizePreferences,
  PreferencesStore,
  validatePreferencePatch,
} from '../electron/services/preferences.js';

const testRoot = path.resolve('work');
await mkdir(testRoot, { recursive: true });
async function removeTestDirectory(directory) {
  const resolved = path.resolve(directory);
  assert.equal(path.dirname(resolved), testRoot);
  assert.match(path.basename(resolved), /^little-haven-(preferences|recovery)-/);
  await rm(resolved, { recursive: true, force: true });
}

test('disk recovery keeps only known preferences and bounds volume', () => {
  assert.deepEqual(
    normalizePreferences({
      lampOn: false,
      rainOn: 'yes',
      audioEnabled: true,
      volume: 8,
      thought: 'private',
    }),
    {
      ...DEFAULT_PREFERENCES,
      lampOn: false,
      rainOn: true,
      audioEnabled: true,
      volume: 1,
    },
  );
  assert.deepEqual(normalizePreferences(null), DEFAULT_PREFERENCES);
  assert.deepEqual(normalizePreferences({ volume: NaN }), DEFAULT_PREFERENCES);
});

test('IPC input rejects arbitrary content, invalid types and out-of-range volume', () => {
  for (const patch of [
    null,
    [],
    {},
    { thought: 'private' },
    { volume: -0.1 },
    { volume: Infinity },
    { lampOn: 1 },
    { rainOn: 'true' },
  ]) {
    assert.throws(() => validatePreferencePatch(patch), TypeError);
  }
  assert.deepEqual(validatePreferencePatch({ volume: 0, lampOn: false }), {
    volume: 0,
    lampOn: false,
  });
});

test('local preferences restore, serialize concurrent updates and never retain extra fields', async () => {
  const directory = await mkdtemp(path.join(testRoot, 'little-haven-preferences-'));
  const file = path.join(directory, 'preferences.json');
  try {
    const store = new PreferencesStore(file);
    assert.deepEqual(await store.get(), DEFAULT_PREFERENCES);
    await Promise.all([
      store.save({ lampOn: false }),
      store.save({ volume: 0.4 }),
      store.save({ rainOn: false }),
    ]);
    const restored = await new PreferencesStore(file).get();
    assert.deepEqual(restored, { ...DEFAULT_PREFERENCES, lampOn: false, rainOn: false, audioEnabled: false, volume: 0.4 });
    assert.deepEqual(
      Object.keys(JSON.parse(await readFile(file, 'utf8'))).sort(),
      Object.keys(DEFAULT_PREFERENCES).sort(),
    );
    const copy = await store.get();
    copy.volume = 0.8;
    assert.equal((await store.get()).volume, 0.4);
    const mixer = createPresetMix('custom');
    mixer.muted = true;
    mixer.layers.fire = { enabled: true, volume: 0 };
    mixer.customLayers = structuredClone(mixer.layers);
    await store.save({ mixer });
    mixer.layers.fire.volume = 0.9;
    const reopened = await new PreferencesStore(file).get();
    assert.deepEqual(reopened.mixer.layers.fire, { enabled: true, volume: 0 });
    assert.equal(reopened.mixer.muted, true);
    const nestedCopy = await store.get();
    nestedCopy.mixer.customLayers.fire.volume = 0.9;
    assert.equal((await store.get()).mixer.customLayers.fire.volume, 0);
  } finally {
    await removeTestDirectory(directory);
  }
});

test('malformed or oversized preference files safely restore defaults', async () => {
  const directory = await mkdtemp(path.join(testRoot, 'little-haven-recovery-'));
  const file = path.join(directory, 'preferences.json');
  try {
    await writeFile(file, '{broken');
    assert.deepEqual(await new PreferencesStore(file).get(), DEFAULT_PREFERENCES);
    await writeFile(file, 'x'.repeat(16_385));
    assert.deepEqual(await new PreferencesStore(file).get(), DEFAULT_PREFERENCES);
  } finally {
    await removeTestDirectory(directory);
  }
});
