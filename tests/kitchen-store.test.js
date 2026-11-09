import test from 'node:test';
import assert from 'node:assert/strict';
import { createKitchenStore, KITCHEN_STORAGE_KEY } from '../src/services/kitchen.js';
import { createKitchen, KitchenTimer, MAX_KITCHEN_BYTES } from '../shared/kitchen.js';

function fixture({ initial = null } = {}) {
  let raw = initial;
  let wall = 1_000;
  let mono = 0;
  let sequence = 0;
  const jobs = [];
  const storage = { getItem(key) { assert.equal(key, KITCHEN_STORAGE_KEY); return raw; },
    setItem(key, value) { assert.equal(key, KITCHEN_STORAGE_KEY); raw = value; } };
  const options = { bridge: null, storage, now: () => wall, monotonic: () => mono,
    idFactory: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
    setTimer(callback, delay) { const job = { callback, delay }; jobs.push(job); return job; },
    clearTimer(job) { if (job) job.cancelled = true; } };
  return { options, jobs, raw: () => raw, advance(ms, wallMs = ms) { mono += ms; wall += wallMs; } };
}

test('browser session survives navigation-sized disconnects, catches up at deadline, and reopens without duplicate presentation', async () => {
  const f = fixture();
  const store = createKitchenStore(f.options);
  store.connect();
  await store.initialize();
  const started = await store.dispatch({ type: 'start', recipeId: 'tea' });
  const id = started.kitchen.session.id;
  store.disconnect();
  f.advance(200_000);
  store.connect();
  await store.refresh();
  assert.equal(store.getSnapshot().kitchen.session.elapsedMs, 200_000);
  f.advance(100_000);
  f.jobs.at(-1).callback();
  await store.flush();
  assert.equal(store.getSnapshot().kitchen.session.status, 'completed');
  const results = await Promise.all([store.dispatch({ type: 'present', sessionId: id }), store.dispatch({ type: 'present', sessionId: id })]);
  assert.deepEqual(results.map(({ presented }) => presented), [true, false]);
  store.disconnect();
  const reopened = createKitchenStore(f.options);
  await reopened.initialize();
  assert.equal(reopened.getSnapshot().kitchen.session.id, id);
  assert.equal(reopened.getSnapshot().kitchen.session.presentation, 'presented');
  assert.equal((await reopened.dispatch({ type: 'present', sessionId: id })).presented, false);
  reopened.disconnect();
});

test('browser hidden/resume reconciles wall sleep, paused sessions stay paused and settings do not alter the session', async () => {
  const f = fixture();
  const store = createKitchenStore(f.options);
  await store.initialize();
  await store.dispatch({ type: 'start', recipeId: 'soup' });
  f.advance(30_000);
  await store.setHidden(true);
  f.advance(0, 120_000);
  await store.setHidden(false);
  assert.equal(store.getSnapshot().kitchen.session.elapsedMs, 150_000);
  await store.dispatch({ type: 'pause' });
  const session = store.getSnapshot().kitchen.session;
  await store.setHidden(true);
  f.advance(0, 900_000);
  await store.setHidden(false);
  await store.dispatch({ type: 'settings', patch: { atmosphere: 'night', messagesEnabled: false } });
  assert.deepEqual(store.getSnapshot().kitchen.session, session);
  assert.equal(store.getSnapshot().kitchen.settings.messagesEnabled, false);
  store.disconnect();
});

test('browser failures are recoverable, malformed data contains no imported text and future documents remain untouched', async () => {
  for (const initial of ['{broken', '{"version":1,"session":{"text":"SYNTHETIC_PRIVATE_KITCHEN"},"settings":{"effectsEnabled":true}}',
    'x'.repeat(MAX_KITCHEN_BYTES + 1)]) {
    const corrupt = fixture({ initial });
    const recovered = createKitchenStore(corrupt.options);
    await recovered.initialize();
    assert.equal(recovered.getSnapshot().status, 'recovered');
    assert.match(recovered.getSnapshot().storageError, /sessão temporária/);
    assert.deepEqual(recovered.getSnapshot().kitchen, createKitchen());
    assert.equal(JSON.stringify(recovered.getSnapshot()).includes('SYNTHETIC_PRIVATE_KITCHEN'), false);
    await recovered.dispatch({ type: 'start', recipeId: 'tea' });
    await recovered.dispatch({ type: 'settings', patch: { lampOn: false, completionSoundEnabled: true } });
    await recovered.setHidden(true);
    corrupt.advance(0, 400_000);
    await recovered.setHidden(false);
    await recovered.refresh();
    await recovered.retry();
    await recovered.flush();
    assert.equal(recovered.getSnapshot().status, 'recovered');
    assert.equal(recovered.getSnapshot().kitchen.session.status, 'completed');
    assert.equal(corrupt.raw(), initial);
  }
  const original = '{"version":2,"future":"SYNTHETIC_FUTURE_KITCHEN"}';
  const future = fixture({ initial: original });
  const temporary = createKitchenStore(future.options);
  await temporary.initialize();
  await temporary.dispatch({ type: 'start', recipeId: 'tea' });
  assert.equal(temporary.getSnapshot().status, 'unsupported');
  assert.equal(future.raw(), original);
  const f = fixture();
  let deny = true;
  const realStorage = f.options.storage;
  f.options.storage = { getItem: realStorage.getItem, setItem(key, value) {
    if (deny) throw new Error('Synthetic storage failure'); realStorage.setItem(key, value);
  } };
  const unavailable = createKitchenStore(f.options);
  await unavailable.initialize();
  await unavailable.dispatch({ type: 'start', recipeId: 'tea' });
  assert.equal(unavailable.getSnapshot().status, 'unavailable');
  assert.match(unavailable.getSnapshot().storageError, /Não foi possível salvar/);
  deny = false;
  await unavailable.retry();
  assert.equal(unavailable.getSnapshot().status, 'ok');
  assert.equal(JSON.parse(f.raw()).session.recipeId, 'tea');
});

test('desktop adapter uses only its narrow bridge, observes updates and reconnects listeners without owning a second clock', async () => {
  const c = fixture();
  const runtime = new KitchenTimer(createKitchen(), c.options);
  let listener;
  let subscriptions = 0;
  let unsubscriptions = 0;
  const bridge = {
    async getKitchen() { runtime.reconcile(); return { kitchen: runtime.kitchen, status: 'ok' }; },
    async commandKitchen(command) { return { ...runtime.command(command), status: 'ok' }; },
    onKitchenChanged(callback) { listener = callback; subscriptions += 1; return () => { listener = null; unsubscriptions += 1; }; },
  };
  const store = createKitchenStore({ ...c.options, bridge,
    storage: { getItem() { throw new Error('Desktop must not read browser storage'); }, setItem() { throw new Error('Desktop must not write browser storage'); } } });
  store.connect();
  await store.initialize();
  await store.dispatch({ type: 'start', recipeId: 'tea' });
  assert.equal(c.jobs.length, 0);
  c.advance(350_000);
  runtime.reconcile();
  listener({ kitchen: runtime.kitchen, status: 'ok' });
  assert.equal(store.getSnapshot().kitchen.session.status, 'completed');
  await store.setHidden(false); // Must not deadlock by re-enqueueing refresh inside itself.
  const id = runtime.kitchen.session.id;
  assert.equal((await store.dispatch({ type: 'present', sessionId: id })).presented, true);
  store.disconnect();
  store.connect();
  assert.equal(subscriptions, 2);
  assert.equal(unsubscriptions, 1);
  assert.equal((await store.dispatch({ type: 'present', sessionId: id })).presented, false);
  store.disconnect();
});
