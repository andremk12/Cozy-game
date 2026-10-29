import test from 'node:test';
import assert from 'node:assert/strict';
import { createGarden, gardenReducer } from '../shared/garden.js';
import { createGardenStore, GARDEN_STORAGE_KEY } from '../src/services/garden.js';

function memoryStorage(initial = null) {
  let value = initial;
  const writes = [];
  return { writes, getItem(key) { assert.equal(key, GARDEN_STORAGE_KEY); return value; },
    setItem(key, next) { assert.equal(key, GARDEN_STORAGE_KEY); writes.push(JSON.parse(next)); value = next; } };
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

test('browser edits save synchronously and never use the preference key or unrelated content', async () => {
  const storage = memoryStorage();
  const store = createGardenStore({ storage, bridge: null, now: () => 1000 });
  await store.initialize();
  assert.equal(store.dispatch({ type: 'plant', slotId: 'pot-1', species: 'daisy' }), true);
  assert.equal(storage.writes.length, 1);
  assert.equal(storage.writes[0].plants[0].species, 'daisy');
  store.dispatch({ type: 'thought', value: 'SYNTHETIC_PRIVATE_GARDEN' });
  assert.equal(storage.writes.length, 1);
  await store.flush();
  assert.equal(store.getSnapshot().status, 'ok');
});

test('restoration blocks edits until ready and safely reconciles offline growth once', async () => {
  const restore = deferred();
  const writes = [];
  const store = createGardenStore({ bridge: { getGarden: () => restore.promise, saveGarden: (garden) => { writes.push(garden); } }, now: () => 121_000 });
  const ready = store.initialize();
  assert.equal(store.dispatch({ type: 'plant', slotId: 'pot-2', species: 'fern' }), false);
  restore.resolve({ garden: gardenReducer(createGarden(), { type: 'plant', slotId: 'pot-1', species: 'daisy' }, 1000), status: 'ok' });
  await ready;
  await store.flush();
  assert.equal(store.getSnapshot().garden.plants.length, 1);
  assert.equal(store.getSnapshot().garden.plants[0].elapsedMs, 120_000);
  assert.equal(writes.length, 1);
});

test('every desktop edit reaches IPC immediately without waiting for earlier acknowledgments', async () => {
  const responses = [deferred(), deferred()];
  const writes = [];
  const store = createGardenStore({ bridge: { getGarden: async () => ({ garden: createGarden(), status: 'ok' }),
    saveGarden: (garden) => { writes.push(garden); return responses[writes.length - 1].promise; } }, now: () => 1000 });
  await store.initialize();
  store.dispatch({ type: 'atmosphere', value: 'night' });
  store.dispatch({ type: 'weather', value: 'rain' });
  assert.equal(writes.length, 2);
  assert.equal(writes[1].weather, 'rain');
  responses[1].reject(new Error('disk failed'));
  await Promise.resolve();
  responses[0].resolve(createGarden());
  await store.flush();
  assert.equal(store.getSnapshot().status, 'unavailable');
  assert.equal(store.getSnapshot().garden.atmosphere, 'night');
  assert.equal(store.getSnapshot().garden.weather, 'rain');
});

test('unavailable storage preserves session interactions and explicit retry can recover', async () => {
  let denied = true;
  const storage = { getItem: () => null, setItem() { if (denied) throw new Error('denied'); } };
  const store = createGardenStore({ storage, bridge: null, now: () => 1000 });
  await store.initialize();
  store.dispatch({ type: 'plant', slotId: 'pot-1', species: 'fern' });
  await store.flush();
  assert.equal(store.getSnapshot().status, 'unavailable');
  assert.equal(store.getSnapshot().garden.plants[0].species, 'fern');
  denied = false;
  assert.equal(await store.retry(), true);
  assert.equal(store.getSnapshot().storageError, null);
});

test('future garden remains untouched while allowing a temporary session', async () => {
  const storage = memoryStorage(JSON.stringify({ version: 2, future: 'SYNTHETIC_FUTURE_DOCUMENT' }));
  const store = createGardenStore({ storage, bridge: null, now: () => 1000 });
  await store.initialize();
  assert.equal(store.getSnapshot().status, 'unsupported');
  store.dispatch({ type: 'plant', slotId: 'pot-1', species: 'daisy' });
  await store.retry();
  await store.flush();
  assert.equal(store.getSnapshot().garden.plants.length, 1);
  assert.equal(storage.writes.length, 0);
  assert.ok(store.getSnapshot().storageError);
});

test('malformed browser data recovers without logging or copying private fields', async () => {
  for (const raw of ['{broken', JSON.stringify({ ...createGarden(), thought: 'SYNTHETIC_PRIVATE_GARDEN' }), 'x'.repeat(32_769)]) {
    const store = createGardenStore({ storage: memoryStorage(raw), bridge: null });
    await store.initialize();
    assert.equal(store.getSnapshot().status, 'recovered');
    assert.equal(JSON.stringify(store.getSnapshot()).includes('SYNTHETIC_PRIVATE_GARDEN'), false);
  }
});
