import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  createPreferenceStore,
  normalizePreferences,
} from '../src/services/preferences.js';

function memoryStorage(initial = null) {
  const writes = [];
  let value = initial;
  return {
    writes,
    getItem(key) {
      assert.equal(key, PREFERENCES_STORAGE_KEY);
      return value;
    },
    setItem(key, next) {
      assert.equal(key, PREFERENCES_STORAGE_KEY);
      value = next;
      writes.push(JSON.parse(next));
    },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('preference normalization whitelists settings and rejects malformed types', () => {
  assert.deepEqual(
    normalizePreferences({
      lampOn: false,
      rainOn: 'false',
      audioEnabled: 1,
      volume: '0.9',
      thought: 'private writing must never be saved',
      arbitrary: true,
    }),
    { ...DEFAULT_PREFERENCES, lampOn: false },
  );
  for (const input of [null, undefined, [], 'text', 4]) {
    assert.deepEqual(normalizePreferences(input), DEFAULT_PREFERENCES);
  }
});

test('volume bounds are clamped while non-finite values use the safe default', () => {
  assert.equal(normalizePreferences({ volume: 20 }).volume, 1);
  assert.equal(normalizePreferences({ volume: -2 }).volume, 0);
  for (const volume of [NaN, Infinity, -Infinity]) {
    assert.equal(normalizePreferences({ volume }).volume, 0.25);
  }
});

test('browser fallback restores and saves only the allowed preferences', async () => {
  const storage = memoryStorage(JSON.stringify({ rainOn: false, thought: 'discard me' }));
  const store = createPreferenceStore({ storage, bridge: null });
  await store.initialize();
  assert.equal(store.getSnapshot().ready, true);
  assert.equal(store.getSnapshot().preferences.rainOn, false);
  assert.equal(store.setPreference('thought', 'never persist'), false);
  assert.equal(store.setPreference('audioEnabled', 'yes'), false);
  assert.equal(store.setPreference('volume', NaN), false);
  store.setPreference('lampOn', false);
  await store.flush();
  assert.deepEqual(storage.writes, [
    {
      lampOn: false,
      rainOn: false,
      audioEnabled: false,
      volume: 0.25,
    },
  ]);
});

test('unavailable storage keeps local interactions working without rejected promises', async () => {
  const storage = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('quota exceeded');
    },
  };
  const store = createPreferenceStore({ storage, bridge: null });
  await store.initialize();
  assert.ok(store.getSnapshot().storageError);
  store.setPreference('lampOn', false);
  await store.flush();
  assert.equal(store.getSnapshot().preferences.lampOn, false);
  assert.ok(store.getSnapshot().storageError);
});

test('corrupted JSON restores defaults without exposing stored content', async () => {
  const store = createPreferenceStore({ storage: memoryStorage('{broken'), bridge: null });
  await store.initialize();
  assert.deepEqual(store.getSnapshot().preferences, DEFAULT_PREFERENCES);
  assert.equal(typeof store.getSnapshot().storageError, 'string');
  assert.equal(store.getSnapshot().storageError.includes('{broken'), false);
});

test('edits made before asynchronous restore win and untouched settings are restored', async () => {
  const restore = deferred();
  const writes = [];
  const bridge = {
    getPreferences: () => restore.promise,
    savePreferences: async (preferences) => {
      writes.push(preferences);
    },
  };
  const store = createPreferenceStore({ bridge, storage: null });
  const ready = store.initialize();
  // Explicitly keeping a default is also a choice, even before restoration.
  store.setPreference('lampOn', true);
  store.setPreference('volume', 0.1);
  restore.resolve({ lampOn: false, rainOn: false, audioEnabled: true, volume: 0.8 });
  await ready;
  await store.flush();
  assert.deepEqual(store.getSnapshot().preferences, {
    lampOn: true,
    rainOn: false,
    audioEnabled: true,
    volume: 0.1,
  });
  assert.deepEqual(writes.at(-1), store.getSnapshot().preferences);
});

test('IPC saves are serialized and late save replies cannot overwrite newer choices', async () => {
  const firstWrite = deferred();
  const writes = [];
  const bridge = {
    getPreferences: async () => DEFAULT_PREFERENCES,
    savePreferences: async (preferences) => {
      writes.push(preferences);
      if (writes.length === 1) await firstWrite.promise;
      return { ...DEFAULT_PREFERENCES }; // A stale response must not become state.
    },
  };
  const store = createPreferenceStore({ bridge, storage: null });
  await store.initialize();
  store.setPreference('lampOn', false);
  store.setPreference('rainOn', false);
  store.setPreference('volume', 0.6);
  assert.equal(writes.length, 1);
  firstWrite.resolve();
  await store.flush();
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[1], { lampOn: false, rainOn: false, audioEnabled: false, volume: 0.6 });
  assert.deepEqual(store.getSnapshot().preferences, writes[1]);
});

test('functional updates use current state and subscriptions clean up', async () => {
  const store = createPreferenceStore({ bridge: null, storage: memoryStorage() });
  await store.initialize();
  let events = 0;
  const unsubscribe = store.subscribe(() => {
    events += 1;
  });
  store.setPreference('lampOn', (current) => !current);
  store.setPreference('lampOn', (current) => !current);
  assert.equal(store.getSnapshot().preferences.lampOn, true);
  assert.equal(events, 2);
  unsubscribe();
  store.setPreference('rainOn', false);
  await store.flush();
  assert.equal(events, 2);
});
